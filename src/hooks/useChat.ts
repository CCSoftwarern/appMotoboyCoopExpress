import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import {
  enviarMensagem,
  fetchChat,
  marcarMensagensLidas,
} from '@/lib/api';

export function useChat() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat'],
    queryFn: () => fetchChat(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!client || !motoboy) return;

    const channel = client
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_mensagens',
          filter: `id_motoboy=eq.${motoboy.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['chat'] });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, motoboy, queryClient]);

  return query;
}

export function useEnviarMensagem() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensagem: string) => enviarMensagem(client!, motoboy!.id, mensagem),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}

export function useMarcarLidas() {
  const { client, motoboy } = useAuth();
  const queryClient = useQueryClient();
  return async () => {
    await marcarMensagensLidas(client!, motoboy!.id);
    await queryClient.invalidateQueries({ queryKey: ['chat'] });
  };
}
