/* netlify/functions/create-registration-payment.js
   Creates Yoco or PayFast payment for course/event registration fees.
   POST body: { student_name, email, phone, course_or_event, amount, payment_type, payment_method }
*/

const crypto = require('crypto');
const md5    = str => crypto.createHash('md5').update(str).digest('hex');

function buildPayFastSignature(params, passphrase) {
  const str = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
  const signed = passphrase
    ? `${str}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : str;
  return md5(signed);
}

// Default registration fee — overridden by payload amount if provided
const DEFAULT_REG_FEE = 300;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
  const MERCHANT_ID     = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY    = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE      = process.env.PAYFAST_PASSPHRASE || '';
  const SITE_URL        = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    student_name    = '',
    email           = '',
    phone           = '',
    course_or_event = 'Course Registration',
    amount          = DEFAULT_REG_FEE,
    payment_type    = 'registration_fee',
    payment_method  = 'yoco',
  } = body;

  const finalAmount = parseFloat(amount) || DEFAULT_REG_FEE;
  const reg_id      = 'REG-' + Date.now();

  const successUrl = `${SITE_URL}/courses/registration-confirmed?course=${encodeURIComponent(course_or_event)}&amount=${finalAmount.toFixed(2)}&id=${reg_id}&name=${encodeURIComponent(student_name)}&email=${encodeURIComponent(email)}`;
  const cancelUrl  = `${SITE_URL}/courses.html`;
  const notifyUrl  = `${SITE_URL}/.netlify/functions/payfast-notify`;

  const itemName = `${payment_type === 'registration_fee' ? 'Registration Fee' : 'Course Payment'} — ${course_or_event}`.slice(0, 100);

  // ── Yoco ─────────────────────────────────────────────────────
  if (payment_method === 'yoco') {
    if (!YOCO_SECRET_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'YOCO_SECRET_KEY not configured' }) };
    }
    const amount_cents = Math.round(finalAmount * 100);
    try {
      const response = await fetch('https://payments.yoco.com/api/checkouts', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        },
        body: JSON.stringify({
          amount:   amount_cents,
          currency: 'ZAR',
          successUrl,
          cancelUrl,
          metadata: { reg_id, student_name, email, phone, course_or_event, payment_type },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: data.message || 'Yoco error' }) };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutUrl: data.redirectUrl, reg_id }),
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── PayFast ──────────────────────────────────────────────────
  if (payment_method === 'payfast') {
    if (!MERCHANT_ID || !MERCHANT_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'PayFast credentials not configured' }) };
    }
    const [first_name, ...rest] = (student_name || 'Student').split(' ');
    const last_name = rest.join(' ') || '.';

    const params = {
      merchant_id:      MERCHANT_ID,
      merchant_key:     MERCHANT_KEY,
      return_url:       successUrl,
      cancel_url:       cancelUrl,
      notify_url:       notifyUrl,
      name_first:       first_name,
      name_last:        last_name,
      email_address:    email,
      m_payment_id:     reg_id,
      amount:           finalAmount.toFixed(2),
      item_name:        itemName,
      item_description: `${course_or_event} — ${payment_type}`.slice(0, 255),
      custom_str1:      course_or_event,
      custom_str2:      phone,
    };
    params.signature = buildPayFastSignature(params, PASSPHRASE);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params,
        paymentUrl: 'https://www.payfast.co.za/eng/process',
        reg_id,
      }),
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payment_method. Use yoco or payfast.' }) };
};
