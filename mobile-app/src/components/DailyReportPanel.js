import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { devicePath, useApiValue } from '../lib/api';
import { shareDailyReport } from '../lib/exportReport';
import { palette } from '../theme/palette';
import { useScale } from '../theme/scale';
import { cardShadow, useTheme } from '../theme/useTheme';

function formatRuntime(ms) {
  const totalMin = Math.round((ms || 0) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatWhen(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Stat({ label, metric, t, sp }) {
  const empty = !metric || !metric.samples;
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: t.sub, fontSize: sp(11), fontWeight: '700' }}>{label}</Text>
      {empty ? (
        <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800' }}>—</Text>
      ) : (
        <>
          <Text style={{ color: t.text, fontSize: sp(13), fontWeight: '800' }}>
            {metric.min}–{metric.max} {metric.unit}
          </Text>
          <Text style={{ color: t.sub, fontSize: sp(11), fontWeight: '600' }}>
            avg {metric.avg} {metric.unit}
          </Text>
        </>
      )}
    </View>
  );
}

export default function DailyReportPanel({ deviceId }) {
  const t = useTheme();
  const { dp, sp } = useScale();
  const report = useApiValue(deviceId ? devicePath(deviceId, 'report') : null, { intervalMs: 30000 });
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState('');

  const onExport = useCallback(async (kind) => {
    setExportError('');
    setExporting(kind);
    try {
      await shareDailyReport(deviceId, kind);
    } catch (e) {
      setExportError(String(e?.message || e));
    } finally {
      setExporting(null);
    }
  }, [deviceId]);

  const data = report.value;
  const metrics = data?.metrics || {};
  const actuators = data?.actuators || {};
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <View style={{ gap: dp(12) }}>
      <Text style={{ color: t.text, fontSize: sp(18), fontWeight: '800' }}>Daily Report</Text>
      <Text style={{ color: t.sub, fontSize: sp(12), fontWeight: '600', marginTop: -6 }}>
        Last 24 hours: peaks, actuator runtime, and the event log.
      </Text>

      <View style={[styles.card, { backgroundColor: t.surface, padding: dp(14), borderRadius: dp(20) }, cardShadow(t.isDark)]}>
        {report.loading && !data ? (
          <ActivityIndicator color={palette.forestGreen} />
        ) : (
          <View style={{ flexDirection: 'row', gap: dp(10) }}>
            <Stat label="CO₂" metric={metrics.co2} t={t} sp={sp} />
            <Stat label="Humidity" metric={metrics.humidity} t={t} sp={sp} />
            <Stat label="Temperature" metric={metrics.temperature} t={t} sp={sp} />
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: t.surface, padding: dp(14), borderRadius: dp(20), gap: dp(8) }, cardShadow(t.isDark)]}>
        <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800' }}>Actuator runtime</Text>
        {['exhaust', 'intake', 'misting', 'heater'].map((id) => {
          const row = actuators[id];
          if (!row) return null;
          const pct = `${((row.dutyCycle || 0) * 100).toFixed(1)}%`;
          return (
            <View key={id} style={styles.row}>
              <Text style={{ color: t.text, fontSize: sp(13), fontWeight: '700', flex: 1 }}>{row.label}</Text>
              <Text style={{ color: t.sub, fontSize: sp(12), fontWeight: '700' }}>
                {formatRuntime(row.runtimeMs)} · {pct}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: t.surface, padding: dp(14), borderRadius: dp(20), gap: dp(8) }, cardShadow(t.isDark)]}>
        <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800' }}>Event log</Text>
        {events.length === 0 ? (
          <Text style={{ color: t.sub, fontSize: sp(12) }}>No overrides, warnings, or sensor anomalies in this window.</Text>
        ) : (
          events.slice(0, 12).map((event, i) => (
            <View key={`${event.tsMs}-${i}`} style={{ gap: 2 }}>
              <Text style={{ color: t.sub, fontSize: sp(11), fontWeight: '700' }}>
                {formatWhen(event.tsMs)} · {event.kind}
              </Text>
              <Text style={{ color: t.text, fontSize: sp(12), lineHeight: sp(16) }}>{event.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: dp(10) }}>
        <Pressable
          onPress={() => onExport('csv')}
          disabled={!!exporting}
          style={[styles.exportBtn, { borderColor: t.border, opacity: exporting ? 0.6 : 1 }]}
        >
          <Ionicons name="document-text-outline" size={dp(16)} color={t.text} />
          <Text style={{ color: t.text, fontWeight: '800', fontSize: sp(13) }}>
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onExport('pdf')}
          disabled={!!exporting}
          style={[styles.exportBtn, { backgroundColor: palette.forestGreen, borderColor: palette.forestGreen, opacity: exporting ? 0.6 : 1 }]}
        >
          <Ionicons name="download-outline" size={dp(16)} color="white" />
          <Text style={{ color: 'white', fontWeight: '800', fontSize: sp(13) }}>
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </Text>
        </Pressable>
      </View>
      {!!exportError && <Text style={{ color: palette.bad, fontSize: sp(12) }}>{exportError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
