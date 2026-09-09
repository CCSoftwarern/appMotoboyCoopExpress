export type EntregaStatus = 'S' | 'P' | 'F' | 'C';

export interface Motoboy {
  id: number;
  nome: string;
  celular: string | null;
  email: string | null;
  codigo_pix: string | null;
  foto: string | null;
  ativo: boolean;
}

export interface Entrega {
  id: number;
  id_tipo_produto: number | null;
  id_pessoa: number | null;
  id_motoqueiro: number | null;
  dt_cadastro: string | null;
  dt_saida: string | null;
  dt_entrega: string | null;
  endereco_retirada: string | null;
  endereco_entrega: string | null;
  descricao: string | null;
  distancia: number | null;
  distancia_txt: string | null;
  vr_calculado: number | null;
  vr_por_metro: number | null;
  status: EntregaStatus | null;
  id_forma_pgto: number | null;
  id_empresa: number | null;
  id_usuario_encerramento: number | null;
  id_usuario_inclusao: number | null;
  cod_transacao: string | null;
  bairro_entrega: string | null;
  transacao_guid: string | null;
  endereco_cliente: string | null;
  anotacao: string | null;
  id_usuario_encaminhamento: number | null;
  transferido: number | null;
  st_icon: number | null;
  assinatura_url: string | null;
  id_usuario: string | null;
  uuid_motoboy: string | null;
  entrega_json: Record<string, unknown> | null;
}

export interface EntregaDetalhe extends Entrega {
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cliente_endereco: string | null;
  operador_nome: string | null;
  forma_pagamento: string | null;
}

export type LedgerTipo = 'comissao' | 'ajuste' | 'saque' | 'estorno';

export interface LedgerEntry {
  id: number;
  id_motoboy: number;
  tipo: LedgerTipo;
  descricao: string | null;
  valor: number;
  id_entrega: number | null;
  dt_lancamento: string;
  saldo_apos: number | null;
}

export interface Saque {
  id: number;
  id_motoboy: number;
  valor: number;
  chave_pix: string | null;
  status: 'solicitado' | 'pago' | 'recusado';
  dt_solicitacao: string;
  dt_pagamento: string | null;
}

export interface ChatMessage {
  id: number;
  id_motoboy: number;
  remetente: 'motoboy' | 'despacho';
  mensagem: string;
  dt_envio: string;
  lida: boolean;
}

export interface SaldoResposta {
  saldo: number;
  entregues: number;
  em_andamento: number;
}

export interface LoginResponse {
  access_token: string;
  motoboy: Motoboy;
}
