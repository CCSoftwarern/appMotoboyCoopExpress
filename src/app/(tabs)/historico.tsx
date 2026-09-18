import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

import { DeliveryCard } from '@/components/delivery-card';
import { Button, EmptyState, Loading, SectionTitle } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { fetchEntregasMotoboyHistorico } from '@/lib/api';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toDisplayDate(iso: string) {
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

function diffDays(a: string, b: string) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.abs(Math.ceil((db.getTime() - da.getTime()) / 86400000)) + 1;
}

const PAGE_SIZE = 20;

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
  const [showPicker, setShowPicker] = useState<null | 'dt1' | 'dt2'>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const idMotoboy = motoboy?.id ?? 0;

  const query = useQuery({
    queryKey: ['entregas', 'historico-rpc', applied.p_dt1, applied.p_dt2, idMotoboy],
    queryFn: () => fetchEntregasMotoboyHistorico(client!, applied.p_dt1, applied.p_dt2, idMotoboy),
    enabled: !!client && !!motoboy && !!applied.p_dt1 && !!applied.p_dt2,
  });

  const onBuscar = useCallback(() => {
    if (dt1 > dt2) {
      Alert.alert('Intervalo inválido', 'Data inicial deve ser <= final');
      return;
    }
    const days = diffDays(dt1, dt2);
    if (days > 30) {
      Alert.alert('Intervalo muito grande', 'Máximo permitido é 30 dias. Ajuste as datas.');
      return;
    }
    setVisibleCount(PAGE_SIZE);
    setApplied({ p_dt1: dt1, p_dt2: dt2 });
  }, [dt1, dt2]);

  const onChangeDate = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setShowPicker(null);
      if (event.type === 'dismissed' || !selected) {
        if (Platform.OS === 'ios') setShowPicker(null);
        return;
      }
      const iso = toISODate(selected);
      if (showPicker === 'dt1') {
        const days = diffDays(iso, dt2);
        if (days > 30) {
          Alert.alert('Limite 30 dias', 'Intervalo não pode exceder 30 dias.');
          return;
        }
        setDt1(iso);
      } else if (showPicker === 'dt2') {
        const days = diffDays(dt1, iso);
        if (days > 30) {
          Alert.alert('Limite 30 dias', 'Intervalo não pode exceder 30 dias.');
          return;
        }
        setDt2(iso);
      }
      if (Platform.OS === 'ios') setShowPicker(null);
    },
    [showPicker, dt1, dt2, setDt1, setDt2],
  );

  const open = (id: number) => router.push(`/entrega/${id}` as never);

  const visibleData = useMemo(() => {
    return query.data?.slice(0, visibleCount) ?? [];
  }, [query.data, visibleCount]);

  const onEndReached = useCallback(() => {
    if (query.data && visibleCount < query.data.length) {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, query.data!.length));
    }
  }, [query.data, visibleCount]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Consulte entregas por período (máx. 30 dias)</Text>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>De</Text>
            <Pressable style={styles.dateInput} onPress={() => setShowPicker('dt1')}>
              <Text style={styles.dateText}>{toDisplayDate(dt1)}</Text>
              <MaterialIcons name="calendar-today" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Até</Text>
            <Pressable style={styles.dateInput} onPress={() => setShowPicker('dt2')}>
              <Text style={styles.dateText}>{toDisplayDate(dt2)}</Text>
              <MaterialIcons name="calendar-today" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>
        <Button label="Buscar" onPress={onBuscar} loading={query.isFetching && !query.isLoading} />
        <Text style={styles.hint}>
          {diffDays(dt1, dt2)} dia(s) • motoboy {idMotoboy} • RPC entregas_motoboy_historico
        </Text>
      </View>

      {showPicker && (
        <DateTimePicker
          value={new Date((showPicker === 'dt1' ? dt1 : dt2) + 'T12:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeDate}
          maximumDate={today}
        />
      )}

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <View style={styles.centerPad}>
          <EmptyState title="Erro ao carregar" subtitle={(query.error as Error)?.message ?? 'Tente novamente'} />
        </View>
      ) : (
        <FlatList
          data={visibleData}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DeliveryCard entrega={item} onPress={() => open(item.id)} />}
          contentContainerStyle={styles.content}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={7}
          ListHeaderComponent={<SectionTitle>Resultados ({query.data?.length ?? 0})</SectionTitle>}
          ListEmptyComponent={<EmptyState title="Nenhuma entrega no período" subtitle={`${toDisplayDate(applied.p_dt1)} a ${toDisplayDate(applied.p_dt2)}`} />}
          ListFooterComponent={
            visibleCount < (query.data?.length ?? 0) ? (
              <Text style={styles.footerLoading}>Carregando mais... {visibleCount}/{query.data?.length}</Text>
            ) : query.data?.length ? (
              <Text style={styles.footerEnd}>Fim da lista</Text>
            ) : null
          }
        />
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
  filterLabel: { fontSize: 12, fontWeight: Fonts.semibold, color: Colors.textSecondary, marginBottom: 4 },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
  },
  dateText: { fontSize: 15, color: Colors.text },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  centerPad: { flex: 1, padding: Spacing.md },
  footerLoading: { textAlign: 'center', fontSize: 13, color: Colors.textSecondary, paddingVertical: Spacing.md },
  footerEnd: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, paddingVertical: Spacing.md },
});
