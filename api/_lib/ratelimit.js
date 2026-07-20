// api/_lib/ratelimit.js
// Limita tentativas por IP, ANTES de sabermos se o email existe. O bloqueio
// por tentativas em login.js (tentativas_login/bloqueado_ate) só conta senha
// errada numa conta que já existe — quem manda um email que não existe nunca
// chega naquele contador, então dava pra repetir a checagem "email não
// encontrado" à vontade pra varrer uma lista de emails. Este módulo fecha
// essa lacuna com um limite por IP, independente do email ser válido ou não.
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const JANELA_MINUTOS  = 15;
const MAX_TENTATIVAS  = 10;

function ipDoRequest(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

async function status(chave) {
  const { data } = await db.from('login_rate_limit')
    .select('tentativas,bloqueado_ate').eq('chave', chave).maybeSingle();

  if (data && data.bloqueado_ate && new Date(data.bloqueado_ate) > new Date()) {
    const restanteMs = new Date(data.bloqueado_ate) - new Date();
    return { bloqueado: true, retryAfterSeg: Math.ceil(restanteMs / 1000) };
  }
  return { bloqueado: false, tentativas: (data && data.tentativas) || 0 };
}

async function registrarFalha(chave, tentativasAtuais) {
  const tentativas = (tentativasAtuais || 0) + 1;
  const registro = { chave, tentativas, atualizado_em: new Date().toISOString(), bloqueado_ate: null };
  if (tentativas >= MAX_TENTATIVAS) {
    registro.bloqueado_ate = new Date(Date.now() + JANELA_MINUTOS * 60 * 1000).toISOString();
    registro.tentativas = 0;
  }
  await db.from('login_rate_limit').upsert(registro, { onConflict: 'chave' });
}

async function limpar(chave) {
  await db.from('login_rate_limit').delete().eq('chave', chave);
}

module.exports = { ipDoRequest, status, registrarFalha, limpar };
