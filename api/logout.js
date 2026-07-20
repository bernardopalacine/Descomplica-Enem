// api/logout.js
// Limpa o cookie de sessão no servidor. Necessário porque o cookie agora é
// HttpOnly — o JavaScript do cliente não tem mais permissão de apagá-lo sozinho.
const session = require('./_lib/session');
const { siteOrigin, setCorsHeaderSafe } = require('./_lib/env');

const SITE_ORIGIN = siteOrigin();

module.exports = async (req, res) => {
  setCorsHeaderSafe(res, 'Access-Control-Allow-Origin', SITE_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({});

  res.setHeader('Set-Cookie', session.clearCookieHeader());
  return res.status(200).json({ ok: true });
};
