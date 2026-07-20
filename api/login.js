// api/login.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');
const session          = require('./_lib/session');
const { ipDoRequest, status: statusLimite, registrarFalha, limpar: limparLimite } = require('./_lib/ratelimit');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MAX_TENTATIVAS   = 6;
const BLOQUEIO_MINUTOS = 15;

// Mensagem única para "email não encontrado" e "senha incorreta" — as duas
// situações têm que ser indistinguíveis pra quem está tentando adivinhar
// (senão dá pra descobrir quais emails compraram o curso só testando login).
const MSG_CREDENCIAIS_INVALIDAS = 'Email ou senha incorretos. Clique em "Esqueci minha senha" para recuperar.';

// Sem Access-Control-Allow-Origin de propósito: o site só chama esta API
// a partir de si mesmo (mesma origem), que não passa por checagem de CORS
// de jeito nenhum — o header só seria necessário pra permitir OUTRO site
// chamar essa API pelo navegador de alguém, o que nunca foi o caso aqui.
// Um valor mal colado nessa variável já derrubou o login em produção uma
// vez; a forma mais simples e definitiva de eliminar essa classe de
// problema é não depender dela pra nada essencial. Allow-Credentials
// também não vai mais junto: sem Allow-Origin ele não faz nada por si só,
// mas deixá-lo aqui seria reabrir a mesma classe de bug caso um dia
// alguém precise adicionar Allow-Origin de volta pra outro motivo.
function cors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  // Bloqueio por IP, independente de o email existir ou não — ver
  // api/_lib/ratelimit.js para o motivo de isso ser um módulo separado
  // do bloqueio por conta logo abaixo.
  const chaveLimite = `login:${ipDoRequest(req)}`;
  const limite = await statusLimite(chaveLimite);
  if (limite.bloqueado) {
    res.setHeader('Retry-After', String(limite.retryAfterSeg));
    return res.status(429).json({ ok: false, msg: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

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

  if (!u) {
    await registrarFalha(chaveLimite, limite.tentativas);
    return res.status(200).json({ ok: false, msg: MSG_CREDENCIAIS_INVALIDAS });
  }

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
    await registrarFalha(chaveLimite, limite.tentativas);
    return res.status(200).json({ ok: false, msg: MSG_CREDENCIAIS_INVALIDAS });
  }

  const sucesso = { ultimo_acesso: new Date().toISOString() };
  if (temColunasLimite) { sucesso.tentativas_login = 0; sucesso.bloqueado_ate = null; }
  await db.from('usuarios').update(sucesso).eq('email', email);
  await limparLimite(chaveLimite);

  // Sessão assinada pelo servidor — o navegador não consegue forjar isso.
  res.setHeader('Set-Cookie', session.setCookieHeader({ email, nome: u.nome }));
  return res.status(200).json({ ok: true, nome: u.nome });
};
