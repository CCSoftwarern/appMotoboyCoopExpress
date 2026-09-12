import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Badge } from '@/components/ui';
import { formatCurrency, statusEntrega } from '@/lib/format';
import { Entrega } from '@/lib/types';
import { Colors, Fonts, Radius, Spacing } from '@/theme';

interface Props {
  entrega: Entrega;
  onPress?: () => void;
  onPressIn?: () => void;
  onHoverIn?: () => void;
  highlight?: boolean;
}

export function DeliveryCard({ entrega, onPress, onPressIn, onHoverIn, highlight }: Props) {
  const status = statusEntrega(entrega.status);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onHoverIn={onHoverIn as never}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.cardHighlight,
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {entrega.cod_transacao
              ? `Entrega ${entrega.cod_transacao}`
              : `Entrega #${entrega.id}`}
          </Text>
          <Badge label={status.label} color={status.color} />
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeItem}>
          <MaterialIcons name="call-made" size={18} color={Colors.primary} />
          <Text style={styles.routeText} numberOfLines={2}>
            {entrega.endereco_retirada ?? 'Origem não informada'}
          </Text>
        </View>
        <View style={styles.routeItem}>
          <MaterialIcons name="place" size={18} color={Colors.danger} />
          <Text style={styles.routeText} numberOfLines={2}>
            {entrega.endereco_entrega ?? 'Destino não informado'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.distance} numberOfLines={1}>
          {entrega.distancia_txt ?? (entrega.distancia ? `${entrega.distancia} m` : '')}
        </Text>
        <Text style={styles.value}>{formatCurrency(entrega.vr_calculado)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHighlight: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.9,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: Fonts.bold,
    color: Colors.text,
    flexShrink: 1,
  },
  route: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  distance: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  value: {
    fontSize: 16,
    fontWeight: Fonts.bold,
    color: Colors.primary,
  },
});
