// netlify/functions/login.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const H  = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: H, body: '{}' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: '{}' }; }

  const email = (b.email || '').trim().toLowerCase();
  const senha = (b.senha || '').trim();

  if (!email || !senha)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Preencha email e senha.' }) };

  const { data: u } = await db.from('usuarios').select('nome,senha_hash,ativo').eq('email', email).single();

  if (!u)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Email não encontrado. Use o email com que você realizou a compra.' }) };

  if (!u.ativo)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Acesso suspenso. Entre em contato com o suporte.' }) };

  const ok = await bcrypt.compare(senha, u.senha_hash);
  if (!ok)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Senha incorreta. Clique em "Esqueci minha senha" para recuperar.' }) };

  await db.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('email', email);
  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, nome: u.nome }) };
};
