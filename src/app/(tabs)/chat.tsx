import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useChat, useEnviarMensagem, useMarcarLidas } from '@/hooks/useChat';
import { formatDate } from '@/lib/format';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

export default function ChatScreen() {
  const chat = useChat();
  const enviar = useEnviarMensagem();
  const marcarLidas = useMarcarLidas();

  const [mensagem, setMensagem] = useState('');
  const listRef = useRef<FlatList>(null);

  const mensagens = useMemo(() => chat.data ?? [], [chat.data]);

  useEffect(() => {
    if (mensagens.some((m) => m.remetente === 'despacho' && !m.lida)) {
      void marcarLidas();
    }
  }, [mensagens, marcarLidas]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [mensagens.length]);

  const onEnviar = async () => {
    const texto = mensagem.trim();
    if (!texto) return;
    try {
      await enviar.mutateAsync(texto);
      setMensagem('');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Central de despacho — atendimento em tempo real.</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialIcons name="support-agent" size={22} color={Colors.primary} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={mensagens}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="chat" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma mensagem</Text>
              <Text style={styles.emptySubtitle}>
                Mande uma mensagem para a central de despacho.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.remetente === 'motoboy';
            return (
              <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.mensagem}</Text>
                  <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                    {formatDate(item.dt_envio)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={Colors.textMuted}
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            maxLength={500}
          />
          <View style={styles.sendButton}>
            <MaterialIcons
              name="send"
              size={24}
              color={Colors.white}
              onPress={onEnviar}
              suppressHighlighting
            />
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Fonts.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  bubbleTheirs: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Radius.sm,
  },
  msgText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  msgTextMine: {
    color: Colors.white,
  },
  msgTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
