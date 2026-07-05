// netlify/functions/webhook.js
const { createClient } = require('@supabase/supabase-js');
const { Resend }       = require('resend');
const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');

const db     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const SITE    = process.env.URL            || 'https://thunderous-panda-b1b008.netlify.app';
const FROM    = process.env.EMAIL_FROM     || 'Descomplica ENEM <noreply@resend.dev>';
const SUPORTE = process.env.EMAIL_SUPORTE  || 'suporte@descomplica-enem.com';

const ADJ = ['azul','verde','rapido','forte','firme','claro','novo','bom','alto','belo'];
const SUB = ['gato','rio','sol','mar','vento','fogo','pico','base','foco','meta'];
function gerarSenha() {
  const r = a => a[crypto.randomInt(a.length)];
  return `${r(ADJ)}-${r(SUB)}-${crypto.randomInt(10,99)}`;
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
  <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">© 2025 Descomplica ENEM · Todos os direitos reservados</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

exports.handler = async (event) => {
  const method = event.httpMethod;

  // ── GET: ping de verificação da Cakto ─────────────────────
  if (method === 'GET') {
    console.log('Ping de verificação recebido');
    return { statusCode: 200, body: JSON.stringify({ ok: true, status: 'webhook ativo' }) };
  }

  // ── OPTIONS: CORS preflight ────────────────────────────────
  if (method === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  // ── POST: compra real ──────────────────────────────────────
  if (method !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const raw = event.body || '';
  console.log('Webhook recebido. Headers:', JSON.stringify(event.headers));
  console.log('Body raw:', raw.substring(0, 500));

  // Parse do payload
  let p;
  try {
    p = JSON.parse(raw);
  } catch(e) {
    console.error('JSON inválido:', e.message);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  console.log('Payload parsed:', JSON.stringify(p));

  // Verifica se é compra aprovada — aceita qualquer formato da Cakto
  const ev = (p.event || p.type || p.status || '').toString().toLowerCase().replace(/[._\-\s]/g,'');
  const st = (p.data?.status || p.status || p.data?.payment_status || '').toString().toLowerCase();

  console.log(`Evento: "${ev}" | Status: "${st}"`);

  const aprovado =
    ['approved','paid','complete','completed','active','success'].some(s => st.includes(s)) ||
    ['purchaseapproved','orderapproved','paymentapproved','saleapproved',
     'purchase','sale','order','payment'].some(e => ev.includes(e)) ||
    st === '' && ev !== ''; // alguns webhooks não têm status explícito

  if (!aprovado) {
    console.log(`Evento ignorado: ev="${ev}" st="${st}"`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, msg: 'evento ignorado', ev, st }) };
  }

  // Extrai email e nome — tenta todos os campos possíveis da Cakto
  const buyer = p.data?.buyer      ||
                p.data?.customer   ||
                p.data?.subscriber ||
                p.buyer            ||
                p.customer         ||
                p.subscriber       || {};

  const email = (
    buyer.email        ||
    p.data?.email      ||
    p.data?.buyer_email||
    p.email            ||
    p.customer_email   || ''
  ).trim().toLowerCase();

  const nome = (
    buyer.name         ||
    buyer.nome         ||
    buyer.full_name    ||
    p.data?.name       ||
    p.data?.buyer_name ||
    p.name             || ''
  ).trim();

  console.log(`Comprador: email="${email}" nome="${nome}"`);

  if (!email || !email.includes('@')) {
    console.error('Email não encontrado no payload:', JSON.stringify(p));
    return { statusCode: 400, body: 'Email não encontrado no payload' };
  }

  // Gera senha legível
  const pw   = gerarSenha();
  const hash = await bcrypt.hash(pw, 10);

  console.log(`Senha gerada para ${email}: ${pw}`);

  // Salva no Supabase
  const { error: dbErr } = await db.from('usuarios').upsert({
    email,
    nome,
    senha_hash: hash,
    criado_em:  new Date().toISOString(),
    ativo:      true,
    compra: {
      id:      p.data?.id || p.id || p.order_id || '',
      produto: p.data?.product?.name || p.product_name || 'Descomplica ENEM',
      valor:   p.data?.amount || p.amount || p.price || '',
      evento:  ev,
      status:  st,
    },
  }, { onConflict: 'email' });

  if (dbErr) {
    console.error('Supabase erro:', JSON.stringify(dbErr));
    // Não retorna erro — continua para enviar o email
  } else {
    console.log(`✓ Usuário salvo no banco: ${email}`);
  }

  // Envia email via Resend
  const { data: mailData, error: mailErr } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: '🎓 Seu acesso ao Descomplica ENEM está pronto',
    html:    emailHtml(nome, email, pw),
  });

  if (mailErr) {
    console.error('Resend erro:', JSON.stringify(mailErr));
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Falha no envio do email', detail: mailErr }),
    };
  }

  console.log(`✓ Email enviado para ${email}. Resend ID: ${mailData?.id}`);
  return { statusCode: 200, body: JSON.stringify({ ok: true, email }) };
};
