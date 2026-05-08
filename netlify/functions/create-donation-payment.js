/* netlify/functions/create-donation-payment.js
   Creates Yoco or PayFast payment for donations (Zakaat/Lillah/Sadaqah/Sponsor).
   POST body: { amount, donation_type, donor_name, donor_email, payment_method }
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const YOCO_SECRET_KEY  = process.env.YOCO_SECRET_KEY;
  const MERCHANT_ID      = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY     = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE       = process.env.PAYFAST_PASSPHRASE || '';
  const SITE_URL         = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    amount        = 0,
    donation_type = 'Sadaqah',
    donor_name    = '',
    donor_email   = '',
    payment_method = 'yoco',
  } = body;

  if (!amount || parseFloat(amount) < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Minimum donation amount is R10' }) };
  }

  const donation_id  = 'DON-' + Date.now();
  const successUrl   = `${SITE_URL}/donate/thank-you?type=${encodeURIComponent(donation_type)}&amount=${parseFloat(amount).toFixed(2)}&id=${donation_id}`;
  const cancelUrl    = `${SITE_URL}/donate.html`;
  const notifyUrl    = `${SITE_URL}/.netlify/functions/donation-notify`;

  // ── Yoco ────────────────────────────────────────────────────
  if (payment_method === 'yoco') {
    if (!YOCO_SECRET_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'YOCO_SECRET_KEY not configured' }) };
    }

    const amount_cents = Math.round(parseFloat(amount) * 100);
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
          metadata: {
            donation_id,
            donation_type,
            donor_name,
            donor_email,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: data.message || 'Yoco error' }) };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutUrl: data.redirectUrl, donation_id }),
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

    const [first_name, ...rest] = (donor_name || 'Anonymous').split(' ');
    const last_name = rest.join(' ') || '.';

    const params = {
      merchant_id:   MERCHANT_ID,
      merchant_key:  MERCHANT_KEY,
      return_url:    successUrl,
      cancel_url:    cancelUrl,
      notify_url:    notifyUrl,
      name_first:    first_name,
      name_last:     last_name,
      email_address: donor_email,
      m_payment_id:  donation_id,
      amount:        parseFloat(amount).toFixed(2),
      item_name:     `Baseerah ${donation_type}`.slice(0, 100),
      item_description: `${donation_type} donation to Baseerah Institute`.slice(0, 255),
    };

    params.signature = buildPayFastSignature(params, PASSPHRASE);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params,
        paymentUrl: 'https://www.payfast.co.za/eng/process',
        donation_id,
      }),
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payment_method. Use yoco or payfast.' }) };
};
