// api/_lib/env.js
// Variáveis de ambiente coladas no painel da Vercel às vezes trazem um
// caractere de quebra de linha invisível no final. Um valor assim, usado
// direto num res.setHeader(...), derruba a function inteira com um erro
// "Invalid character in header content" (ERR_INVALID_CHAR) — foi
// exatamente isso que aconteceu com SITE_URL em produção. Esta função
// limpa o valor antes de ele chegar em qualquer header HTTP.
function siteOrigin(fallback) {
  const raw = String(process.env.SITE_URL || '').replace(/[\r\n]/g, '').trim();
  return raw || fallback || 'https://descomplicaenem.site';
}

module.exports = { siteOrigin };
