/* netlify/functions/payfast-notify.js
   Receives PayFast ITN POST, validates signature, sends admin email.
*/

const crypto  = require('crypto');
const https   = require('https');
const querystring = require('querystring');

const md5 = str => crypto.createHash('md5').update(str).digest('hex');

function validateSignature(data, passphrase) {
  const params = { ...data };
  delete params.signature;
  const str = Object.keys(params)
    .filter(k => params[k] !== '')
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
  const signed = passphrase ? `${str}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}` : str;
  return md5(signed) === data.signature;
}

async function sendEmail(apiKey, to, subject, html) {
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'noreply@baseerahinstitute.org', name: 'Baseerah Institute' },
    subject,
    content: [{ type: 'text/html', value: html }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => resolve(res.statusCode));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const PASSPHRASE     = process.env.PAYFAST_PASSPHRASE || '';
  const SENDGRID_KEY   = process.env.SENDGRID_API_KEY;
  const ADMIN_EMAIL    = 'baseerahinstitute.sa@gmail.com';

  const data = querystring.parse(event.body);

  if (!validateSignature(data, PASSPHRASE)) {
    console.error('PayFast ITN: invalid signature');
    return { statusCode: 400, body: 'Invalid signature' };
  }

  if (data.payment_status !== 'COMPLETE') {
    return { statusCode: 200, body: 'OK' };
  }

  if (SENDGRID_KEY) {
    const html = `
<div style="font-family:sans-serif;max-width:560px;color:#3A3848">
  <div style="background:#1A1A2E;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:#009EA8;margin:0;font-size:22px">New Payment — Baseerah Shop</h2>
  </div>
  <div style="background:#FAF8F4;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #E8E0D3;border-top:none">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#9896AA;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Order ID</td><td style="font-weight:600">${data.m_payment_id || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Product</td><td>${data.item_name || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Amount</td><td style="font-weight:600;color:#009EA8">R${parseFloat(data.amount_gross||0).toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Customer</td><td>${data.name_first || ''} ${data.name_last || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Email</td><td>${data.email_address || '—'}</td></tr>
    </table>
    <p style="font-size:12px;color:#9896AA;margin-top:20px">Please log this order manually in the CMS under Orders.</p>
  </div>
</div>`;
    await sendEmail(SENDGRID_KEY, ADMIN_EMAIL, `New Order: ${data.item_name}`, html).catch(console.error);
  }

  return { statusCode: 200, body: 'OK' };
};
