/* netlify/functions/donation-notify.js
   Receives donation confirmation from Yoco webhook or PayFast ITN.
   Sends admin notification + JazakAllah Khayran email to donor.
   Called by payment gateways as notify_url.
*/

const https       = require('https');
const crypto      = require('crypto');
const querystring = require('querystring');

const md5 = str => crypto.createHash('md5').update(str).digest('hex');

async function sendEmail(apiKey, to, subject, html) {
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'donations@baseerahinstitute.org', name: 'Baseerah Institute' },
    subject,
    content: [{ type: 'text/html', value: html }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
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
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE || '';
  const ADMIN_EMAIL  = 'baseerahinstitute.sa@gmail.com';
  const SITE_URL     = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  if (!SENDGRID_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SENDGRID_API_KEY not configured' }) };
  }

  // Parse body — supports both JSON (Yoco webhook) and form-encoded (PayFast ITN)
  let data = {};
  const contentType = (event.headers['content-type'] || '').toLowerCase();

  try {
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body);
    } else {
      data = querystring.parse(event.body);
    }
  } catch {
    return { statusCode: 400, body: 'Invalid body' };
  }

  // PayFast signature validation (skip for Yoco which uses webhook signatures differently)
  if (contentType.includes('application/x-www-form-urlencoded') && data.signature) {
    const check = { ...data };
    delete check.signature;
    const str = Object.keys(check)
      .filter(k => check[k] !== '')
      .sort()
      .map(k => `${k}=${encodeURIComponent(check[k]).replace(/%20/g, '+')}`)
      .join('&');
    const signed = PASSPHRASE
      ? `${str}&passphrase=${encodeURIComponent(PASSPHRASE).replace(/%20/g, '+')}`
      : str;
    if (md5(signed) !== data.signature) {
      return { statusCode: 400, body: 'Invalid signature' };
    }
    if (data.payment_status !== 'COMPLETE') {
      return { statusCode: 200, body: 'OK' };
    }
  }

  // Normalise fields from either gateway
  const donation_id   = data.m_payment_id  || data.metadata?.donation_id  || 'DON-' + Date.now();
  const donation_type = data.item_name?.replace('Baseerah ','') || data.metadata?.donation_type || 'Donation';
  const donor_name    = [data.name_first, data.name_last].filter(Boolean).join(' ') || data.metadata?.donor_name || 'Anonymous';
  const donor_email   = data.email_address || data.metadata?.donor_email || '';
  const amount        = parseFloat(data.amount_gross || data.amount || data.metadata?.amount || 0).toFixed(2);
  const payment_method = contentType.includes('json') ? 'Yoco' : 'PayFast';
  const date_str      = new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

  // ── Admin notification ────────────────────────────────────────
  const adminHtml = `
<div style="font-family:sans-serif;color:#1A1A2E;max-width:500px">
  <div style="background:#1A1A2E;padding:20px 28px;border-radius:12px 12px 0 0">
    <h2 style="color:#009EA8;margin:0;font-size:20px">New Donation — Baseerah</h2>
  </div>
  <div style="background:#FAF8F4;padding:24px 28px;border:1px solid #E8E0D3;border-top:none;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em;width:140px">Donation ID</td><td style="font-weight:600">${donation_id}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Type</td><td><strong style="color:#009EA8">${donation_type}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Amount</td><td style="font-size:18px;font-weight:700;color:#1A1A2E">R${amount}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Donor</td><td>${donor_name}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Email</td><td>${donor_email || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Method</td><td>${payment_method}</td></tr>
      <tr><td style="padding:8px 0;color:#9896AA;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Date</td><td>${date_str}</td></tr>
    </table>
    <p style="font-size:12px;color:#9896AA;margin-top:16px">Log manually in CMS: <a href="${SITE_URL}/admin">Admin → Donations</a></p>
  </div>
</div>`;

  // ── Donor JazakAllah email ────────────────────────────────────
  const donorHtml = donor_email ? `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:#1A1A2E;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
        <h1 style="color:#009EA8;font-family:Georgia,serif;font-size:28px;font-weight:300;margin:0 0 4px">Baseerah Institute</h1>
        <p style="color:rgba(255,255,255,.4);font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0">Donation Received</p>
      </td></tr>
      <tr><td style="background:#FAF8F4;padding:40px;border:1px solid #E8E0D3;border-top:none;border-bottom:none;text-align:center">
        <div style="width:72px;height:72px;background:#E0F5F7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px">
          <span style="font-size:32px">✓</span>
        </div>
        <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#1A1A2E;margin:0 0 8px">JazakAllah Khayran</h2>
        <p style="font-family:Georgia,serif;font-size:22px;color:#009EA8;direction:rtl;margin:0 0 24px">جزاكم الله خيرًا</p>
        <p style="color:#6B6880;font-size:15px;line-height:1.78;max-width:420px;margin:0 auto 28px">Your ${donation_type} of <strong style="color:#1A1A2E">R${amount}</strong> has been received. May Allah accept it from you and multiply it immeasurably.</p>
        <div style="background:#1A1A2E;border-radius:12px;padding:20px 28px;margin:0 auto;max-width:400px">
          <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:rgba(255,255,255,.75);line-height:1.7;margin:0 0 8px">"Whoever guides someone to goodness will have a reward like the one who did it."</p>
          <p style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.08em;margin:0">Sahih Muslim</p>
        </div>
      </td></tr>
      <tr><td style="background:#E8E0D3;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center">
        <p style="color:#9896AA;font-size:11px;margin:0">© 2026 Baseerah Institute · NPC 2026/317298/08</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>` : null;

  // Send emails
  const sends = [sendEmail(SENDGRID_KEY, ADMIN_EMAIL, `New ${donation_type}: R${amount} — ${donor_name}`, adminHtml)];
  if (donorHtml) sends.push(sendEmail(SENDGRID_KEY, donor_email, 'JazakAllah Khayran — Baseerah Institute', donorHtml));

  await Promise.allSettled(sends);

  return { statusCode: 200, body: 'OK' };
};
