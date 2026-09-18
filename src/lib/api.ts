import { File } from 'expo-file-system';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ChatMessage,
  Entrega,
  EntregaDetalhe,
  LedgerEntry,
  Saque,
  SaldoResposta,
} from './types';

const TABLE_ENTREGAS = 'entregas';

export async function fetchDisponiveis(
  client: SupabaseClient,
): Promise<Entrega[]> {
  const { data, error } = await client
    .from(TABLE_ENTREGAS)
    .select('*')
    .eq('status', 'S')
    .is('id_motoqueiro', null)
    .order('dt_cadastro', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Entrega[];
}

export async function fetchAtivas(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<Entrega[]> {
  const { data, error } = await client
    .from(TABLE_ENTREGAS)
    .select('*')
    .eq('status', 'P')
    .eq('id_motoqueiro', idMotoboy)
    .order('dt_cadastro', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Entrega[];
}

export async function fetchHistorico(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<Entrega[]> {
  const { data, error } = await client
    .from(TABLE_ENTREGAS)
    .select('*')
    .in('status', ['F', 'C'])
    .eq('id_motoqueiro', idMotoboy)
    .order('dt_entrega', { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Entrega[];
}

const FORMA_PGTO: Record<number, string> = {
  0: 'Dinheiro',
  1: 'Pix Cooperativa',
  2: 'Pix Motoqueiro',
  3: 'Comanda',
};

// RPC entregas_motoboy_hoje já traz join com pessoa/usuarios/motoboys (1 RTT)
// Usado para lista e detalhe reaproveitado (sem N+1)
export interface EntregasMotoboyHojeRow {
  id: number;
  id_pessoa: number | null;
  nome_cliente: string | null;
  endereco_retirada: string | null;
  endereco_entrega: string | null;
  vr_calculado: number | null;
  id_forma_pgto: number | null;
  descricao: string | null;
  dt_cadastro: string | null;
  operador: string | null;
  status: string | null;
  motoboy_nome: string | null;
  foto: string | null;
  celular: string | null;
  endereco_cliente: string | null;
  // campos extras que a RPC pode retornar conforme evolução
  [k: string]: unknown;
}

function mapRpcToDetalhe(row: EntregasMotoboyHojeRow, fallback?: Partial<Entrega>): EntregaDetalhe {
  const base = (fallback ?? {}) as Entrega;
  return {
    // campos base de Entrega (mantém fallback quando RPC não traz)
    id: row.id,
    id_tipo_produto: (base as Entrega).id_tipo_produto ?? null,
    id_pessoa: row.id_pessoa ?? (base as Entrega).id_pessoa ?? null,
    id_motoqueiro: (base as Entrega).id_motoqueiro ?? null,
    dt_cadastro: row.dt_cadastro ?? (base as Entrega).dt_cadastro ?? null,
    dt_saida: (base as Entrega).dt_saida ?? null,
    dt_entrega: (base as Entrega).dt_entrega ?? null,
    endereco_retirada: row.endereco_retirada ?? (base as Entrega).endereco_retirada ?? null,
    endereco_entrega: row.endereco_entrega ?? (base as Entrega).endereco_entrega ?? null,
    descricao: row.descricao ?? (base as Entrega).descricao ?? null,
    distancia: (base as Entrega).distancia ?? null,
    distancia_txt: (base as Entrega).distancia_txt ?? null,
    vr_calculado: row.vr_calculado ?? (base as Entrega).vr_calculado ?? null,
    vr_por_metro: (base as Entrega).vr_por_metro ?? null,
    status: (row.status as Entrega['status']) ?? (base as Entrega).status ?? null,
    id_forma_pgto: row.id_forma_pgto ?? (base as Entrega).id_forma_pgto ?? null,
    id_empresa: (base as Entrega).id_empresa ?? null,
    id_usuario_encerramento: (base as Entrega).id_usuario_encerramento ?? null,
    id_usuario_inclusao: (base as Entrega).id_usuario_inclusao ?? null,
    cod_transacao: (base as Entrega).cod_transacao ?? null,
    bairro_entrega: (base as Entrega).bairro_entrega ?? null,
    transacao_guid: (base as Entrega).transacao_guid ?? null,
    endereco_cliente: (row.endereco_cliente as string | null) ?? (base as Entrega).endereco_cliente ?? null,
    anotacao: (base as Entrega).anotacao ?? null,
    id_usuario_encaminhamento: (base as Entrega).id_usuario_encaminhamento ?? null,
    transferido: (base as Entrega).transferido ?? null,
    st_icon: (base as Entrega).st_icon ?? null,
    assinatura_url: (base as Entrega).assinatura_url ?? null,
    id_usuario: (base as Entrega).id_usuario ?? null,
    uuid_motoboy: (base as Entrega).uuid_motoboy ?? null,
    entrega_json: (base as Entrega).entrega_json ?? null,
    // enriquecimentos vindos da RPC
    cliente_nome: row.nome_cliente ?? null,
    cliente_telefone: row.celular ?? null,
    cliente_endereco: row.endereco_cliente ?? null,
    operador_nome: row.operador ?? null,
    forma_pagamento:
      row.id_forma_pgto != null ? (FORMA_PGTO[row.id_forma_pgto as number] ?? null) : null,
  } as EntregaDetalhe;
}

export async function fetchEntregasMotoboyHoje(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<EntregaDetalhe[]> {
  const { data, error } = await client.rpc('entregas_motoboy_hoje', {
    p_id_motoboy: idMotoboy,
  });
  if (error) throw error;
  const rows = (data ?? []) as EntregasMotoboyHojeRow[];
  return rows.map((r) => mapRpcToDetalhe(r));
}

function formatEnderecoCadastro(p: {
  endereco: string | null;
  numero: number | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
}): string {
  const partes: string[] = [];
  const rua = [p.endereco, p.numero ? String(p.numero) : ''].filter(Boolean).join(', ');
  if (rua) partes.push(rua);
  if (p.complemento) partes.push(p.complemento);
  if (p.bairro) partes.push(p.bairro);
  if (p.cep) partes.push(`CEP ${p.cep}`);
  const cidadeEstado = [p.cidade, p.estado].filter(Boolean).join(' - ');
  if (cidadeEstado) partes.push(cidadeEstado);
  return partes.join(', ');
}

export async function fetchEntrega(
  client: SupabaseClient,
  id: number,
): Promise<EntregaDetalhe> {
  const { data, error } = await client
    .from(TABLE_ENTREGAS)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Entrega não encontrada.');

  const entrega = data as Entrega;
  const detalhe: EntregaDetalhe = {
    ...entrega,
    cliente_nome: null,
    cliente_telefone: null,
    cliente_endereco: null,
    operador_nome: null,
    forma_pagamento:
      entrega.id_forma_pgto != null ? (FORMA_PGTO[entrega.id_forma_pgto] ?? null) : null,
  };

  // Paraleliza buscas dependentes (antes eram sequenciais → 2x RTT)
  const promises: PromiseLike<void>[] = [];

  if (entrega.id_pessoa) {
    promises.push(
      client
        .from('pessoa')
        .select('nome,celular,endereco,numero,complemento,bairro,cep,cidade,estado')
        .eq('idpessoa', entrega.id_pessoa)
        .maybeSingle()
        .then(({ data: pessoa, error: pessoaErr }) => {
          if (!pessoaErr && pessoa) {
            detalhe.cliente_nome = pessoa.nome ?? null;
            detalhe.cliente_telefone = pessoa.celular ?? null;
            detalhe.cliente_endereco =
              formatEnderecoCadastro(pessoa as Parameters<typeof formatEnderecoCadastro>[0]) ||
              entrega.endereco_cliente;
          }
        }),
    );
  }

  if (entrega.id_usuario) {
    promises.push(
      client
        .from('usuarios_publicos')
        .select('id,username')
        .eq('id', entrega.id_usuario)
        .maybeSingle()
        .then(({ data: operador, error: operadorErr }) => {
          if (!operadorErr && operador) {
            detalhe.operador_nome = (operador as { username: string | null }).username ?? null;
          }
        }),
    );
  }

  if (promises.length) await Promise.all(promises);

  return detalhe;
}

export async function aceitarEntrega(
  client: SupabaseClient,
  id: number,
): Promise<Entrega> {
  const { data, error } = await client.rpc('aceitar_entrega', { p_id: id });
  if (error) throw new Error(extractErrorMessage(error));
  return data as Entrega;
}

export async function recusarEntrega(
  client: SupabaseClient,
  id: number,
  motivo: string,
): Promise<Entrega> {
  const { data, error } = await client.rpc('recusar_entrega', {
    p_id: id,
    p_motivo: motivo,
  });
  if (error) throw new Error(extractErrorMessage(error));
  return data as Entrega;
}

export async function iniciarEntrega(
  client: SupabaseClient,
  id: number,
): Promise<Entrega> {
  const { data, error } = await client.rpc('iniciar_entrega', { p_id: id });
  if (error) throw new Error(extractErrorMessage(error));
  return data as Entrega;
}

export async function cancelarEntrega(
  client: SupabaseClient,
  id: number,
): Promise<Entrega> {
  const { data, error } = await client.rpc('cancelar_entrega', { p_id: id });
  if (error) throw new Error(extractErrorMessage(error));
  return data as Entrega;
}

export interface FinalizarInput {
  id: number;
  tipo: 'assinatura' | 'foto';
  arquivoUrl?: string | null;
  nomeRecebedor?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function finalizarEntrega(
  client: SupabaseClient,
  input: FinalizarInput,
): Promise<Entrega> {
  const { data, error } = await client.rpc('finalizar_entrega', {
    p_id: input.id,
    p_tipo: input.tipo,
    p_arquivo_url: input.arquivoUrl ?? null,
    p_nome_recebedor: input.nomeRecebedor ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
  if (error) throw new Error(extractErrorMessage(error));
  return data as Entrega;
}

export async function uploadProva(
  client: SupabaseClient,
  idEntrega: number,
  tipo: 'assinatura' | 'foto',
  uri: string,
): Promise<string> {
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${tipo}/${idEntrega}/${Date.now()}.${ext}`;

  const file = new File(uri);
  const bytes = await file.bytes();

  const { error } = await client.storage.from('provas').upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload da prova: ${error.message}`);

  const { data: pub } = client.storage.from('provas').getPublicUrl(path);
  return pub.publicUrl;
}

export async function fetchSaldo(client: SupabaseClient): Promise<SaldoResposta> {
  const { data, error } = await client.rpc('saldo_motoboy');
  if (error) throw error;
  const row = (data as SaldoResposta[] | null)?.[0];
  return row ?? { saldo: 0, entregues: 0, em_andamento: 0 };
}

export async function fetchExtrato(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<LedgerEntry[]> {
  const { data, error } = await client
    .from('wallet_ledger')
    .select('*')
    .eq('id_motoboy', idMotoboy)
    .order('dt_lancamento', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}

export async function fetchSaques(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<Saque[]> {
  const { data, error } = await client
    .from('saques')
    .select('*')
    .eq('id_motoboy', idMotoboy)
    .order('dt_solicitacao', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Saque[];
}

export async function solicitarSaque(
  client: SupabaseClient,
  valor: number,
): Promise<void> {
  const { error } = await client.rpc('solicitar_saque', { p_valor: valor });
  if (error) throw new Error(extractErrorMessage(error));
}

export async function fetchChat(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from('chat_mensagens')
    .select('*')
    .eq('id_motoboy', idMotoboy)
    .order('dt_envio', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function enviarMensagem(
  client: SupabaseClient,
  idMotoboy: number,
  mensagem: string,
): Promise<void> {
  const { error } = await client.from('chat_mensagens').insert({
    id_motoboy: idMotoboy,
    remetente: 'motoboy',
    mensagem,
  });
  if (error) throw error;
}

export async function marcarMensagensLidas(
  client: SupabaseClient,
  idMotoboy: number,
): Promise<void> {
  const { error } = await client
    .from('chat_mensagens')
    .update({ lida: true })
    .eq('id_motoboy', idMotoboy)
    .eq('lida', false)
    .eq('remetente', 'despacho');
  if (error) throw error;
}

export async function atualizarPushToken(
  client: SupabaseClient,
  token: string,
): Promise<void> {
  const { error } = await client.rpc('set_push_token', { p_token: token });
  if (error) throw error;
}

function extractErrorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string };
  if (!e?.message) return 'OperaÃ§Ã£o nÃ£o concluÃ­da. Tente novamente.';
  return e.message;
}
