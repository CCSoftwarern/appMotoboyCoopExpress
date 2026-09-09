import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfileScreen() {
  const { motoboy, signOut } = useAuth();

  const onLogout = () => {
    Alert.alert('Sair do aplicativo', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
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
});
