// api/logout.js
// Limpa o cookie de sessão no servidor. Necessário porque o cookie agora é
// HttpOnly — o JavaScript do cliente não tem mais permissão de apagá-lo sozinho.
const session = require('./_lib/session');

const SITE_ORIGIN = process.env.SITE_URL || 'https://descomplicaenem.site';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', SITE_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({});

  res.setHeader('Set-Cookie', session.clearCookieHeader());
  return res.status(200).json({ ok: true });
};
