import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!login.trim() || !senha.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe celular/e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await signIn(login, senha);
    } catch (e) {
      Alert.alert(
        'Não foi possível entrar',
        e instanceof Error ? e.message : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="two-wheeler" size={44} color={Colors.white} />
            </View>
            <Text style={styles.appName}>CoopExpress</Text>
            <Text style={styles.tagline}>
              Aplicativo do motoboy — corridas, carteira e suporte em um só lugar.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Celular ou e-mail"
              placeholder="(00) 00000-0000 ou email@exemplo.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={login}
              onChangeText={setLogin}
              returnKeyType="next"
            />
            <Input
              label="Senha"
              placeholder="Sua senha"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <Button
              label="Entrar"
              onPress={onSubmit}
              loading={loading}
              style={styles.submit}
            />
          </View>

          <View style={styles.signupWrap}>
            <Text style={styles.hint}>Novo por aqui? </Text>
            <Pressable onPress={() => router.push('/(auth)/cadastro' as any)}>
              <Text style={styles.signupLink}>Criar conta</Text>
            </Pressable>
          </View>
          <Text style={styles.hintMuted}>
            As credenciais são as mesmas do cadastro de motoboy da CoopExpress.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 28,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 300,
  },
  form: {
    gap: Spacing.xs,
  },
  submit: {
    marginTop: Spacing.sm,
  },
  signupWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: Fonts.bold,
    color: Colors.primary,
  },
  hintMuted: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
