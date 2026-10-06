import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/delivery-card";
import { EmptyState, Loading, SectionTitle } from "@/components/ui";
import { useEntregasHojeOffline, useEntregasMotoboyHoje, usePrefetchEntrega, useRealtimeCorridas } from "@/hooks/useCorridas";
import { useNetwork } from "@/hooks/useNetwork";
import { Colors, Fonts, Spacing } from "@/theme";

export default function CorridasScreen() {
  const router = useRouter();
  useRealtimeCorridas();

  const online = useNetwork();
  const hojeOnlineQuery = useEntregasMotoboyHoje();
  const hojeOfflineQuery = useEntregasHojeOffline();
  const prefetch = usePrefetchEntrega();
  const queryClient = useQueryClient();

  // quando o RPC online atualiza, recarrega o cache local (offline)
  useEffect(() => {
    if (hojeOnlineQuery.dataUpdatedAt) {
      void queryClient.invalidateQueries({ queryKey: ["entregas", "hoje", "offline"] });
    }
  }, [hojeOnlineQuery.dataUpdatedAt, queryClient]);

  const open = (id: number) => router.push(`/entrega/${id}` as never);

  const offlineList = hojeOfflineQuery.data ?? [];
  const entregas = online
    ? (hojeOnlineQuery.data ?? offlineList)
    : (offlineList.length ? offlineList : (hojeOnlineQuery.data ?? []));
  const loading = online
    ? hojeOnlineQuery.isLoading && !entregas.length
    : hojeOfflineQuery.isLoading && !entregas.length;
  const refreshing = online ? hojeOnlineQuery.isFetching : false;
  const onRefresh = useCallback(() => {
    if (online) hojeOnlineQuery.refetch();
    else void hojeOfflineQuery.refetch();
  }, [online, hojeOnlineQuery, hojeOfflineQuery]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Corridas</Text>
        <Text style={styles.subtitle}>
          Aceite corridas e acompanhe as entregas em andamento.{!online && " (Offline)"}
        </Text>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <SectionTitle>Minhas de Hoje{!online && " · Cache"}</SectionTitle>
          {entregas.length ? (
            entregas.map((e: any) => (
              <DeliveryCard
                key={e.id}
                entrega={e}
                highlight
                onPress={() => open(e.id)}
                onPressIn={() => prefetch(e.id)}
                onHoverIn={() => prefetch(e.id)}
              />
            ))
          ) : (
            <EmptyState
              title={online && hojeOnlineQuery.isLoading ? "Carregando..." : "Nenhuma entrega hoje"}
              subtitle="Entregas do RPC entregas_motoboy_hoje (com cliente/operador)."
            />
          )}
          <Text style={styles.hint}>Histórico completo na aba Histórico.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
