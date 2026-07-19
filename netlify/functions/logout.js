// netlify/functions/logout.js
// Limpa o cookie de sessão no servidor. Necessário porque o cookie agora é
// HttpOnly — o JavaScript do cliente não tem mais permissão de apagá-lo sozinho.
const session = require('./_lib/session');

const SITE_ORIGIN = process.env.URL || 'https://descomplicaenem.site';
const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: H, body: '{}' };

  return {
    statusCode: 200,
    headers: { ...H, 'Set-Cookie': session.clearCookieHeader() },
    body: JSON.stringify({ ok: true }),
  };
};
