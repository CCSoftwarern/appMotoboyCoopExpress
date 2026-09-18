import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { DeliveryCard } from '@/components/delivery-card';
import { Button, EmptyState, Input, Loading, SectionTitle } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { fetchEntregasMotoboyHistorico } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/theme';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDateInput(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  // aceita YYYY-MM-DD ou DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const { client, motoboy } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dt1, setDt1] = useState(toISODate(firstDay));
  const [dt2, setDt2] = useState(toISODate(today));
  const [applied, setApplied] = useState<{ p_dt1: string; p_dt2: string }>({
    p_dt1: toISODate(firstDay),
    p_dt2: toISODate(today),
  });

  const idMotoboy = motoboy?.id ?? 0;

  const query = useQuery({
    queryKey: ['entregas', 'historico-rpc', applied.p_dt1, applied.p_dt2, idMotoboy],
    queryFn: () => fetchEntregasMotoboyHistorico(client!, applied.p_dt1, applied.p_dt2, idMotoboy),
    enabled: !!client && !!motoboy && !!applied.p_dt1 && !!applied.p_dt2,
  });

  const onBuscar = () => {
    const p1 = parseDateInput(dt1);
    const p2 = parseDateInput(dt2);
    if (!p1 || !p2) {
      Alert.alert('Data inválida', 'Use YYYY-MM-DD ou DD/MM/YYYY');
      return;
    }
    if (p1 > p2) {
      Alert.alert('Intervalo inválido', 'Data inicial deve ser <= final');
      return;
    }
    setApplied({ p_dt1: p1, p_dt2: p2 });
  };

  const open = (id: number) => router.push(`/entrega/${id}` as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Consulte entregas por período via RPC entregas_motoboy_historico</Text>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Input label="De (p_dt1)" placeholder="YYYY-MM-DD" value={dt1} onChangeText={setDt1} autoCapitalize="none" />
          </View>
          <View style={styles.filterCol}>
            <Input label="Até (p_dt2)" placeholder="YYYY-MM-DD" value={dt2} onChangeText={setDt2} autoCapitalize="none" />
          </View>
        </View>
        <Button label="Buscar" onPress={onBuscar} loading={query.isFetching && !query.isLoading} />
        <Text style={styles.hint}>Ex: 2026-07-01 a 2026-07-31 para motoboy {idMotoboy}</Text>
      </View>

      {query.isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        >
          <SectionTitle>Resultados ({query.data?.length ?? 0})</SectionTitle>
          {query.isError ? (
            <EmptyState title="Erro ao carregar" subtitle={(query.error as Error)?.message ?? 'Tente novamente'} />
          ) : query.data?.length ? (
            query.data.map((e) => <DeliveryCard key={e.id} entrega={e} onPress={() => open(e.id)} />)
          ) : (
            <EmptyState title="Nenhuma entrega no período" subtitle={`${applied.p_dt1} a ${applied.p_dt2}`} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 24, fontWeight: Fonts.bold, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  filters: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterRow: { flexDirection: 'row', gap: Spacing.md },
  filterCol: { flex: 1 },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
});
