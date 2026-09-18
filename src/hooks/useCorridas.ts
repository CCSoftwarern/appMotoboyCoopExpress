import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/auth';
import {
  aceitarEntrega,
  cancelarEntrega,
  fetchAtivas,
  fetchDisponiveis,
  fetchEntrega,
  fetchEntregasMotoboyHoje,
  fetchHistorico,
  iniciarEntrega,
  recusarEntrega,
} from '@/lib/api';
import { Entrega, EntregaDetalhe } from '@/lib/types';

const keys = {
  disponiveis: ['entregas', 'disponiveis'] as const,
  ativas: ['entregas', 'ativas'] as const,
  historico: ['entregas', 'historico'] as const,
  hoje: (idMotoboy: number) => ['entregas', 'hoje', idMotoboy] as const,
  detalhe: (id: number) => ['entregas', 'detalhe', id] as const,
};

export function useDisponiveis() {
  const { client } = useAuth();
  return useQuery({
    queryKey: keys.disponiveis,
    queryFn: () => fetchDisponiveis(client!),
    enabled: !!client,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
  });
}

export function useAtivas() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: keys.ativas,
    queryFn: async () => {
      const list = await fetchAtivas(client!, motoboy!.id);
      return list;
    },
    enabled: !!client && !!motoboy,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
  });
}

export function useHistorico() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: keys.historico,
    queryFn: () => fetchHistorico(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useEntregasMotoboyHoje() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: keys.hoje(motoboy?.id ?? 0),
    queryFn: () => fetchEntregasMotoboyHoje(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

export function useEntrega(id: number) {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: keys.detalhe(id),
    queryFn: () => fetchEntrega(client!, id),
    enabled: !!client && id > 0,
    // Detalhe reaproveita RPC entregas_motoboy_hoje (já traz cliente/operador) → abertura instantânea
    placeholderData: () => {
      // 1) tenta cache do detalhe já buscado
      // 2) tenta lista Hoje (RPC) que já tem detalhe completo
      // 3) fallback para listas antigas (sem cliente enriquecido)
      if (motoboy) {
        const hoje = queryClient.getQueryData<EntregaDetalhe[]>(keys.hoje(motoboy.id));
        const foundHoje = hoje?.find((e) => e.id === id);
        if (foundHoje) return foundHoje;
      }
      const listas = [
        queryClient.getQueryData<Entrega[]>(keys.disponiveis),
        queryClient.getQueryData<Entrega[]>(keys.ativas),
        queryClient.getQueryData<Entrega[]>(keys.historico),
      ];
      for (const lista of listas) {
        const found = lista?.find((e) => e.id === id);
        if (found) {
          return {
            ...found,
            cliente_nome: null,
            cliente_telefone: null,
            cliente_endereco: null,
            operador_nome: null,
            forma_pagamento: null,
          } as EntregaDetalhe;
        }
      }
      return undefined;
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });
}

export function usePrefetchEntrega() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();
  return (id: number) => {
    if (!client || !id) return;
    // se já está no cache Hoje, não precisa prefetch
    if (motoboy) {
      const hoje = queryClient.getQueryData<EntregaDetalhe[]>(keys.hoje(motoboy.id));
      if (hoje?.some((e) => e.id === id)) return;
    }
    void queryClient.prefetchQuery({
      queryKey: keys.detalhe(id),
      queryFn: () => fetchEntrega(client, id),
      staleTime: 15_000,
    });
  };
}

/** Assina mudanças em `entregas` (realtime) e invalida as queries de corridas.
 * Antes: só INSERT S + * onde id_motoqueiro=motoboy → UPDATE S→P (despacho) não chegava rápido.
 * Agora: escuta ampla em entregas (sem filtro) + filtros específicos, debounce 300ms, + refetch no foreground.
 */
export function useRealtimeCorridas() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client || !motoboy) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['entregas'] });
        // detalhe aberto também atualiza
        void queryClient.invalidateQueries({ queryKey: ['entregas', 'detalhe'] });
      }, 300);
    };

    const channel = client
      .channel(`corridas-realtime-${motoboy.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas' },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          const oldRow = payload.old as Record<string, unknown> | null;
          const isMine =
            row?.id_motoqueiro === motoboy.id || oldRow?.id_motoqueiro === motoboy.id;
          const isDisponivel = row?.status === 'S' || oldRow?.status === 'S';
          if (isMine || isDisponivel) invalidate();
        },
      )
      .subscribe((status) => {
        // fallback: se realtime falhar, força polling mais agressivo já configurado (10s)
        if (status !== 'SUBSCRIBED') console.warn('[realtime] status', status);
      });

    const onFocus = () => invalidate();
    // React Native AppState já usado em usePush, aqui usa focus do query
    const sub = AppState.addEventListener?.('change', (s) => {
      if (s === 'active') onFocus();
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      void client.removeChannel(channel);
      sub?.remove?.();
    };
  }, [client, motoboy, queryClient]);
}

export function useAceitarEntrega() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return async (id: number): Promise<Entrega> => {
    const result = await aceitarEntrega(client!, id);
    await queryClient.invalidateQueries({ queryKey: ['entregas'] });
    return result;
  };
}

export function useRecusarEntrega() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return async (id: number, motivo: string) => {
    const result = await recusarEntrega(client!, id, motivo);
    await queryClient.invalidateQueries({ queryKey: ['entregas'] });
    return result;
  };
}

export function useIniciarEntrega() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return async (id: number) => {
    const result = await iniciarEntrega(client!, id);
    await queryClient.invalidateQueries({ queryKey: ['entregas'] });
    return result;
  };
}

export function useCancelarEntrega() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return async (id: number) => {
    const result = await cancelarEntrega(client!, id);
    await queryClient.invalidateQueries({ queryKey: ['entregas'] });
    return result;
  };
}
