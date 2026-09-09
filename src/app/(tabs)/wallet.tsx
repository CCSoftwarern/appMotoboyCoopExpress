import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Button, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useExtrato, useSaldo, useSaques, useSolicitarSaque } from '@/hooks/useWallet';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { LedgerEntry, LedgerTipo, Saque } from '@/lib/types';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

const tipoInfo: Record<LedgerTipo, { icon: string; color: string; label: string }> = {
  comissao: { icon: 'add-circle', color: '#16A34A', label: 'Comissão' },
  ajuste: { icon: 'tune', color: '#2563EB', label: 'Ajuste' },
  saque: { icon: 'remove-circle', color: '#DC2626', label: 'Saque' },
  estorno: { icon: 'restore', color: '#F59E0B', label: 'Estorno' },
};

const saqueStatus: Record<Saque['status'], { label: string; color: string }> = {
  solicitado: { label: 'Solicitado', color: '#F59E0B' },
  pago: { label: 'Pago', color: '#16A34A' },
  recusado: { label: 'Recusado', color: '#DC2626' },
};

export default function WalletScreen() {
  const { motoboy } = useAuth();
  const saldo = useSaldo();
  const extrato = useExtrato();
  const saques = useSaques();
  const solicitar = useSolicitarSaque();

  const [modalVisible, setModalVisible] = useState(false);
  const [valor, setValor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSolicitar = async () => {
    const numero = Number(valor.replace(',', '.'));
    if (!numero || numero <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor válido para o saque.');
      return;
    }
    setSubmitting(true);
    try {
      await solicitar.mutateAsync(numero);
      setModalVisible(false);
      setValor('');
      Alert.alert(
        'Saque solicitado',
        'O pedido de saque foi enviado para a central da cooperativa.',
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshing = saldo.isFetching || extrato.isFetching;

  type WalletItem =
    | { kind: 'ledger'; entry: LedgerEntry }
    | { kind: 'saque'; saque: Saque };

  const data: WalletItem[] = [
    ...(extrato.data ?? []).map((entry) => ({ kind: 'ledger' as const, entry })),
    ...(saques.data ?? []).map((saque) => ({ kind: 'saque' as const, saque })),
  ];

  const renderEntry = ({ item }: { item: WalletItem }) => {
    if (item.kind === 'saque') {
      const st = saqueStatus[item.saque.status];
      return (
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${st.color}1A` }]}>
            <MaterialIcons name="arrow-downward" size={18} color={st.color} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Saque — {st.label}</Text>
            <Text style={styles.rowDate}>{formatDateOnly(item.saque.dt_solicitacao)}</Text>
          </View>
          <Text style={[styles.rowValue, { color: Colors.danger }]}>
            −{formatCurrency(item.saque.valor)}
          </Text>
        </View>
      );
    }
    const e = item.entry;
    const info = tipoInfo[e.tipo] ?? tipoInfo.ajuste;
    const positivo = e.tipo === 'comissao' || e.tipo === 'ajuste' || e.tipo === 'estorno';
    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${info.color}1A` }]}>
          <MaterialIcons name={info.icon as never} size={18} color={info.color} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{info.label}</Text>
          <Text style={styles.rowDate}>
            {formatDateOnly(e.dt_lancamento)}
            {e.descricao ? ` · ${e.descricao}` : ''}
          </Text>
        </View>
        <Text style={[styles.rowValue, { color: positivo ? Colors.primary : Colors.danger }]}>
          {positivo ? '+' : '−'}
          {formatCurrency(e.valor)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira</Text>
        <Text style={styles.subtitle}>Seus ganhos e saques da CoopExpress.</Text>
      </View>

      {saldo.isLoading ? (
        <Loading />
      ) : (
        <>
          <View style={styles.saldoCard}>
            <Text style={styles.saldoLabel}>Saldo disponível</Text>
            <Text style={styles.saldoValue}>
              {formatCurrency(saldo.data?.saldo)}
            </Text>
            <View style={styles.saldoStats}>
              <View style={styles.saldoStat}>
                <Text style={styles.saldoStatValue}>{saldo.data?.entregues ?? 0}</Text>
                <Text style={styles.saldoStatLabel}>Entregues</Text>
              </View>
              <View style={styles.saldoStat}>
                <Text style={styles.saldoStatValue}>{saldo.data?.em_andamento ?? 0}</Text>
                <Text style={styles.saldoStatLabel}>Em andamento</Text>
              </View>
              <Button
                label="Solicitar saque"
                variant="secondary"
                textColor={Colors.primary}
                style={styles.saqueButton}
                onPress={() => setModalVisible(true)}
              />
            </View>
          </View>

          {extrato.isLoading ? (
            <Loading />
          ) : data.length ? (
            <FlatList
              data={data}
              keyExtractor={(item) =>
                item.kind === 'ledger'
                  ? `l-${item.entry.id}`
                  : `s-${item.saque.id}`
              }
              renderItem={renderEntry}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    void saldo.refetch();
                    void extrato.refetch();
                    void saques.refetch();
                  }}
                />
              }
            />
          ) : (
            <EmptyState
              title="Nenhum lançamento"
              subtitle="Quando você concluir entregas, a comissão aparece aqui."
            />
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Solicitar saque</Text>
            <Text style={styles.modalSubtitle}>
              O valor será enviado para a chave PIX cadastrada.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={valor}
              onChangeText={setValor}
            />
            <Text style={styles.pixHint}>
              Chave PIX: {motoboy?.codigo_pix ?? 'não cadastrada'}
            </Text>
            <View style={styles.modalActions}>
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              />
              <Button
                label="Confirmar saque"
                loading={submitting}
                disabled={!motoboy?.codigo_pix}
                onPress={onSolicitar}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  saldoCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  saldoLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: Fonts.semibold,
  },
  saldoValue: {
    fontSize: 34,
    fontWeight: Fonts.bold,
    color: Colors.white,
    marginVertical: Spacing.xs,
  },
  saldoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  saldoStat: {
    flex: 1,
  },
  saldoStatValue: {
    fontSize: 18,
    fontWeight: Fonts.bold,
    color: Colors.white,
  },
  saldoStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  saqueButton: {
    flex: 1.4,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    height: 44,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: Fonts.semibold,
    color: Colors.text,
  },
  rowDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: Fonts.bold,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 22,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  pixHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
