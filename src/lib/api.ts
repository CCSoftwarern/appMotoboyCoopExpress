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
