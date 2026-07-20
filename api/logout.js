// api/logout.js
// Limpa o cookie de sessão no servidor. Necessário porque o cookie agora é
// HttpOnly — o JavaScript do cliente não tem mais permissão de apagá-lo sozinho.
const session = require('./_lib/session');

module.exports = async (req, res) => {
  // Sem Access-Control-Allow-Origin de propósito — ver login.js.
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({});

  res.setHeader('Set-Cookie', session.clearCookieHeader());
  return res.status(200).json({ ok: true });
};
