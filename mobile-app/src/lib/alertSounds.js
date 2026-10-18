import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SOURCES = {
  chime: require('../../assets/sounds/chime.wav'),
  alarm: require('../../assets/sounds/alarm.wav'),
};

const players = {};

export function criticalChannelId(prefs) {
  if (prefs?.criticalSound === 'off') return 'nursery-critical-silent';
  return prefs?.overrideSilent ? 'nursery-critical-alarm' : 'nursery-critical';
}

export async function configureAlertChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('nursery-warning', {
    name: 'Nursery warnings',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'chime.wav',
    vibrationPattern: [0, 180, 120, 180],
  });
  await Notifications.setNotificationChannelAsync('nursery-critical', {
    name: 'Critical nursery alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm.wav',
    bypassDnd: false,
    vibrationPattern: [0, 400, 200, 400],
  });
  await Notifications.setNotificationChannelAsync('nursery-critical-alarm', {
    name: 'Critical nursery alerts (override silent)',
    description: 'Plays as an alarm so a critical breach can sound in silent mode.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm.wav',
    bypassDnd: true,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    vibrationPattern: [0, 500, 200, 500, 200, 500],
  });
  await Notifications.setNotificationChannelAsync('nursery-critical-silent', {
    name: 'Critical nursery alerts (silent)',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 200],
  });
}

async function playerFor(name) {
  if (!players[name]) players[name] = createAudioPlayer(SOURCES[name]);
  return players[name];
}

export async function playAlertSound(kind, prefs, body) {
  const name = kind === 'critical' ? prefs?.criticalSound : prefs?.warningSound;
  if (name !== 'chime' && name !== 'alarm') return;
  const override = kind === 'critical' && !!prefs?.overrideSilent;
  await setAudioModeAsync({
    playsInSilentMode: override,
    interruptionMode: 'duckOthers',
  });
  const player = await playerFor(name);
  try {
    await player.seekTo(0);
  } catch {
    // A player that has not started yet can reject seek; play() still starts at 0.
  }
  player.play();
  if (override) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Critical nursery alert',
        body: body || 'A reading is outside the target range.',
        sound: 'alarm.wav',
      },
      trigger: { channelId: 'nursery-critical-alarm' },
    }).catch(() => {});
  }
}
