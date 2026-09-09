import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Config } from './config';

let anonClient: SupabaseClient | null = null;

/**
 * Cliente sem autenticação — usado apenas para chamar a edge function de login.
 */
export function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return anonClient;
}

/**
 * Cliente autenticado com o JWT customizado (sub = motoboy.id).
 * O token é enviado no header Authorization e o role/uid é lido pelo RLS.
 */
export function createAuthedClient(token: string): SupabaseClient {
  return createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function loginMotoboy(login: string, senha: string) {
  const url = `${Config.supabaseUrl}/functions/v1/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: Config.supabaseAnonKey,
      Authorization: `Bearer ${Config.supabaseAnonKey}`,
    },
    body: JSON.stringify({ login, senha }),
  });
  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; motoboy?: { id: number }; error?: string }
    | null;

  if (!res.ok) {
    const msg = data?.error ?? '';
    if (res.status === 401) throw new Error(msg || 'Celular/e-mail ou senha inválidos.');
    if (res.status === 400) throw new Error(msg || 'Verifique os dados informados.');
    if (msg) throw new Error(msg);
    throw new Error('Falha ao conectar. Verifique sua internet e tente novamente.');
  }
  if (!data?.access_token) throw new Error('Resposta inválida do servidor.');
  return data as { access_token: string; motoboy: { id: number } };
}

export interface CadastroPayload {
  nome: string;
  celular?: string;
  email?: string;
  senha: string;
  codigo_pix?: string | null;
}

export async function cadastrarMotoboy(payload: CadastroPayload) {
  const url = `${Config.supabaseUrl}/functions/v1/cadastro`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: Config.supabaseAnonKey,
      Authorization: `Bearer ${Config.supabaseAnonKey}`,
    },
    body: JSON.stringify({
      nome: payload.nome,
      celular: payload.celular ?? null,
      enail: payload.email ?? null,
      email: payload.email ?? null,
      senha: payload.senha,
      codigo_pix: payload.codigo_pix ?? null,
    }),
  });
  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; motoboy?: { id: number; nome: string }; error?: string }
    | null;

  if (!res.ok) {
    const msg = data?.error ?? '';
    if (res.status === 409) throw new Error(msg || 'Celular ou e-mail já cadastrado.');
    if (res.status === 400) throw new Error(msg || 'Verifique os dados informados.');
    if (res.status === 401) throw new Error(msg || 'Não autorizado.');
    if (msg) throw new Error(msg);
    throw new Error('Falha ao criar conta. Verifique sua internet e tente novamente.');
  }
  if (!data?.access_token) throw new Error('Resposta inválida do servidor.');
  return data as { access_token: string; motoboy: { id: number; nome: string } };
}
