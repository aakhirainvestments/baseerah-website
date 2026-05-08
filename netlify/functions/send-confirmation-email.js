/* netlify/functions/send-confirmation-email.js
   Sends branded order confirmation to customer + plain summary to admin.
   POST body: { customer_email, customer_name, product, amount, order_id, collection_point }
*/

const https = require('https');

async function sendEmail(apiKey, to, subject, html) {
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'orders@baseerahinstitute.org', name: 'Baseerah Institute' },
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
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const ADMIN_EMAIL  = 'baseerahinstitute.sa@gmail.com';
  const SITE_URL     = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  if (!SENDGRID_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SENDGRID_API_KEY not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    customer_email   = '',
    customer_name    = 'Valued Customer',
    product          = '—',
    amount           = '—',
    order_id         = '—',
    collection_point = 'Masjid al-Salaam, Athlone (during class hours)',
  } = body;

  if (!customer_email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'customer_email required' }) };
  }

  // ── Branded customer email ──────────────────────────────────
  const customerHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

      <!-- Header -->
      <tr><td style="background:#1A1A2E;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
        <h1 style="color:#009EA8;font-family:Georgia,serif;font-size:28px;font-weight:300;margin:0 0 4px">Baseerah Institute</h1>
        <p style="color:rgba(255,255,255,.5);font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0">Order Confirmation</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#FAF8F4;padding:36px 40px;border:1px solid #E8E0D3;border-top:none">
        <p style="color:#1A1A2E;font-size:16px;margin:0 0 8px">As-salāmu ʿalaykum, <strong>${customer_name}</strong></p>
        <p style="color:#6B6880;font-size:14px;line-height:1.7;margin:0 0 28px">We've received your order. We'll confirm your collection details within 1 business day, in shā Allah.</p>

        <!-- Order summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;border-radius:12px;padding:4px 0;margin-bottom:28px">
          <tr><td style="padding:12px 20px;border-bottom:1px solid #E8E0D3">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9896AA">Order Reference</td>
                <td style="font-weight:600;color:#1A1A2E;text-align:right">${order_id}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 20px;border-bottom:1px solid #E8E0D3">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9896AA">Product</td>
                <td style="font-weight:500;color:#1A1A2E;text-align:right;font-size:14px">${product}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 20px;border-bottom:1px solid #E8E0D3">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9896AA">Amount</td>
                <td style="font-weight:700;color:#009EA8;text-align:right;font-size:16px">R${amount}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9896AA">Collection</td>
                <td style="color:#1A1A2E;text-align:right;font-size:13px">${collection_point}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Contact -->
        <p style="color:#6B6880;font-size:13.5px;line-height:1.75;margin:0 0 8px">If you have any questions, reply to this email or contact us:</p>
        <p style="margin:0 0 28px"><a href="tel:+27672144963" style="color:#009EA8;text-decoration:none;font-size:13.5px">+27 067 214 4963</a> &nbsp;·&nbsp; <a href="mailto:baseerahinstitute.sa@gmail.com" style="color:#009EA8;text-decoration:none;font-size:13.5px">baseerahinstitute.sa@gmail.com</a></p>

        <!-- Jazakallah -->
        <div style="background:#1A1A2E;border-radius:12px;padding:20px 24px;text-align:center">
          <p style="font-family:Georgia,serif;font-size:20px;color:#009EA8;margin:0 0 4px;direction:rtl">جزاكم الله خيرًا</p>
          <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0">May Allah reward you with the best</p>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#E8E0D3;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center">
        <p style="color:#9896AA;font-size:11px;margin:0">© 2026 Baseerah Institute · NPC 2026/317298/08</p>
        <p style="color:#9896AA;font-size:11px;margin:4px 0 0">Masjid al-Salaam (upstairs), 34 St Athans Road, Athlone, Cape Town</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  // ── Plain admin email ─────────────────────────────────────────
  const adminHtml = `
<div style="font-family:sans-serif;color:#1A1A2E">
  <h3 style="color:#009EA8">New Shop Order — Baseerah</h3>
  <p><strong>Order ID:</strong> ${order_id}</p>
  <p><strong>Product:</strong> ${product}</p>
  <p><strong>Amount:</strong> R${amount}</p>
  <p><strong>Customer:</strong> ${customer_name}</p>
  <p><strong>Email:</strong> ${customer_email}</p>
  <p><strong>Collection:</strong> ${collection_point}</p>
  <hr/>
  <p style="font-size:12px;color:#9896AA">Log this order in the CMS: <a href="${SITE_URL}/admin">Admin → Orders</a></p>
</div>`;

  const [customerStatus, adminStatus] = await Promise.allSettled([
    sendEmail(SENDGRID_KEY, customer_email, `Order Received — ${product} | Baseerah Institute`, customerHtml),
    sendEmail(SENDGRID_KEY, ADMIN_EMAIL,    `New Order: ${product} (${order_id})`,               adminHtml),
  ]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      customer: customerStatus.status,
      admin:    adminStatus.status,
    }),
  };
};
