import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nursery.alertPrefs.v1';

export const DEFAULT_ALERT_PREFS = {
  warningSound: 'chime',
  criticalSound: 'alarm',
  overrideSilent: false,
};

export async function loadAlertPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ALERT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      warningSound: parsed?.warningSound === 'off' ? 'off' : 'chime',
      criticalSound: parsed?.criticalSound === 'off' ? 'off' : 'alarm',
      overrideSilent: parsed?.overrideSilent === true,
    };
  } catch {
    return { ...DEFAULT_ALERT_PREFS };
  }
}

export async function saveAlertPrefs(prefs) {
  const next = {
    warningSound: prefs.warningSound === 'off' ? 'off' : 'chime',
    criticalSound: prefs.criticalSound === 'off' ? 'off' : 'alarm',
    overrideSilent: prefs.overrideSilent === true,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
