import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MetricCard from '../components/MetricCard';
import StatusCard from '../components/StatusCard';
import { AppHeader, HeaderIcon, navigateRoot } from '../components/ui';
import { useSharedNurseryLive } from '../lib/NurseryLiveContext';
import { palette } from '../theme/palette';
import { useScale } from '../theme/scale';
import { cardShadow, useTheme } from '../theme/useTheme';

const HERO = require('../../assets/hero-mushrooms.png');

export default function HomeScreen({ deviceId, unreadCount = 0 }) {
  const t = useTheme();
  const { dp, sp, pad, columns } = useScale();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { derived, loading } = useSharedNurseryLive();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={palette.forestGreen} />
        <Text style={{ color: t.sub, marginTop: 8 }}>Loading live data…</Text>
      </View>
    );
  }

  const actions = derived.actions || { lines: [], cards: {}, overridden: [], interventions: [], anyManual: false };
  const co2Card = actions.cards?.co2 || {};
  const humCard = actions.cards?.humidity || {};
  const tempCard = actions.cards?.temperature || {};

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <AppHeader
        brand
        right={
          <>
            <HeaderIcon
              name="notifications-outline"
              badge={unreadCount > 0}
              onPress={() => navigateRoot(navigation, 'Alerts')}
            />
            <HeaderIcon name="settings-outline" onPress={() => navigation.navigate('Settings')} />
          </>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: pad, paddingBottom: dp(28) + insets.bottom, gap: dp(14) }]}
        showsVerticalScrollIndicator={false}
      >
        <StatusCard
          online={derived.online}
          lastSeenText={derived.lastSeenText}
          allGood={derived.allGood}
          anyBad={derived.anyBad}
          detail={actions.lines[0] || null}
        />

        {actions.anyManual ? (
          <View style={[styles.modeCard, { backgroundColor: t.isDark ? '#3A1A1A' : '#FDECEC', borderColor: palette.bad, borderRadius: dp(16), padding: dp(14), gap: dp(4) }]}>
            <View style={styles.modeHead}>
              <Ionicons name="warning" size={dp(18)} color={palette.bad} />
              <Text style={{ color: palette.bad, fontSize: sp(15), fontWeight: '800' }}>Manual override</Text>
            </View>
            <Text style={{ color: t.isDark ? '#F3C1C4' : '#7A2430', fontSize: sp(13), lineHeight: sp(18), fontWeight: '600' }}>
              Automatic control is blocked. {actions.overridden.join(' · ')}
            </Text>
          </View>
        ) : (
          <View style={[styles.modeCard, { backgroundColor: t.mint, borderRadius: dp(16), padding: dp(14), gap: dp(4) }]}>
            <View style={styles.modeHead}>
              <Ionicons name="sync" size={dp(18)} color={palette.forestGreen} />
              <Text style={{ color: t.text, fontSize: sp(15), fontWeight: '800' }}>Automated mode</Text>
            </View>
            <Text style={{ color: t.sub, fontSize: sp(13), lineHeight: sp(18), fontWeight: '600' }}>
              {actions.interventions.join(' · ')}
            </Text>
          </View>
        )}

        <Text style={{ color: t.text, fontSize: sp(18), fontWeight: '800', marginTop: dp(4) }}>Current Conditions</Text>
        <View style={{ gap: dp(12) }}>
          <View style={[styles.gridRow, { gap: dp(12) }]}>
            <MetricCard
              title="CO₂"
              icon="co2"
              value={derived.co2ppm != null ? derived.co2ppm.toFixed(0) : null}
              unit="ppm"
              status={derived.co2Status}
              subtitle={`Target: ${derived.co2Lo} – ${derived.co2Hi} ppm`}
              action={co2Card.action}
              manual={co2Card.manual}
            />
            <MetricCard
              title="Humidity"
              icon="humidity"
              value={derived.humPct != null ? derived.humPct.toFixed(0) : null}
              unit="%"
              status={derived.humStatus}
              subtitle={`Target: ${derived.humLo.toFixed(0)} – ${derived.humHi.toFixed(0)} %`}
              action={humCard.action}
              manual={humCard.manual}
            />
            {columns >= 3 ? (
              <MetricCard
                title="Temperature"
                icon="temperature"
                value={derived.tempC != null ? derived.tempC.toFixed(1) : null}
                unit="°C"
                status={derived.tempStatus}
                subtitle={`Target: ${derived.tempLo.toFixed(0)} – ${derived.tempHi.toFixed(0)} °C`}
                action={tempCard.action}
                manual={tempCard.manual}
              />
            ) : null}
          </View>
          {columns < 3 ? (
            <View style={[styles.gridRow, { gap: dp(12) }]}>
              <MetricCard
                title="Temperature"
                icon="temperature"
                value={derived.tempC != null ? derived.tempC.toFixed(1) : null}
                unit="°C"
                status={derived.tempStatus}
                subtitle={`Target: ${derived.tempLo.toFixed(0)} – ${derived.tempHi.toFixed(0)} °C`}
                action={tempCard.action}
                manual={tempCard.manual}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.alertPanel, { backgroundColor: t.surface, borderRadius: dp(18), padding: dp(14), gap: dp(8) }, cardShadow(t.isDark)]}>
          <Text style={{ color: t.text, fontSize: sp(15), fontWeight: '800' }}>Climate actions</Text>
          {actions.lines.length ? (
            actions.lines.map((line) => (
              <Text key={line} style={{ color: palette.bad, fontSize: sp(13), lineHeight: sp(18), fontWeight: '700' }}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={{ color: t.sub, fontSize: sp(13), lineHeight: sp(18), fontWeight: '600' }}>
              All readings are inside the target range.
            </Text>
          )}
        </View>

        <View style={[styles.trend, { backgroundColor: t.mint }]}>
          <View style={[styles.trendIcon, { backgroundColor: t.surface }]}>
            <Ionicons name="leaf" size={18} color={palette.forestGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trendTitle, { color: t.text, fontSize: sp(15) }]}>Environment Trend</Text>
            <Text style={[styles.trendSub, { color: t.sub, fontSize: sp(12), lineHeight: sp(16) }]}>
              {actions.lines[0]
                || (derived.allGood
                  ? 'Conditions are stable for the last 24 hours.'
                  : 'Readings are near the edge of the target range.')}
            </Text>
          </View>
        </View>

        <View style={[styles.heroWrap, cardShadow(t.isDark)]}>
          <Image source={HERO} style={styles.hero} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  modeCard: { borderWidth: 1, borderColor: 'transparent' },
  modeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gridRow: { flexDirection: 'row' },
  alertPanel: {},
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  trendIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: { fontSize: 15, fontWeight: '800' },
  trendSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  heroWrap: { height: 148, borderRadius: 22, overflow: 'hidden' },
  hero: { width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
