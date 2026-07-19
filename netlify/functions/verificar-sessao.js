// netlify/functions/verificar-sessao.js
// Confere no servidor se o cookie de sessão é válido (assinado em login.js).
// Chamado via fetch pelo cliente para decidir se mostra a área logada —
// diferente do cookie antigo, este não pode ser forjado no console do navegador.
const session = require('./_lib/session');

const SITE_ORIGIN = process.env.URL || 'https://descomplicaenem.site';
const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  const token = session.readCookie(event);
  const dados = session.verify(token);

  if (!dados) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false }) };

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, nome: dados.nome, email: dados.email }) };
};
