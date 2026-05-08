/* netlify/functions/create-payfast-payment.js
   Builds PayFast signed payment params for shop orders.
   POST body: { product_name, amount, customer_name, customer_email }
*/

const crypto = require('crypto');

const md5 = str => crypto.createHash('md5').update(str).digest('hex');

function buildSignature(params, passphrase) {
  const ordered = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
  const str = passphrase ? `${ordered}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}` : ordered;
  return md5(str);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE;
  const SITE_URL     = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  if (!MERCHANT_ID || !MERCHANT_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'PayFast credentials not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    product_name   = 'Baseerah Order',
    amount,
    customer_name  = '',
    customer_email = '',
  } = body;

  if (!amount || parseFloat(amount) < 1) {
    return { statusCode: 400, body: JSON.stringify({ error: 'amount required' }) };
  }

  const order_id = 'ORD-' + Date.now();
  const [first_name, ...rest] = (customer_name || 'Customer').split(' ');
  const last_name = rest.join(' ') || '.';

  const params = {
    merchant_id:      MERCHANT_ID,
    merchant_key:     MERCHANT_KEY,
    return_url:       `${SITE_URL}/shop/order-confirmed?method=PayFast&order_id=${order_id}&product=${encodeURIComponent(product_name)}&amount=${parseFloat(amount).toFixed(2)}`,
    cancel_url:       `${SITE_URL}/shop.html`,
    notify_url:       `${SITE_URL}/.netlify/functions/payfast-notify`,
    name_first:       first_name,
    name_last:        last_name,
    email_address:    customer_email,
    m_payment_id:     order_id,
    amount:           parseFloat(amount).toFixed(2),
    item_name:        product_name.slice(0, 100),
  };

  params.signature = buildSignature(params, PASSPHRASE);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      params,
      paymentUrl: 'https://www.payfast.co.za/eng/process',
      order_id,
    }),
  };
};
