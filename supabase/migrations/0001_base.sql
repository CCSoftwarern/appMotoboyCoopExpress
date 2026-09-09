-- ============================================================================
-- CoopExpress Motoboy — Migrations (rodar no SQL Editor do Supabase)
-- Pré-requisitos: banco com as tabelas `entregas` e `motoboys` já existentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Hash de senha (bcrypt) — sem quebrar dados legados
--    A coluna `senha` (text) pode conter senhas em texto puro. Criamos
--    `senha_hash` e populamos de forma idempotente. A Edge Function `login`
--    passa a usar `senha_hash`.
-- ----------------------------------------------------------------------------
alter table public.motoboys
  add column if not exists senha_hash text;

update public.motoboys
  set senha_hash = crypt(senha, gen_salt('bf'))
  where senha_hash is null
    and senha is not null
    and senha not like '$2%';

-- ----------------------------------------------------------------------------
-- 2) View pública do motoboy (sem dados sensíveis)
--    `enail` é o typo existente no schema original — não renomear.
-- ----------------------------------------------------------------------------
create or replace view public.motoboys_public as
select
  id,
  nome,
  celular,
  enail as email,
  codigo_pix,
  foto,
  ativo
from public.motoboys;

-- Helper: id do motoboy logado, lido do claim `sub` do JWT customizado.
-- Não usa auth.uid() porque o sub é numérico (motoboys.id), não um uuid.
-- Suporta os dois formatos de GUC do PostgREST:
--   novo: request.jwt.claim.sub  (PostgREST >= 12, db-use-legacy-gucs = false)
--   legado: request.jwt.claims   (JSON inteiro com a chave "sub")
create or replace function public.motoboy_uid()
returns integer
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::integer,
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::integer
  );
$$;

-- ----------------------------------------------------------------------------
-- 3) Tabelas novas
-- ----------------------------------------------------------------------------

-- Lançamentos da carteira do motoboy
create table if not exists public.wallet_ledger (
  id bigint generated always as identity primary key,
  id_motoboy integer not null,
  tipo text not null check (tipo in ('comissao', 'ajuste', 'saque', 'estorno')),
  descricao text,
  valor numeric(12, 2) not null,
  id_entrega integer,
  saldo_apos numeric(12, 2),
  dt_lancamento timestamptz not null default now()
);

create index if not exists idx_wallet_ledger_motoboy
  on public.wallet_ledger (id_motoboy, dt_lancamento desc);

-- Solicitações de saque
create table if not exists public.saques (
  id bigint generated always as identity primary key,
  id_motoboy integer not null,
  valor numeric(12, 2) not null,
  chave_pix text,
  status text not null default 'solicitado'
    check (status in ('solicitado', 'pago', 'recusado')),
  dt_solicitacao timestamptz not null default now(),
  dt_pagamento timestamptz
);

create index if not exists idx_saques_motoboy
  on public.saques (id_motoboy, dt_solicitacao desc);

-- Mensagens do chat com o despacho
create table if not exists public.chat_mensagens (
  id bigint generated always as identity primary key,
  id_motoboy integer not null default public.motoboy_uid(),
  remetente text not null check (remetente in ('motoboy', 'despacho')),
  mensagem text not null,
  lida boolean not null default false,
  dt_envio timestamptz not null default now()
);

create index if not exists idx_chat_mensagens_motoboy
  on public.chat_mensagens (id_motoboy, dt_envio);

-- ----------------------------------------------------------------------------
-- 4) RLS — identidade do motoboy vem do JWT customizado (sub = motoboy.id)
-- ----------------------------------------------------------------------------
alter table public.entregas enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.saques enable row level security;
alter table public.chat_mensagens enable row level security;

-- entregas: visível se for minha OU estiver disponível (S)
drop policy if exists "entregas_select" on public.entregas;
create policy "entregas_select"
  on public.entregas for select
  using (
    public.motoboy_uid() = id_motoqueiro
    or status = 'S'
  );

drop policy if exists "entregas_update_own" on public.entregas;
create policy "entregas_update_own"
  on public.entregas for update
  using (
    public.motoboy_uid() = id_motoqueiro
    and status in ('S', 'P')
  );

-- wallet_ledger: só o próprio motoboy lê
drop policy if exists "wallet_ledger_select_own" on public.wallet_ledger;
create policy "wallet_ledger_select_own"
  on public.wallet_ledger for select
  using (public.motoboy_uid() = id_motoboy);

-- saques: só o próprio motoboy lê
drop policy if exists "saques_select_own" on public.saques;
create policy "saques_select_own"
  on public.saques for select
  using (public.motoboy_uid() = id_motoboy);

-- chat_mensagens
drop policy if exists "chat_select_own" on public.chat_mensagens;
create policy "chat_select_own"
  on public.chat_mensagens for select
  using (public.motoboy_uid() = id_motoboy);

drop policy if exists "chat_insert_own" on public.chat_mensagens;
create policy "chat_insert_own"
  on public.chat_mensagens for insert
  with check (public.motoboy_uid() = id_motoboy);

drop policy if exists "chat_update_own" on public.chat_mensagens;
create policy "chat_update_own"
  on public.chat_mensagens for update
  using (public.motoboy_uid() = id_motoboy);

-- ----------------------------------------------------------------------------
-- 5) Storage: bucket provas (uploads de assinatura/foto)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('provas', 'provas', true)
on conflict (id) do nothing;

drop policy if exists "provas_upload_auth" on storage.objects;
create policy "provas_upload_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'provas');

drop policy if exists "provas_read_public" on storage.objects;
create policy "provas_read_public"
  on storage.objects for select
  using (bucket_id = 'provas');

-- ----------------------------------------------------------------------------
-- 6) Realtime — novas corridas (S) e alterações nas minhas
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.entregas;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_mensagens;
  exception when duplicate_object then null;
  end;
end $$;
