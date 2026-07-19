// api/login.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');
const session          = require('./_lib/session');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SITE_ORIGIN = process.env.SITE_URL || 'https://descomplicaenem.site';

const MAX_TENTATIVAS   = 6;
const BLOQUEIO_MINUTOS = 15;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', SITE_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({});

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch { return res.status(400).json({}); } }
  b = b || {};

  const email = (b.email || '').trim().toLowerCase();
  const senha = (b.senha || '').trim();

  if (!email || !senha)
    return res.status(200).json({ ok: false, msg: 'Preencha email e senha.' });

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
    return res.status(200).json({ ok: false, msg: 'Email não encontrado. Use o email com que você realizou a compra.' });

  if (!u.ativo)
    return res.status(200).json({ ok: false, msg: 'Acesso suspenso. Entre em contato com o suporte.' });

  if (temColunasLimite && u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date())
    return res.status(200).json({ ok: false, msg: 'Muitas tentativas incorretas. Tente novamente em alguns minutos ou clique em "Esqueci minha senha".' });

  const ok = await bcrypt.compare(senha, u.senha_hash);

  if (!ok) {
    if (temColunasLimite) {
      const tentativas = (u.tentativas_login || 0) + 1;
      const update = tentativas >= MAX_TENTATIVAS
        ? { tentativas_login: 0, bloqueado_ate: new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString() }
        : { tentativas_login: tentativas };
      await db.from('usuarios').update(update).eq('email', email);
    }
    return res.status(200).json({ ok: false, msg: 'Senha incorreta. Clique em "Esqueci minha senha" para recuperar.' });
  }

  const sucesso = { ultimo_acesso: new Date().toISOString() };
  if (temColunasLimite) { sucesso.tentativas_login = 0; sucesso.bloqueado_ate = null; }
  await db.from('usuarios').update(sucesso).eq('email', email);

  // Sessão assinada pelo servidor — o navegador não consegue forjar isso.
  res.setHeader('Set-Cookie', session.setCookieHeader({ email, nome: u.nome }));
  return res.status(200).json({ ok: true, nome: u.nome });
};
