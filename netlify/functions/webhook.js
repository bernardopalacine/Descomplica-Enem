const { createClient } = require('@supabase/supabase-js');
const { Resend }       = require('resend');
const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');

const db     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const SITE    = process.env.URL            || 'https://descomplicaenem.site';
const FROM    = process.env.EMAIL_FROM     || 'Descomplica ENEM <noreply@descomplicaenem.site>';
const SUPORTE = process.env.EMAIL_SUPORTE  || 'suporte@descomplicaenem.site';

const ADJ = ['azul','verde','rapido','forte','firme','claro','novo','bom','alto','belo'];
const SUB = ['gato','rio','sol','mar','vento','fogo','pico','base','foco','meta'];
function gerarSenha() {
  const r = a => a[crypto.randomInt(a.length)];
  return `${r(ADJ)}-${r(SUB)}-${crypto.randomInt(1000,9999)}`;
}

// Comparação em tempo constante para evitar timing attack no secret do webhook
function secretConfere(recebido, esperado) {
  const a = Buffer.from(String(recebido || ''));
  const b = Buffer.from(String(esperado || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function emailHtml(nome, email, pw) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Inter,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:48px 20px">
<tr><td align="center">
<table width="100%" style="max-width:540px;border-radius:24px;overflow:hidden;box-shadow:0 16px 64px rgba(0,0,0,.12)">
<tr><td style="background:#0c0c14;padding:36px 48px;text-align:center">
  <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:#e02d3c;font-family:Georgia,serif;font-size:24px;font-weight:900;color:#fff;line-height:48px;text-align:center;margin-bottom:14px">D</div>
  <div style="color:#fff;font-size:17px;font-weight:700">Descomplica ENEM</div>
</td></tr>
<tr><td style="background:#fff;padding:48px 48px 40px">
  <p style="font-size:15px;color:#6b7280;margin:0 0 20px;line-height:1.65">Olá, <strong style="color:#111">${nome || email.split('@')[0]}</strong>! 👋</p>
  <h1 style="font-size:28px;font-weight:900;color:#111;letter-spacing:-.04em;margin:0 0 10px;line-height:1.1">Seu acesso está <span style="color:#e02d3c;font-style:italic">pronto.</span></h1>
  <p style="font-size:15px;color:#6b7280;margin:0 0 36px;line-height:1.65">Obrigado pela compra! Use esses dados para entrar na plataforma agora mesmo.</p>
  <div style="background:#f8f8fc;border:1px solid #e8e8f0;border-radius:16px;padding:28px;margin-bottom:32px">
    <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase;margin:0 0 20px">Suas credenciais</p>
    <div style="margin-bottom:18px">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;margin:0 0 5px">Email</p>
      <p style="font-size:16px;font-weight:600;color:#111;margin:0">${email}</p>
    </div>
    <div>
      <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Senha</p>
      <div style="background:#0c0c14;border-radius:12px;padding:16px 24px;text-align:center;font-size:24px;font-weight:700;color:#fff;letter-spacing:.08em;font-family:'Courier New',monospace">${pw}</div>
    </div>
  </div>
  <div style="text-align:center;margin-bottom:36px">
    <a href="${SITE}/acesso.html" style="display:inline-block;background:#e02d3c;color:#fff;text-decoration:none;padding:18px 44px;border-radius:16px;font-size:16px;font-weight:700;letter-spacing:-.01em;box-shadow:0 10px 30px rgba(224,45,60,.32)">Acessar o conteúdo →</a>
  </div>
  <div style="background:#fff7f7;border:1px solid rgba(224,45,60,.12);border-radius:14px;padding:16px 20px;margin-bottom:28px">
    <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.65">💡 <strong style="color:#111">Guarde este email.</strong> Se esquecer a senha, clique em <em>"Esqueci minha senha"</em> na tela de login e uma nova será enviada automaticamente.</p>
  </div>
  <p style="font-size:13px;color:#9ca3af;margin:0;line-height:1.65">Dúvidas? Escreva para <a href="mailto:${SUPORTE}" style="color:#e02d3c;text-decoration:none">${SUPORTE}</a></p>
</td></tr>
<tr><td style="background:#f8f8fc;padding:20px 48px;border-top:1px solid #e8e8f0">
  <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">© 2026 Descomplica ENEM · Todos os direitos reservados</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === 'GET')     return { statusCode: 200, body: JSON.stringify({ ok: true, status: 'webhook ativo' }) };
  if (method === 'OPTIONS') return { statusCode: 200, body: '' };
  if (method !== 'POST')    return { statusCode: 405, body: 'Method Not Allowed' };

  const raw = event.body || '';
  let p;
  try { p = JSON.parse(raw); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  // ── Verificação de autenticidade do webhook ──────────────────────
  // Sem isso, qualquer pessoa que descobrisse esta URL poderia forjar
  // uma "compra aprovada" para qualquer email e ganhar acesso grátis.
  // O secret é conferido em 3 lugares possíveis (o que for mais fácil
  // de configurar no painel da Cakto): query string, header ou corpo.
  //   Ex.: https://SEU-SITE.netlify.app/webhook/cakto?secret=SEU_SECRET
  const secretEsperado = process.env.CAKTO_SECRET;
  if (!secretEsperado) {
    console.error('CAKTO_SECRET não configurado nas variáveis de ambiente — recusando webhook por segurança.');
    return { statusCode: 500, body: 'Webhook not configured: CAKTO_SECRET ausente.' };
  }
  const secretRecebido =
    (event.queryStringParameters && event.queryStringParameters.secret) ||
    event.headers['x-webhook-secret'] ||
    event.headers['x-cakto-secret'] ||
    p.secret || p.token || '';
  if (!secretConfere(secretRecebido, secretEsperado)) {
    console.error('Webhook rejeitado: secret inválido ou ausente.');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  console.log('Evento:', p.event, '| Status:', p.data?.[0]?.status);

  // Verifica se é compra aprovada
  const ev = (p.event || '').toLowerCase().replace(/[._\-\s]/g, '');
  const st = (p.data?.[0]?.status || p.status || '').toLowerCase();

  const aprovado =
    ['paid','approved','complete','completed'].some(s => st.includes(s)) ||
    ['purchaseapproved','purchase_approved'].includes(ev);

  if (!aprovado) {
    console.log(`Ignorado: ev="${ev}" st="${st}"`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, msg: 'ignorado', ev, st }) };
  }

  // Extrai dados — Cakto envia data como array
  const item     = Array.isArray(p.data) ? p.data[0] : p.data || {};
  const customer = item.customer || {};

  const email = (customer.email || item.email || '').trim().toLowerCase();
  const nome  = (customer.name  || customer.nome || item.name || '').trim();

  console.log(`Comprador: email="${email}" nome="${nome}"`);

  if (!email || !email.includes('@')) {
    console.error('Email não encontrado');
    return { statusCode: 400, body: 'Email não encontrado' };
  }

  // Gera senha
  const pw   = gerarSenha();
  const hash = await bcrypt.hash(pw, 10);

  // Salva no Supabase
  const { error: dbErr } = await db.from('usuarios').upsert({
    email, nome, senha_hash: hash,
    criado_em: new Date().toISOString(), ativo: true,
    compra: {
      id:      item.id || '',
      produto: item.product?.name || item.offer?.name || 'Descomplica ENEM',
      valor:   item.amount || item.baseAmount || '',
      metodo:  item.paymentMethodName || '',
    },
  }, { onConflict: 'email' });

  if (dbErr) console.error('Supabase erro:', dbErr.message);
  else console.log(`✓ Usuário salvo: ${email}`);

  // Envia email
  const { error: mailErr } = await resend.emails.send({
    from: FROM, to: email,
    subject: '🎓 Seu acesso ao Descomplica ENEM está pronto',
    html: emailHtml(nome, email, pw),
  });

  if (mailErr) {
    console.error('Email erro:', mailErr);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: mailErr.message }) };
  }

  console.log(`✓ Email enviado para ${email}`);
  return { statusCode: 200, body: JSON.stringify({ ok: true, email }) };
};
