// api/_lib/env.js
// Variáveis de ambiente coladas no painel da Vercel às vezes trazem
// caracteres invisíveis (quebra de linha, aspas "inteligentes", espaços
// especiais de Unicode etc. — comum ao colar de Word/Docs/apps de
// mensagem). Um valor assim, usado direto num res.setHeader(...), derruba
// a function inteira com "Invalid character in header content"
// (ERR_INVALID_CHAR) — foi o que aconteceu com SITE_URL em produção, e
// só filtrar \r\n não foi suficiente. Esta função mantém só os
// caracteres ASCII imprimíveis (os únicos válidos numa URL), removendo
// QUALQUER outra coisa antes do valor chegar em qualquer header HTTP.
function siteOrigin(fallback) {
  const raw = String(process.env.SITE_URL || '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
  return raw || fallback || 'https://descomplicaenem.site';
}

// Rede de segurança final: mesmo já filtrando o valor acima, isso
// garante que um res.setHeader nunca derruba a function inteira — na
// pior das hipóteses, o header de CORS simplesmente não é definido
// (o que no máximo bloqueia uma chamada de outro domínio; não tira o
// site do ar como um erro 500 não tratado tirou).
function setCorsHeaderSafe(res, name, value) {
  try { res.setHeader(name, value); } catch (e) { console.error(`Falha ao definir header ${name}:`, e.message); }
}

module.exports = { siteOrigin, setCorsHeaderSafe };
