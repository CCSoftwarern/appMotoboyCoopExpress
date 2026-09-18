import { useRef, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

import SignaturePad, { SignaturePadHandle } from '@/components/signature-pad';
import { Button } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

export interface ProvaResult {
  tipo: 'assinatura' | 'foto' | 'sem_prova';
  arquivoUri: string | null;
  nomeRecebedor: string | null;
  lat: number | null;
  lng: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (result: ProvaResult) => void;
  submitting?: boolean;
}

export function ProvaEntregaModal({ visible, onClose, onSubmit, submitting }: Props) {
  const [modo, setModo] = useState<'assinatura' | 'foto' | 'sem_prova'>('assinatura');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const signatureRef = useRef<SignaturePadHandle>(null);

  const reset = () => {
    setModo('assinatura');
    setFotoUri(null);
    setNome('');
    signatureRef.current?.clear();
    onClose();
  };

  const pickFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      // Permissão de câmera negada; tenta a galeria
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) return;
    }
    const result = perm.granted
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
      setModo('foto');
    }
  };

  const confirmar = async () => {
    let uri: string | null = null;
    if (modo === 'assinatura') {
      uri = await signatureRef.current?.getSignature() ?? null;
      // agora opcional: se não houver assinatura, permite sem_prova
      if (!uri) {
        // trata como sem_prova se usuário não desenhou
        onSubmitSemProva();
        return;
      }
    } else if (modo === 'foto' && fotoUri) {
      uri = fotoUri;
    } else if (modo === 'sem_prova') {
      uri = null;
    }

    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch {
      // sem permissão/localização — segue sem georreferência
    }

    onSubmit({
      tipo: modo === 'sem_prova' ? 'sem_prova' : modo,
      arquivoUri: uri,
      nomeRecebedor: nome.trim() || null,
      lat,
      lng,
    });
  };

  const onSubmitSemProva = async () => {
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch {}
    onSubmit({
      tipo: 'sem_prova',
      arquivoUri: null,
      nomeRecebedor: nome.trim() || null,
      lat,
      lng,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={reset}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Prova de entrega</Text>
            <MaterialIcons name="check-circle" size={22} color={Colors.primary} />
          </View>

          <View style={styles.segment}>
            <View
              style={[
                styles.segmentItem,
                modo === 'assinatura' && styles.segmentItemActive,
              ]}>
              <Text
                style={[
                  styles.segmentLabel,
                  modo === 'assinatura' && styles.segmentLabelActive,
                ]}>
                Assinatura
              </Text>
              <Button
                label="Usar assinatura"
                variant={modo === 'assinatura' ? 'primary' : 'ghost'}
                onPress={() => setModo('assinatura')}
                style={styles.segmentButton}
              />
            </View>
            <View style={[styles.segmentItem, modo === 'foto' && styles.segmentItemActive]}>
              <Text
                style={[styles.segmentLabel, modo === 'foto' && styles.segmentLabelActive]}>
                Foto
              </Text>
              <Button
                label={fotoUri ? 'Trocar foto' : 'Tirar foto'}
                variant={modo === 'foto' ? 'primary' : 'ghost'}
                onPress={pickFoto}
                style={styles.segmentButton}
              />
            </View>
            <View style={[styles.segmentItem, modo === 'sem_prova' && styles.segmentItemActive]}>
              <Text
                style={[styles.segmentLabel, modo === 'sem_prova' && styles.segmentLabelActive]}>
                Sem prova
              </Text>
              <Button
                label="Sem prova"
                variant={modo === 'sem_prova' ? 'primary' : 'ghost'}
                onPress={() => setModo('sem_prova')}
                style={styles.segmentButton}
              />
            </View>
          </View>

          {modo === 'assinatura' ? (
            <View style={styles.sigArea}>
              <SignaturePad ref={signatureRef} height={260} />
              <Button
                label="Limpar assinatura"
                variant="ghost"
                onPress={() => signatureRef.current?.clear()}
              />
            </View>
          ) : modo === 'foto' ? (
            <View style={styles.fotoArea}>
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <MaterialIcons name="camera-alt" size={40} color={Colors.textMuted} />
                  <Text style={styles.fotoHint}>Tire uma foto do destinatário/pacote</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fotoPlaceholder}>
              <MaterialIcons name="check" size={40} color={Colors.primary} />
              <Text style={styles.fotoHint}>Entrega será finalizada sem assinatura/foto</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Nome de quem recebeu (opcional)"
            placeholderTextColor={Colors.textMuted}
            value={nome}
            onChangeText={setNome}
            maxLength={120}
          />

          <View style={styles.actions}>
            <Button label="Cancelar" variant="ghost" onPress={reset} disabled={submitting} />
            <Button
              label={modo === 'sem_prova' ? 'Finalizar sem prova' : 'Confirmar entrega'}
              loading={submitting}
              disabled={modo === 'foto' && !fotoUri}
              onPress={confirmar}
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
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: Fonts.bold,
    color: Colors.text,
  },
  segment: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  segmentItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: Fonts.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  segmentLabelActive: {
    color: Colors.primaryDark,
  },
  segmentButton: {
    height: 40,
  },
  sigArea: {
    gap: Spacing.xs,
  },
  fotoArea: {
    alignItems: 'center',
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
  },
  fotoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  fotoHint: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
