/* netlify/functions/send-newsletter.js
   Fetches newsletter subscribers from Netlify Forms, sends branded
   HTML email to all via SendGrid. Respects unsubscribe list.
   POST body: { post_title, post_excerpt, post_url, post_cover_image, category }
*/

const https = require('https');

const httpsGet = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });

async function sendEmail(apiKey, to, subject, html) {
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'newsletter@baseerahinstitute.org', name: 'Baseerah Institute' },
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

  const SENDGRID_KEY    = process.env.SENDGRID_API_KEY;
  const NETLIFY_TOKEN   = process.env.NETLIFY_ACCESS_TOKEN;
  const SITE_URL        = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  if (!SENDGRID_KEY || !NETLIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars: SENDGRID_API_KEY or NETLIFY_ACCESS_TOKEN' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    post_title       = 'New from Baseerah Institute',
    post_excerpt     = '',
    post_url         = SITE_URL + '/blog.html',
    post_cover_image = '',
    category         = '',
  } = body;

  // 1. Fetch subscribers from Netlify Forms API
  let submissions = [];
  try {
    // Get site ID from env or derive from SITE_URL — using Netlify API
    const formsRes = await httpsGet(
      `https://api.netlify.com/api/v1/forms?access_token=${NETLIFY_TOKEN}`,
      {}
    );
    const forms = JSON.parse(formsRes.body);
    const newsletter = forms.find(f => f.name === 'newsletter');
    if (!newsletter) throw new Error('newsletter form not found');

    const subsRes = await httpsGet(
      `https://api.netlify.com/api/v1/forms/${newsletter.id}/submissions?access_token=${NETLIFY_TOKEN}&per_page=500`,
      {}
    );
    submissions = JSON.parse(subsRes.body);
  } catch (err) {
    console.error('Could not fetch subscribers:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not fetch subscribers: ' + err.message }) };
  }

  const emails = [...new Set(
    submissions
      .map(s => s.data?.email || s.email)
      .filter(Boolean)
  )];

  if (!emails.length) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0, message: 'No subscribers' }) };
  }

  const catLabel = { arabic: 'Arabic', hifth: 'Hifth', fiqh: 'Fiqh & Tazkiya', institute: 'Institute News' };
  const catDisplay = catLabel[category] || category || 'From the Institute';

  // 2. Build branded email HTML
  const emailHtml = (email) => {
    const unsubUrl = `${SITE_URL}/.netlify/functions/unsubscribe?email=${encodeURIComponent(email)}`;
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

      <!-- Header -->
      <tr><td style="background:#1A1A2E;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center">
        <h1 style="color:#009EA8;font-family:Georgia,serif;font-size:26px;font-weight:300;margin:0 0 4px">Baseerah Institute</h1>
        <p style="color:rgba(255,255,255,.4);font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0">New Article</p>
      </td></tr>

      <!-- Category pill -->
      ${catDisplay ? `<tr><td style="background:#FAF8F4;padding:20px 40px 0;text-align:center;border:1px solid #E8E0D3;border-top:none;border-bottom:none">
        <span style="display:inline-block;background:#009EA8;color:white;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:5px 16px;border-radius:100px">${catDisplay}</span>
      </td></tr>` : ''}

      <!-- Cover image -->
      ${post_cover_image ? `<tr><td style="background:#FAF8F4;padding:20px 40px 0;border:1px solid #E8E0D3;border-top:none;border-bottom:none">
        <img src="${post_cover_image}" alt="${post_title}" style="width:100%;border-radius:12px;display:block;max-height:260px;object-fit:cover"/>
      </td></tr>` : ''}

      <!-- Body -->
      <tr><td style="background:#FAF8F4;padding:32px 40px;border:1px solid #E8E0D3;border-top:none">
        <h2 style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1A1A2E;line-height:1.25;margin:0 0 16px">${post_title}</h2>
        ${post_excerpt ? `<p style="color:#6B6880;font-size:14.5px;line-height:1.78;margin:0 0 28px">${post_excerpt}</p>` : ''}
        <table cellpadding="0" cellspacing="0">
          <tr><td style="background:#009EA8;border-radius:100px;padding:14px 32px">
            <a href="${post_url}" style="color:white;font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none">Read Full Article →</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#E8E0D3;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
        <p style="color:#9896AA;font-size:11px;margin:0 0 6px">© 2026 Baseerah Institute · NPC 2026/317298/08</p>
        <p style="color:#9896AA;font-size:11px;margin:0">Masjid al-Salaam (upstairs), Athlone, Cape Town</p>
        <p style="margin:12px 0 0"><a href="${unsubUrl}" style="color:#9896AA;font-size:10.5px">Unsubscribe</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  };

  // 3. Send to all subscribers (sequential to avoid rate limits)
  let sent = 0, failed = 0;
  for (const email of emails) {
    try {
      await sendEmail(SENDGRID_KEY, email, `New Article: ${post_title} | Baseerah Institute`, emailHtml(email));
      sent++;
    } catch {
      failed++;
    }
    // Small delay between sends
    await new Promise(r => setTimeout(r, 120));
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, failed, total: emails.length }),
  };
};
