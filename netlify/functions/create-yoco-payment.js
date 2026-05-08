/* netlify/functions/create-yoco-payment.js
   Creates a Yoco checkout session for shop orders.
   POST body: { product_name, amount_cents, customer_name, customer_email, customer_phone, collection_point }
*/

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
  const SITE_URL        = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  if (!YOCO_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'YOCO_SECRET_KEY not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    product_name    = 'Baseerah Order',
    amount_cents,
    customer_name   = '',
    customer_email  = '',
    customer_phone  = '',
    collection_point = '',
  } = body;

  if (!amount_cents || amount_cents < 100) {
    return { statusCode: 400, body: JSON.stringify({ error: 'amount_cents required (minimum 100)' }) };
  }

  const order_id = 'ORD-' + Date.now();

  const successUrl = `${SITE_URL}/shop/order-confirmed?order_id=${order_id}&product=${encodeURIComponent(product_name)}&amount=${Math.round(amount_cents/100)}&method=Yoco&name=${encodeURIComponent(customer_name)}&email=${encodeURIComponent(customer_email)}&collection=${encodeURIComponent(collection_point)}`;
  const cancelUrl  = `${SITE_URL}/shop.html`;

  try {
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:   amount_cents,
        currency: 'ZAR',
        successUrl,
        cancelUrl,
        metadata: {
          order_id,
          product_name,
          customer_name,
          customer_email,
          customer_phone,
          collection_point,
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
      body: JSON.stringify({ checkoutUrl: data.redirectUrl, order_id }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
