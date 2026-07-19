-- Execute este SQL no Supabase > SQL Editor

create table if not exists usuarios (
  id              uuid default gen_random_uuid() primary key,
  email           text unique not null,
  nome            text,
  senha_hash      text not null,
  ativo           boolean default true,
  criado_em       timestamptz default now(),
  ultimo_acesso   timestamptz,
  senha_resetada_em timestamptz,
  compra          jsonb,
  tentativas_login int not null default 0,
  bloqueado_ate   timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- MIGRAÇÃO (só necessária se a tabela "usuarios" já existia antes
-- de tentativas_login/bloqueado_ate serem adicionadas). Rode este
-- bloco no SQL Editor do Supabase para ativar o bloqueio por
-- tentativas de login incorretas em login.js:
-- ─────────────────────────────────────────────────────────────
alter table usuarios add column if not exists tentativas_login int not null default 0;
alter table usuarios add column if not exists bloqueado_ate timestamptz;

-- Índice no email para login rápido
create index if not exists idx_usuarios_email on usuarios(email);

-- Row Level Security (RLS) — bloqueia acesso direto pelo browser
alter table usuarios enable row level security;

-- Apenas a service_role (usada nas Netlify Functions) pode ler/escrever
create policy "service only" on usuarios
  using (false)
  with check (false);
