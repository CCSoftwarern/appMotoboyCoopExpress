import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button, Input } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/theme';
import { cadastrarMotoboy } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

export default function CadastroScreen() {
  const { motoboy, signIn } = useAuth();
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  // se já logado, não deveria estar aqui (guard do _layout já protege)
  if (motoboy) {
    router.replace('/(tabs)');
    return null;
  }

  const onSubmit = async () => {
    const nomeTrim = nome.trim();
    const celTrim = celular.trim();
    const emailTrim = email.trim().toLowerCase();

    if (!nomeTrim) {
      Alert.alert('Campo obrigatório', 'Informe seu nome completo.');
      return;
    }
    if (!celTrim && !emailTrim) {
      Alert.alert('Campo obrigatório', 'Informe celular ou e-mail.');
      return;
    }
    if (emailTrim && !/^\S+@\S+\.\S+$/.test(emailTrim)) {
      Alert.alert('E-mail inválido', 'Verifique o e-mail digitado.');
      return;
    }
    if (celTrim) {
      const digits = celTrim.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        Alert.alert('Celular inválido', 'Use DDD + número (ex: (84) 99171-2945).');
        return;
      }
    }
    if (!senha || senha.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      Alert.alert('Senhas diferentes', 'A confirmação não confere com a senha.');
      return;
    }

    setLoading(true);
    try {
      await cadastrarMotoboy({
        nome: nomeTrim,
        celular: celTrim || undefined,
        email: emailTrim || undefined,
        senha,
      });

      // login automático via AuthProvider (garante que o estado in-memory seja atualizado)
      const loginIdent = celTrim || emailTrim;
      await signIn(loginIdent, senha);

      Alert.alert('Conta criada!', 'Bem-vindo à CoopExpress.');
      // AppGate já redireciona para (tabs) quando motoboy !== null; fallback:
      setTimeout(() => router.replace('/(tabs)' as any), 500);
    } catch (e) {
      Alert.alert(
        'Não foi possível criar a conta',
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
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Cadastre-se como motoboy da CoopExpress</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nome completo *"
              placeholder="Ex: João da Silva"
              autoCapitalize="words"
              value={nome}
              onChangeText={setNome}
              returnKeyType="next"
            />
            <Input
              label="Celular *"
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
              value={celular}
              onChangeText={setCelular}
              returnKeyType="next"
            />
            <Input
              label="E-mail"
              placeholder="email@exemplo.com (opcional se informou celular)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
            <Input
              label="Senha *"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              returnKeyType="next"
            />
            <Input
              label="Confirmar senha *"
              placeholder="Repita a senha"
              secureTextEntry
              value={confirmar}
              onChangeText={setConfirmar}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            <Button
              label="Criar conta"
              onPress={onSubmit}
              loading={loading}
              style={styles.submit}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Já tem conta? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Entrar</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.lg, paddingTop: Spacing.md },
  header: { marginBottom: Spacing.lg },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 24, fontWeight: Fonts.bold, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  form: { gap: Spacing.xs },
  submit: { marginTop: Spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: Fonts.bold, color: Colors.primary },
});
