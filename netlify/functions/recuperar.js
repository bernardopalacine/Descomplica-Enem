// netlify/functions/recuperar.js
const { createClient } = require('@supabase/supabase-js');
const { Resend }       = require('resend');
const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');

const db     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const SITE    = process.env.URL           || 'https://descomplica-enem.netlify.app';
const FROM    = process.env.EMAIL_FROM    || 'Descomplica ENEM <noreply@resend.dev>';
const SUPORTE = process.env.EMAIL_SUPORTE || 'suporte@descomplica-enem.com';
const SITE_ORIGIN = process.env.URL || 'https://descomplicaenem.site';
const H = { 'Content-Type':'application/json','Access-Control-Allow-Origin':SITE_ORIGIN,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };
const MSG = 'Se esse email tem uma compra registrada, você receberá a nova senha em instantes. Verifique também o spam.';
const COOLDOWN_MINUTOS = 2;

const ADJ = ['azul','verde','rapido','forte','firme','claro','novo','bom','alto','belo'];
const SUB = ['gato','rio','sol','mar','vento','fogo','pico','base','foco','meta'];
function senha() {
  const r = a => a[crypto.randomInt(a.length)];
  return `${r(ADJ)}-${r(SUB)}-${crypto.randomInt(1000,9999)}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: H, body: '{}' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: '{}' }; }

  const email = (b.email || '').trim().toLowerCase();
  if (!email || !email.includes('@'))
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Digite um email válido.' }) };

  const { data: u } = await db.from('usuarios').select('nome,ativo,senha_resetada_em').eq('email', email).single();
  if (!u || !u.ativo)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, msg: MSG }) };

  // Evita spam de emails: se já pediu reset há pouco, responde a mesma
  // mensagem de sempre (sem revelar o motivo) e não reenvia.
  if (u.senha_resetada_em) {
    const passados = Date.now() - new Date(u.senha_resetada_em).getTime();
    if (passados < COOLDOWN_MINUTOS * 60 * 1000)
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, msg: MSG }) };
  }

  const pw   = senha();
  const hash = await bcrypt.hash(pw, 10);
  await db.from('usuarios').update({ senha_hash: hash, senha_resetada_em: new Date().toISOString() }).eq('email', email);

  await resend.emails.send({
    from: FROM, to: email,
    subject: '🔑 Nova senha — Descomplica ENEM',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:48px 20px">
<tr><td align="center">
<table width="100%" style="max-width:540px;border-radius:24px;overflow:hidden;box-shadow:0 16px 64px rgba(0,0,0,.12)">
<tr><td style="background:#0c0c14;padding:32px 48px;text-align:center">
  <div style="color:#fff;font-size:17px;font-weight:700">Descomplica ENEM</div>
</td></tr>
<tr><td style="background:#fff;padding:44px 48px 36px">
  <p style="font-size:15px;color:#6b7280;margin:0 0 16px">Olá, <strong style="color:#111">${u.nome || email.split('@')[0]}</strong>!</p>
  <h1 style="font-size:26px;font-weight:900;color:#111;letter-spacing:-.04em;margin:0 0 8px">Aqui está sua nova senha.</h1>
  <p style="font-size:14px;color:#6b7280;margin:0 0 32px;line-height:1.65">Use os dados abaixo para entrar na plataforma.</p>
  <div style="background:#f8f8fc;border:1px solid #e8e8f0;border-radius:16px;padding:24px;margin-bottom:28px">
    <div style="margin-bottom:16px">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;margin:0 0 5px">Email</p>
      <p style="font-size:16px;font-weight:600;color:#111;margin:0">${email}</p>
    </div>
    <div>
      <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Nova senha</p>
      <div style="background:#0c0c14;border-radius:12px;padding:16px;text-align:center;font-size:22px;font-weight:700;color:#fff;letter-spacing:.06em;font-family:'Courier New',monospace">${pw}</div>
    </div>
  </div>
  <div style="text-align:center;margin-bottom:28px">
    <a href="${SITE}/acesso.html" style="display:inline-block;background:#e02d3c;color:#fff;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:15px;font-weight:700">Entrar agora →</a>
  </div>
  <p style="font-size:13px;color:#9ca3af;margin:0">Não pediu? Ignore este email. Dúvidas: <a href="mailto:${SUPORTE}" style="color:#e02d3c">${SUPORTE}</a></p>
</td></tr>
<tr><td style="background:#f8f8fc;padding:18px 48px;border-top:1px solid #e8e8f0">
  <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">© 2026 Descomplica ENEM</p>
</td></tr>
</table></td></tr></table></body></html>`,
  });

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, msg: MSG }) };
};
