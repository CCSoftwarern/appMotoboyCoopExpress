import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth';
import {
  fetchExtrato,
  fetchSaldo,
  fetchSaques,
  solicitarSaque,
} from '@/lib/api';

export function useSaldo() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['wallet', 'saldo'],
    queryFn: () => fetchSaldo(client!),
    enabled: !!client,
    refetchInterval: 30_000,
  });
}

export function useExtrato() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: ['wallet', 'extrato'],
    queryFn: () => fetchExtrato(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 30_000,
  });
}

export function useSaques() {
  const { client, motoboy } = useAuth();
  return useQuery({
    queryKey: ['wallet', 'saques'],
    queryFn: () => fetchSaques(client!, motoboy!.id),
    enabled: !!client && !!motoboy,
    refetchInterval: 30_000,
  });
}

export function useSolicitarSaque() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valor: number) => solicitarSaque(client!, valor),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
