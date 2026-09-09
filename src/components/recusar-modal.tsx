import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (motivo: string) => void;
  submitting?: boolean;
}

export function RecusarModal({ visible, onClose, onSubmit, submitting }: Props) {
  const [motivo, setMotivo] = useState('');

  const reset = () => {
    setMotivo('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={reset}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Devolver corrida</Text>
          <Text style={styles.subtitle}>
            A corrida voltará para a fila como “Solicitada” com a observação abaixo.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Motivo da devolução (ex.: cliente não atendeu, endereço errado)"
            placeholderTextColor={Colors.textMuted}
            multiline
            value={motivo}
            onChangeText={setMotivo}
            maxLength={300}
          />
          <View style={styles.actions}>
            <Button label="Cancelar" variant="ghost" onPress={reset} disabled={submitting} />
            <Button
              label="Confirmar devolução"
              variant="danger"
              loading={submitting}
              disabled={!motivo.trim()}
              onPress={() => onSubmit(motivo.trim())}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
