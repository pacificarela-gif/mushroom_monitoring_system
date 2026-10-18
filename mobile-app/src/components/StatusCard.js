import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/palette';
import { useScale } from '../theme/scale';
import { cardShadow, useTheme } from '../theme/useTheme';

export default function StatusCard({ online, lastSeenText, allGood, anyBad, detail }) {
  const t = useTheme();
  const { dp, sp } = useScale();
  const bg = online ? palette.forestBanner : t.isDark ? '#3A1A1A' : '#5C2A2A';
  const title = online ? 'System Online' : 'System Offline';
  const subtitle = !online
    ? lastSeenText
    : detail
      ? detail
      : anyBad
        ? 'Some conditions need attention'
        : allGood
          ? 'All conditions are normal'
          : 'Conditions are close to the target range';

  return (
    <View style={[styles.card, { backgroundColor: bg, borderRadius: dp(18), paddingVertical: dp(14), paddingHorizontal: dp(14), gap: dp(12) }]}>
      <View style={[styles.iconWrap, { width: dp(36), height: dp(36), borderRadius: dp(18) }]}>
        <Ionicons name={online ? 'wifi' : 'cloud-offline'} size={dp(18)} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontSize: sp(16), fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: sp(12), marginTop: 2, lineHeight: sp(16) }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name={online ? 'radio' : 'alert-circle'} size={dp(18)} color="rgba(255,255,255,0.85)" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    ...cardShadow(false),
  },
  iconWrap: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
