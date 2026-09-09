import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import {
  aceitarEntrega,
  cancelarEntrega,
  fetchAtivas,
  fetchDisponiveis,
  fetchEntrega,
  fetchHistorico,
  iniciarEntrega,
  recusarEntrega,
} from '@/lib/api';
import { Entrega } from '@/lib/types';

const keys = {
  disponiveis: ['entregas', 'disponiveis'] as const,
  ativas: ['entregas', 'ativas'] as const,
  historico: ['entregas', 'historico'] as const,
  detalhe: (id: number) => ['entregas', 'detalhe', id] as const,
};

export function useDisponiveis() {
  const { client } = useAuth();
  return useQuery({
    queryKey: keys.disponiveis,
    queryFn: () => fetchDisponiveis(client!),
    enabled: !!client,
    refetchInterval: 30_000,
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
    refetchInterval: 30_000,
  });
}

export function useHistorico() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: keys.historico,
    queryFn: () => fetchHistorico(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 30_000,
  });
}

export function useEntrega(id: number) {
  const { client } = useAuth();
  return useQuery({
    queryKey: keys.detalhe(id),
    queryFn: () => fetchEntrega(client!, id),
    enabled: !!client && id > 0,
  });
}

/** Assina mudanças em `entregas` (realtime) e invalida as queries de corridas. */
export function useRealtimeCorridas() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client || !motoboy) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['entregas'] });
    };

    const channel = client
      .channel('corridas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entregas',
          filter: `id_motoqueiro=eq.${motoboy.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entregas',
          filter: 'status=eq.S',
        },
        invalidate,
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
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
