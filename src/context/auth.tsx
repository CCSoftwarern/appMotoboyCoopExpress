import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Config } from '@/lib/config';
import { loginMotoboy } from '@/lib/supabase';
import {
  clearSession,
  getMotoboy,
  getToken,
  saveMotoboy,
  saveToken,
} from '@/lib/token';
import { Motoboy } from '@/lib/types';

interface AuthContextValue {
  client: SupabaseClient | null;
  motoboy: Motoboy | null;
  loading: boolean;
  signIn: (login: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  setMotoboy: (motoboy: Motoboy | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [motoboy, setMotoboyState] = useState<Motoboy | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    // Plano B: limpa tokencelular no banco para não enviar notificação após logout
    // Usa token atual para chamar RPC antes de invalidar o client
    const currentToken = token;
    if (currentToken) {
      try {
        const tempClient = createAuthedClientWithFetch(currentToken, fetch);
        await tempClient.rpc('set_push_token', { p_token: null });
      } catch (e) {
        console.warn('Falha ao limpar push token no logout', e);
      }
    }
    setToken(null);
    setMotoboyState(null);
    await clearSession();
  }, [token]);

  const client = useMemo(() => {
    if (!token) return null;

    const onUnauthorized = () => {
      void signOut();
    };

    const wrappedFetch: typeof fetch = (input, init) =>
      fetch(input, init).then((res) => {
        if (res.status === 401) {
          setTimeout(onUnauthorized, 0);
        }
        return res;
      });

    return createAuthedClientWithFetch(token, wrappedFetch);
  }, [token, signOut]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [savedToken, savedMotoboy] = await Promise.all([
          getToken(),
          getMotoboy<Motoboy>(),
        ]);
        if (active && savedToken && savedMotoboy) {
          setToken(savedToken);
          setMotoboyState(savedMotoboy);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (login: string, senha: string) => {
    const result = await loginMotoboy(login.trim(), senha);
    await Promise.all([
      saveToken(result.access_token),
      saveMotoboy(result.motoboy as Motoboy),
    ]);
    setToken(result.access_token);
    setMotoboyState(result.motoboy as Motoboy);
  }, []);

  const setMotoboy = useCallback((m: Motoboy | null) => {
    setMotoboyState(m);
  }, []);

  const value = useMemo(
    () => ({ client, motoboy, loading, signIn, signOut, setMotoboy }),
    [client, motoboy, loading, signIn, signOut, setMotoboy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

function createAuthedClientWithFetch(
  token: string,
  wrappedFetch: typeof fetch,
): SupabaseClient {
  return createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: wrappedFetch,
    },
  });
}
