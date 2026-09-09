-- ============================================================================
-- CoopExpress Motoboy — RPCs (funções do aplicativo)
-- Todas usam security definer e identificam o motoboy via JWT (sub = motoboy.id).
-- ============================================================================

-- Aceita uma corrida disponível (S → P, grava id_motoqueiro)
create or replace function public.aceitar_entrega(p_id integer)
returns public.entregas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_row public.entregas;
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  update public.entregas
     set id_motoqueiro = v_uid,
         status = 'P',
         id_usuario_encaminhamento = v_uid
   where id = p_id
     and status = 'S'
     and id_motoqueiro is null
   returning * into v_row;

  if not found then
    raise exception 'Corrida indisponível — ela pode já ter sido aceita por outro motoboy.';
  end if;

  return v_row;
end;
$$;

-- Devolve a corrida para a fila (S) gravando o motivo em anotacao
create or replace function public.recusar_entrega(p_id integer, p_motivo text default null)
returns public.entregas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_row public.entregas;
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  update public.entregas
     set status = 'S',
         id_motoqueiro = null,
         anotacao = coalesce(nullif(p_motivo, ''), anotacao)
   where id = p_id
     and (
       (status = 'P' and id_motoqueiro = v_uid)
       or (status = 'S' and id_motoqueiro is null)
     )
   returning * into v_row;

  if not found then
    raise exception 'Não foi possível devolver esta corrida.';
  end if;

  return v_row;
end;
$$;

-- Registra a saída para entrega (grava dt_saida)
create or replace function public.iniciar_entrega(p_id integer)
returns public.entregas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_row public.entregas;
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  update public.entregas
     set dt_saida = now()
   where id = p_id
     and status = 'P'
     and id_motoqueiro = v_uid
     and dt_saida is null
   returning * into v_row;

  if not found then
    raise exception 'Entrega não encontrada ou já iniciada.';
  end if;

  return v_row;
end;
$$;

-- Cancela a entrega em andamento
create or replace function public.cancelar_entrega(p_id integer)
returns public.entregas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_row public.entregas;
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  update public.entregas
     set status = 'C',
         id_usuario_encerramento = v_uid
   where id = p_id
     and status = 'P'
     and id_motoqueiro = v_uid
   returning * into v_row;

  if not found then
    raise exception 'Entrega não encontrada ou já encerrada.';
  end if;

  return v_row;
end;
$$;

-- Finaliza a entrega, grava a prova e credita a comissão na carteira
create or replace function public.finalizar_entrega(
  p_id integer,
  p_tipo text,
  p_arquivo_url text default null,
  p_nome_recebedor text default null,
  p_lat numeric default null,
  p_lng numeric default null
)
returns public.entregas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_row public.entregas;
  v_saldo numeric(12, 2);
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  update public.entregas
     set status = 'F',
         dt_entrega = now(),
         assinatura_url = coalesce(p_arquivo_url, assinatura_url),
         entrega_json = coalesce(entrega_json, '{}'::jsonb)
           || jsonb_build_object(
                'tipo_prova', p_tipo,
                'nome_recebedor', p_nome_recebedor,
                'lat', p_lat,
                'lng', p_lng
              )
   where id = p_id
     and status = 'P'
     and id_motoqueiro = v_uid
   returning * into v_row;

  if not found then
    raise exception 'Entrega não encontrada ou não está em andamento.';
  end if;

  select coalesce(sum(valor), 0)
    into v_saldo
    from public.wallet_ledger
   where id_motoboy = v_uid;

  insert into public.wallet_ledger (id_motoboy, tipo, descricao, valor, id_entrega, saldo_apos)
  values (
    v_uid,
    'comissao',
    'Entrega ' || coalesce(v_row.cod_transacao, v_row.id::text),
    v_row.vr_calculado,
    v_row.id,
    v_saldo + coalesce(v_row.vr_calculado, 0)
  );

  return v_row;
end;
$$;

-- Saldo e resumo do motoboy
create or replace function public.saldo_motoboy()
returns table (saldo numeric, entregues bigint, em_andamento bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce((select sum(valor) from public.wallet_ledger where id_motoboy = public.motoboy_uid()), 0),
    (select count(*) from public.entregas where id_motoqueiro = public.motoboy_uid() and status = 'F'),
    (select count(*) from public.entregas where id_motoqueiro = public.motoboy_uid() and status = 'P');
$$;

-- Solicita um saque (valida saldo e chave PIX)
create or replace function public.solicitar_saque(p_valor numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid integer := public.motoboy_uid();
  v_saldo numeric(12, 2);
  v_pix text;
begin
  if v_uid is null then
    raise exception 'Sessão não autenticada.';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor de saque válido.';
  end if;

  select coalesce(sum(valor), 0)
    into v_saldo
    from public.wallet_ledger
   where id_motoboy = v_uid;

  if p_valor > v_saldo then
    raise exception 'Saldo insuficiente para o saque.';
  end if;

  select codigo_pix into v_pix from public.motoboys where id = v_uid;
  if v_pix is null or v_pix = '' then
    raise exception 'Cadastre uma chave PIX para solicitar saques.';
  end if;

  insert into public.saques (id_motoboy, valor, chave_pix)
  values (v_uid, p_valor, v_pix);

  insert into public.wallet_ledger (id_motoboy, tipo, descricao, valor, saldo_apos)
  values (v_uid, 'saque', 'Saque solicitado', -p_valor, v_saldo - p_valor);
end;
$$;

-- Registra o token de push do motoboy
create or replace function public.set_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.motoboys
     set tokencelular = p_token
   where id = public.motoboy_uid();
$$;
