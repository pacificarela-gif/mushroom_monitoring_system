import { useEffect, useRef } from 'react';
import { useSharedNurseryLive } from '../lib/NurseryLiveContext';
import { loadAlertPrefs } from '../lib/alertPrefs';
import { configureAlertChannels, criticalChannelId, playAlertSound } from '../lib/alertSounds';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';

function rank(status) {
  if (status === 'bad') return 2;
  if (status === 'warn') return 1;
  return 0;
}

/**
 * Plays a warning chime or a critical alarm when a reading newly crosses
 * its target band. Push registration uses the channel that matches the
 * silent-mode override setting.
 */
export default function AlertSoundHost({ deviceId }) {
  const { derived, loading } = useSharedNurseryLive();
  const prev = useRef(null);
  const prefsRef = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const prefs = await loadAlertPrefs();
      if (!live) return;
      prefsRef.current = prefs;
      await configureAlertChannels();
      if (deviceId) {
        await registerForPushNotificationsAsync(deviceId, criticalChannelId(prefs));
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [deviceId]);

  useEffect(() => {
    if (loading) return undefined;
    const next = {
      co2: derived.co2Status,
      hum: derived.humStatus,
      temp: derived.tempStatus,
    };
    const before = prev.current;
    prev.current = next;
    if (!before) return undefined;

    let kind = null;
    for (const key of ['co2', 'hum', 'temp']) {
      if (rank(next[key]) <= rank(before[key])) continue;
      kind = rank(next[key]) >= 2 ? 'critical' : kind === 'critical' ? 'critical' : 'warning';
    }
    if (!kind) return undefined;

    let cancelled = false;
    (async () => {
      const prefs = prefsRef.current || (await loadAlertPrefs());
      prefsRef.current = prefs;
      if (cancelled) return;
      await playAlertSound(kind, prefs, derived.actions?.lines?.[0]);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, derived.co2Status, derived.humStatus, derived.tempStatus]);

  return null;
}
