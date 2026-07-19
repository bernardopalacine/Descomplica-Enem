// api/_lib/session.js
// Sessão assinada pelo servidor: o cliente não consegue mais forjar
// "estou logado" escrevendo um cookie na mão pelo console do navegador.
const crypto = require('crypto');

const COOKIE_NAME = 'de_sess';
const MAX_AGE_MS  = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Prefira configurar SESSION_SECRET nas variáveis de ambiente da Vercel.
// Sem isso, cai num segredo derivado da service key do Supabase — funciona
// sem passo extra de configuração, mas SESSION_SECRET dedicado é mais seguro
// (evita reaproveitar a mesma chave para dois propósitos diferentes).
const SECRET = process.env.SESSION_SECRET || `${process.env.SUPABASE_SERVICE_KEY || ''}|de_session|v1`;

function sign(dados) {
  const payload = Buffer.from(JSON.stringify(dados)).toString('base64url');
  const assinatura = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${assinatura}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [payload, assinatura] = partes;

  const esperada = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let dados;
  try { dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { return null; }

  if (!dados || typeof dados.exp !== 'number' || Date.now() > dados.exp) return null;
  return dados;
}

// Vercel expõe req.headers.cookie como string, igual ao Node puro.
function readCookie(req) {
  const raw = (req.headers && (req.headers.cookie || req.headers.Cookie)) || '';
  const m = raw.match(/(?:^|;\s*)de_sess=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookieHeader(dados) {
  const token = sign({ ...dados, exp: Date.now() + MAX_AGE_MS });
  const expires = new Date(Date.now() + MAX_AGE_MS).toUTCString();
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;
}

module.exports = { sign, verify, readCookie, setCookieHeader, clearCookieHeader, COOKIE_NAME };
