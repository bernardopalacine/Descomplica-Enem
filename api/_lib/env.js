// api/_lib/env.js
// Variáveis de ambiente coladas no painel da Vercel às vezes trazem
// caracteres invisíveis (quebra de linha, aspas "inteligentes", espaços
// especiais de Unicode etc. — comum ao colar de Word/Docs/apps de
// mensagem). Usado no corpo de um email isso é só cosmético, mas se um
// valor assim chegasse a um header HTTP quebraria a function. Esta
// função mantém só os caracteres ASCII imprimíveis (os únicos válidos
// numa URL).
function siteOrigin(fallback) {
  const raw = String(process.env.SITE_URL || '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
  return raw || fallback || 'https://descomplicaenem.site';
}

module.exports = { siteOrigin };
