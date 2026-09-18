import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/delivery-card";
import { EmptyState, Loading, SectionTitle } from "@/components/ui";
import { useEntregasMotoboyHoje, usePrefetchEntrega, useRealtimeCorridas } from "@/hooks/useCorridas";
import { Colors, Fonts, Spacing } from "@/theme";

export default function CorridasScreen() {
  const router = useRouter();
  useRealtimeCorridas();

  const hojeRpc = useEntregasMotoboyHoje();

  const refreshing = hojeRpc.isFetching;

  const onRefresh = useCallback(() => {
    void hojeRpc.refetch();
  }, [hojeRpc]);

  const loading = hojeRpc.isLoading;
  const prefetch = usePrefetchEntrega();

  const open = (id: number) => router.push(`/entrega/${id}` as never);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Corridas</Text>
        <Text style={styles.subtitle}>
          Aceite corridas e acompanhe as entregas em andamento.
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
          <SectionTitle>Minhas de Hoje</SectionTitle>
          {hojeRpc.data?.length ? (
            hojeRpc.data.map((e) => (
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
              title={hojeRpc.isLoading ? "Carregando..." : "Nenhuma entrega hoje"}
              subtitle="Entregas do RPC entregas_motoboy_hoje (já com cliente/operador)."
            />
          )}
          <Text style={styles.hint}>Histórico completo em “Histórico” ao lado de Corridas.</Text>
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
