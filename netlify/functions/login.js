// netlify/functions/login.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SITE_ORIGIN = process.env.URL || 'https://descomplicaenem.site';
const H  = { 'Content-Type':'application/json','Access-Control-Allow-Origin':SITE_ORIGIN,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };

const MAX_TENTATIVAS   = 6;
const BLOQUEIO_MINUTOS = 15;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: H, body: '{}' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: '{}' }; }

  const email = (b.email || '').trim().toLowerCase();
  const senha = (b.senha || '').trim();

  if (!email || !senha)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Preencha email e senha.' }) };

  // Tenta buscar já com as colunas de controle de tentativas. Se essas
  // colunas ainda não existirem no banco (migração não rodada), cai para
  // a busca simples — login continua funcionando, só sem o bloqueio.
  let u, temColunasLimite = true;
  {
    const full = await db.from('usuarios').select('nome,senha_hash,ativo,tentativas_login,bloqueado_ate').eq('email', email).single();
    if (full.error) {
      temColunasLimite = false;
      const basic = await db.from('usuarios').select('nome,senha_hash,ativo').eq('email', email).single();
      u = basic.data;
    } else {
      u = full.data;
    }
  }

  if (!u)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Email não encontrado. Use o email com que você realizou a compra.' }) };

  if (!u.ativo)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Acesso suspenso. Entre em contato com o suporte.' }) };

  if (temColunasLimite && u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date())
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Muitas tentativas incorretas. Tente novamente em alguns minutos ou clique em "Esqueci minha senha".' }) };

  const ok = await bcrypt.compare(senha, u.senha_hash);

  if (!ok) {
    if (temColunasLimite) {
      const tentativas = (u.tentativas_login || 0) + 1;
      const update = tentativas >= MAX_TENTATIVAS
        ? { tentativas_login: 0, bloqueado_ate: new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString() }
        : { tentativas_login: tentativas };
      await db.from('usuarios').update(update).eq('email', email);
    }
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, msg: 'Senha incorreta. Clique em "Esqueci minha senha" para recuperar.' }) };
  }

  const sucesso = { ultimo_acesso: new Date().toISOString() };
  if (temColunasLimite) { sucesso.tentativas_login = 0; sucesso.bloqueado_ate = null; }
  await db.from('usuarios').update(sucesso).eq('email', email);

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, nome: u.nome }) };
};
