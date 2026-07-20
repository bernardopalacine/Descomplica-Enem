// api/verificar-sessao.js
// Confere no servidor se o cookie de sessão é válido (assinado em login.js).
// Chamado via fetch pelo cliente para decidir se mostra a área logada —
// diferente do cookie antigo, este não pode ser forjado no console do navegador.
const session = require('./_lib/session');

module.exports = async (req, res) => {
  // Sem Access-Control-Allow-Origin de propósito — ver login.js.
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = session.readCookie(req);
  const dados = session.verify(token);

  if (!dados) return res.status(200).json({ ok: false });

  return res.status(200).json({ ok: true, nome: dados.nome, email: dados.email });
};
