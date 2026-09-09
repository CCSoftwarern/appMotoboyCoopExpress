import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { Colors, Fonts, Radius, Spacing } from '@/theme';
import { getExpoPushTokenDebug, registerPushTokenNow } from '@/hooks/usePush';

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfileScreen() {
  const { motoboy, signOut, client } = useAuth();
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  const onLogout = () => {
    Alert.alert('Sair do aplicativo', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const onTestPush = async () => {
    if (!client) {
      Alert.alert('Não autenticado', 'Faça login novamente.');
      return;
    }
    setPushLoading(true);
    try {
      const dbg = await getExpoPushTokenDebug();
      if (!dbg.token) {
        setPushStatus(`Falha: ${dbg.reason}`);
        Alert.alert('Push — diagnóstico', dbg.reason);
        return;
      }
      const res = await registerPushTokenNow(client);
      if (res.ok) {
        setPushStatus(`OK: ${res.token?.slice(0, 30)}...`);
        Alert.alert('Push sincronizado', `Token salvo no banco:\n${res.token}`);
      } else {
        setPushStatus(`Erro RPC: ${res.reason}`);
        Alert.alert('Falha ao salvar', res.reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPushStatus(`Erro: ${msg}`);
      Alert.alert('Erro', msg);
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          {motoboy?.foto ? null : (
            <Text style={styles.avatarText}>{initials(motoboy?.nome ?? 'M')}</Text>
          )}
        </View>
        <Text style={styles.nome}>{motoboy?.nome ?? 'Motoboy'}</Text>
        <Text style={styles.role}>Motoboy da CoopExpress</Text>
      </View>

      <Card>
        <View style={styles.row}>
          <MaterialIcons name="phone" size={20} color={Colors.primary} />
          <Text style={styles.rowValue}>{motoboy?.celular ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <MaterialIcons name="email" size={20} color={Colors.primary} />
          <Text style={styles.rowValue}>{motoboy?.email ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <MaterialIcons name="qr-code" size={20} color={Colors.primary} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Chave PIX para saques</Text>
            <Text style={styles.rowValue}>{motoboy?.codigo_pix ?? 'Não cadastrada'}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.pushCard}>
        <View style={styles.row}>
          <MaterialIcons name="notifications-active" size={20} color={Colors.primary} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notificações push</Text>
            <Text style={styles.rowValueSmall} numberOfLines={2}>
              {pushStatus ?? 'Toque em sincronizar para testar'}
            </Text>
          </View>
        </View>
        <Button
          label="Sincronizar notificações"
          variant="outline"
          loading={pushLoading}
          onPress={onTestPush}
          style={styles.pushBtn}
        />
        <Text style={styles.pushHint}>Se negar permissão, ative em Configurações do Android.</Text>
      </Card>

      <Button
        label="Sair do aplicativo"
        variant="danger"
        style={styles.logout}
        onPress={onLogout}
      />

      <Text style={styles.version}>CoopExpress Motoboy · v1.0.0</Text>
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
  identity: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: Fonts.bold,
    color: Colors.white,
  },
  nome: {
    fontSize: 20,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  role: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: Fonts.semibold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  logout: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
  pushCard: {
    marginHorizontal: Spacing.md,
  },
  rowValueSmall: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pushBtn: {
    marginTop: Spacing.md,
  },
  pushHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
