import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { apiGet, apiPut, devicePath } from '../lib/api';
import { loadAlertPrefs, saveAlertPrefs } from '../lib/alertPrefs';
import { configureAlertChannels, criticalChannelId, playAlertSound } from '../lib/alertSounds';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';
import { palette } from '../theme/palette';
import { useScale } from '../theme/scale';
import { cardShadow, useTheme } from '../theme/useTheme';

function Choice({ label, selected, onPress, t, sp }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? palette.forestDeep : t.bg,
          borderColor: selected ? palette.forestDeep : t.border,
        },
      ]}
    >
      <Text style={{ color: selected ? 'white' : t.text, fontWeight: '800', fontSize: sp(12) }}>{label}</Text>
    </Pressable>
  );
}

export default function AlertSettingsCard({ deviceId }) {
  const t = useTheme();
  const { dp, sp } = useScale();
  const [prefs, setPrefs] = useState(null);
  const [email, setEmail] = useState('');
  const [emailOn, setEmailOn] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    loadAlertPrefs().then(setPrefs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!deviceId) return undefined;
    let live = true;
    apiGet(devicePath(deviceId, 'notify'))
      .then((v) => {
        if (!live || !v) return;
        setEmail(typeof v.email === 'string' ? v.email : '');
        setEmailOn(v.enabled === true);
        setSmtpConfigured(v.smtpConfigured === true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [deviceId]);

  async function updatePrefs(patch) {
    const next = await saveAlertPrefs({ ...prefs, ...patch });
    setPrefs(next);
    await configureAlertChannels();
    if (deviceId) {
      await registerForPushNotificationsAsync(deviceId, criticalChannelId(next)).catch(() => {});
    }
    return next;
  }

  async function saveEmail() {
    const trimmed = email.trim();
    if (emailOn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Email alerts', 'Enter a valid address, or turn email alerts off.');
      return;
    }
    setSavingEmail(true);
    try {
      const saved = await apiPut(devicePath(deviceId, 'notify'), { email: trimmed, enabled: emailOn });
      setSmtpConfigured(saved?.smtpConfigured === true);
      Alert.alert(
        'Email alerts saved',
        saved?.smtpConfigured
          ? 'The server will email this address after 10 minutes outside the target range.'
          : 'Saved on the server. SMTP is not configured yet, so messages will not send until SMTP_HOST and SMTP_FROM are set.'
      );
    } catch (e) {
      Alert.alert('Save failed', String(e?.message || e));
    } finally {
      setSavingEmail(false);
    }
  }

  if (!prefs) return null;

  return (
    <View style={{ gap: dp(12) }}>
      <Text style={{ color: t.text, fontSize: sp(18), fontWeight: '800' }}>Alert sounds</Text>
      <View style={[styles.card, { backgroundColor: t.surface, padding: dp(14), borderRadius: dp(20), gap: dp(10) }, cardShadow(t.isDark)]}>
        <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800' }}>Warning sound</Text>
        <Text style={{ color: t.sub, fontSize: sp(12) }}>Plays when a reading moves near the edge of its target range.</Text>
        <View style={styles.choices}>
          <Choice label="Chime" selected={prefs.warningSound === 'chime'} onPress={() => updatePrefs({ warningSound: 'chime' })} t={t} sp={sp} />
          <Choice label="Off" selected={prefs.warningSound === 'off'} onPress={() => updatePrefs({ warningSound: 'off' })} t={t} sp={sp} />
          <Pressable onPress={() => playAlertSound('warning', { ...prefs, warningSound: 'chime', overrideSilent: false })} style={[styles.choice, { borderColor: t.border }]}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: sp(12) }}>Preview</Text>
          </Pressable>
        </View>

        <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800', marginTop: dp(6) }}>Critical sound</Text>
        <Text style={{ color: t.sub, fontSize: sp(12) }}>Plays when temperature, humidity, or CO₂ leaves the target range.</Text>
        <View style={styles.choices}>
          <Choice label="Alarm" selected={prefs.criticalSound === 'alarm'} onPress={() => updatePrefs({ criticalSound: 'alarm' })} t={t} sp={sp} />
          <Choice label="Off" selected={prefs.criticalSound === 'off'} onPress={() => updatePrefs({ criticalSound: 'off' })} t={t} sp={sp} />
          <Pressable
            onPress={() => playAlertSound('critical', { ...prefs, criticalSound: 'alarm', overrideSilent: false })}
            style={[styles.choice, { borderColor: t.border }]}
          >
            <Text style={{ color: t.text, fontWeight: '800', fontSize: sp(12) }}>Preview</Text>
          </Pressable>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800' }}>Override silent mode</Text>
            <Text style={{ color: t.sub, fontSize: sp(12), marginTop: 2 }}>
              Critical alerts use the alarm channel and can sound while the phone is muted. On Android, allow this app to bypass Do Not Disturb.
            </Text>
          </View>
          <Switch
            value={prefs.overrideSilent}
            onValueChange={(v) => updatePrefs({ overrideSilent: v })}
            thumbColor={palette.forestGreen}
          />
        </View>
      </View>

      <Text style={{ color: t.text, fontSize: sp(18), fontWeight: '800' }}>Email alerts</Text>
      <View style={[styles.card, { backgroundColor: t.surface, padding: dp(14), borderRadius: dp(20), gap: dp(8) }, cardShadow(t.isDark)]}>
        <View style={styles.switchRow}>
          <Text style={{ color: t.text, fontSize: sp(14), fontWeight: '800', flex: 1 }}>
            Email after 10 minutes out of range
          </Text>
          <Switch value={emailOn} onValueChange={setEmailOn} thumbColor={palette.forestGreen} />
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="grower@example.com"
          placeholderTextColor={t.placeholder}
          style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg, fontSize: sp(15) }]}
        />
        {!smtpConfigured ? (
          <Text style={{ color: t.sub, fontSize: sp(12) }}>
            The API process also needs SMTP_HOST and SMTP_FROM before mail can leave the server.
          </Text>
        ) : null}
        <Pressable onPress={saveEmail} disabled={savingEmail} style={[styles.save, { opacity: savingEmail ? 0.6 : 1 }]}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: sp(14) }}>
            {savingEmail ? 'Saving…' : 'Save email alerts'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '600',
  },
  save: {
    backgroundColor: palette.forestGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
});
