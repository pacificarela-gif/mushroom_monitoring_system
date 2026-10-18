import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { statusLabel } from '../lib/status';
import { palette } from '../theme/palette';
import { useScale } from '../theme/scale';
import { cardShadow, useTheme } from '../theme/useTheme';

const ICONS = {
  co2: 'cloud-outline',
  humidity: 'water-outline',
  temperature: 'thermometer-outline',
  climate: 'leaf-outline',
};

export default function MetricCard({
  title,
  value,
  unit,
  status = 'good',
  subtitle,
  icon = 'co2',
  action,
  manual = false,
}) {
  const t = useTheme();
  const { dp, sp } = useScale();
  const color = status === 'bad' ? palette.bad : status === 'warn' ? palette.warn : palette.good;
  const iconSize = dp(18);

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderRadius: dp(20), padding: dp(14) }, cardShadow(t.isDark)]}>
      <View style={styles.top}>
        <View style={[styles.iconBox, { backgroundColor: t.mint, width: dp(32), height: dp(32), borderRadius: dp(10) }]}>
          <Ionicons name={ICONS[icon] || 'ellipse-outline'} size={iconSize} color={palette.forestGreen} />
        </View>
        <Text style={[styles.title, { color: t.sub, fontSize: sp(13) }]}>{title}</Text>
      </View>
      <View style={[styles.valueRow, { marginTop: dp(12) }]}>
        <Text style={[styles.value, { color: t.text, fontSize: sp(28) }]}>{value ?? '--'}</Text>
        {!!unit && <Text style={[styles.unit, { color: t.sub, fontSize: sp(13) }]}>{unit}</Text>}
      </View>
      {!!subtitle && (
        <Text style={{ color: t.sub, marginTop: dp(4), fontSize: sp(11), lineHeight: sp(15) }} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
      {!!action && (
        <View style={[styles.actionRow, { marginTop: dp(8) }]}>
          <Ionicons
            name={manual ? 'warning' : 'pulse'}
            size={dp(14)}
            color={manual ? palette.bad : color}
          />
          <Text style={{ color: manual ? palette.bad : color, fontSize: sp(12), fontWeight: '800', flex: 1 }}>
            {action}
          </Text>
        </View>
      )}
      <Text style={{ marginTop: dp(6), fontSize: sp(12), fontWeight: '800', color }}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  value: { fontWeight: '800', letterSpacing: -0.6 },
  unit: { fontWeight: '600', marginBottom: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
