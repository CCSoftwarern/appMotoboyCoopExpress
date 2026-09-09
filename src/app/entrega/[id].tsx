import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { ProvaEntregaModal, ProvaResult } from '@/components/prova-entrega-modal';
import { RecusarModal } from '@/components/recusar-modal';
import { Badge, Button, Card, LabelValue, Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import {
  useAceitarEntrega,
  useEntrega,
  useRecusarEntrega,
} from '@/hooks/useCorridas';
import { finalizarEntrega, uploadProva } from '@/lib/api';
import { formatCurrency, formatDate, statusEntrega } from '@/lib/format';
import { Colors, Fonts, Spacing } from '@/theme';

export default function EntregaDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { client } = useAuth();

  const { data: entrega, isLoading, error } = useEntrega(id);

  const aceitar = useAceitarEntrega();
  const [aceitando, setAceitando] = useState(false);
  const recusar = useRecusarEntrega();
  const [recusando, setRecusando] = useState(false);
  const [recusarVisible, setRecusarVisible] = useState(false);

  const [provaVisible, setProvaVisible] = useState(false);
  const [provaSubmitting, setProvaSubmitting] = useState(false);

  if (isLoading || !entrega) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>
              Não foi possível carregar a entrega.
            </Text>
            <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
          </View>
        ) : (
          <Loading />
        )}
      </SafeAreaView>
    );
  }

  const status = statusEntrega(entrega.status);
  const statusAtivo = entrega.status === 'S' || entrega.status === 'P';
  const finalizada = entrega.status === 'F';
  const solicitada = entrega.status === 'S';

  const navegar = (endereco: string | null) => {
    if (!endereco) {
      Alert.alert('Endereço não informado');
      return;
    }
    Alert.alert('Navegação', 'Escolha o aplicativo de navegação', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Google Maps',
        onPress: () =>
          void Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`,
          ),
      },
      {
        text: 'Waze',
        onPress: () =>
          void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(endereco)}`),
      },
    ]);
  };

  const onAceitar = async () => {
    setAceitando(true);
    try {
      await aceitar(id);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setAceitando(false);
    }
  };

  const onRecusar = async (motivo: string) => {
    setRecusando(true);
    try {
      await recusar(id, motivo);
      setRecusarVisible(false);
      router.back();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setRecusando(false);
    }
  };

  const onConfirmarProva = async (result: ProvaResult) => {
    if (!client || !result.arquivoUri) return;
    setProvaSubmitting(true);
    try {
      const publicUrl = await uploadProva(client, id, result.tipo, result.arquivoUri);
      await finalizarEntrega(client, {
        id,
        tipo: result.tipo,
        arquivoUrl: publicUrl,
        nomeRecebedor: result.nomeRecebedor,
        lat: result.lat,
        lng: result.lng,
      });
      setProvaVisible(false);
      await queryClient.invalidateQueries({ queryKey: ['entregas'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Entrega concluída', 'Comissão creditada na sua carteira.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setProvaSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <MaterialIcons name="arrow-back" size={24} color={Colors.text} onPress={() => router.back()} />
        <Text style={styles.topBarTitle}>
          {entrega.cod_transacao ? `Entrega ${entrega.cod_transacao}` : `Entrega #${entrega.id}`}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Badge label={status.label} color={status.color} />
          {statusAtivo ? <Text style={styles.inProgress}>Em andamento</Text> : null}
        </View>

        <Card>
          <Text style={styles.cardLabel}>Cliente</Text>
          <LabelValue label="Nome" value={entrega.cliente_nome ?? '—'} />
          <LabelValue label="Telefone" value={entrega.cliente_telefone ?? '—'} />
          <LabelValue label="Endereço de cadastro" value={entrega.cliente_endereco ?? '—'} />

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>Operador</Text>
          <Text style={styles.operadorNome}>{entrega.operador_nome ?? '—'}</Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Retirada</Text>
          <View style={styles.addressRow}>
            <MaterialIcons name="call-made" size={18} color={Colors.primary} />
            <Text style={styles.address}>{entrega.endereco_retirada ?? '—'}</Text>
          </View>
          {statusAtivo && !finalizada ? (
            <Button
              label="Navegar até a retirada"
              variant="outline"
              style={styles.navButton}
              onPress={() => navegar(entrega.endereco_retirada)}
            />
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>Entrega</Text>
          <View style={styles.addressRow}>
            <MaterialIcons name="place" size={18} color={Colors.danger} />
            <Text style={styles.address}>
              {entrega.endereco_entrega ?? '—'}
              {entrega.bairro_entrega ? `\nBairro: ${entrega.bairro_entrega}` : ''}
            </Text>
          </View>
          {statusAtivo && !finalizada ? (
            <Button
              label="Navegar até a entrega"
              variant="outline"
              style={styles.navButton}
              onPress={() => navegar(entrega.endereco_entrega)}
            />
          ) : null}

          {entrega.descricao ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>Descrição</Text>
              <Text style={styles.descricao}>{entrega.descricao}</Text>
            </>
          ) : null}

          {entrega.anotacao ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>Anotações</Text>
              <Text style={styles.descricao}>{entrega.anotacao}</Text>
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Valor da corrida</Text>
          <Text style={styles.valor}>{formatCurrency(entrega.vr_calculado)}</Text>
          {entrega.distancia_txt ? (
            <Text style={styles.distancia}>{entrega.distancia_txt}</Text>
          ) : null}

          <View style={styles.divider} />

          <LabelValue label="Cadastro" value={formatDate(entrega.dt_cadastro)} />
          <LabelValue label="Saída" value={formatDate(entrega.dt_saida)} />
          <LabelValue label="Entrega" value={formatDate(entrega.dt_entrega)} />

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>Forma de pagamento</Text>
          <Text style={styles.pagamento}>{entrega.forma_pagamento ?? '—'}</Text>
        </Card>

        {finalizada && entrega.assinatura_url ? (
          <Card>
            <Text style={styles.cardLabel}>Comprovante</Text>
            <View style={styles.proofRow}>
              <MaterialIcons name="verified" size={18} color={Colors.primary} />
              <Text style={styles.proofText}>Comprovante registrado</Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.actions}>
          {solicitada ? (
            <>
              <Button label="Aceitar corrida" loading={aceitando} onPress={onAceitar} />
              <Button
                label="Recusar / Devolver"
                variant="danger"
                onPress={() => setRecusarVisible(true)}
              />
            </>
          ) : null}

          {entrega.status === 'P' ? (
            <Button
              label="Concluir entrega"
              onPress={() => setProvaVisible(true)}
            />
          ) : null}
        </View>
      </ScrollView>

      <RecusarModal
        visible={recusarVisible}
        onClose={() => setRecusarVisible(false)}
        onSubmit={onRecusar}
        submitting={recusando}
      />

      <ProvaEntregaModal
        visible={provaVisible}
        onClose={() => setProvaVisible(false)}
        onSubmit={onConfirmarProva}
        submitting={provaSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  topBarSpacer: {
    width: 24,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  inProgress: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: Fonts.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  descricao: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  address: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  operadorNome: {
    fontSize: 15,
    fontWeight: Fonts.semibold,
    color: Colors.text,
  },
  pagamento: {
    fontSize: 16,
    fontWeight: Fonts.bold,
    color: Colors.primary,
  },
  navButton: {
    height: 42,
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  valor: {
    fontSize: 28,
    fontWeight: Fonts.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  distancia: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  proofText: {
    fontSize: 14,
    color: Colors.text,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
