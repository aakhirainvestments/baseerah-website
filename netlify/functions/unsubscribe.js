/* netlify/functions/unsubscribe.js
   GET ?email=xxx — adds email to unsubscribed list via GitHub API.
   Also used as a redirect target from newsletter footer links.
*/

const https = require('https');

function githubRequest(method, path, token, body) {
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent':    'baseerah-unsubscribe',
        'Content-Type':  'application/json',
        'Accept':        'application/vnd.github.v3+json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO; // e.g. "username/repo"
  const SITE_URL     = process.env.SITE_URL || 'https://baseerahinstitute.netlify.app';

  const email = (event.queryStringParameters || {}).email;

  if (!email) {
    return {
      statusCode: 302,
      headers: { Location: `${SITE_URL}/index.html` },
      body: '',
    };
  }

  if (GITHUB_TOKEN && GITHUB_REPO) {
    const filePath  = `_data/unsubscribed.json`;
    const apiPath   = `/repos/${GITHUB_REPO}/contents/${filePath}`;

    try {
      // Fetch existing file
      const getRes = await githubRequest('GET', apiPath, GITHUB_TOKEN);
      let existing = [];
      let sha;

      if (getRes.status === 200) {
        const fileData = JSON.parse(getRes.body);
        sha = fileData.sha;
        existing = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      }

      if (!existing.includes(email)) {
        existing.push(email);
        const content = Buffer.from(JSON.stringify(existing, null, 2)).toString('base64');
        await githubRequest('PUT', apiPath, GITHUB_TOKEN, {
          message: `Unsubscribe: ${email}`,
          content,
          ...(sha ? { sha } : {}),
        });
      }
    } catch (err) {
      console.error('GitHub unsubscribe error:', err.message);
      // Don't fail — still show confirmation page
    }
  }

  // Redirect to a thank-you / confirmation
  return {
    statusCode: 302,
    headers: {
      Location: `${SITE_URL}/index.html?unsubscribed=1`,
    },
    body: '',
  };
};
