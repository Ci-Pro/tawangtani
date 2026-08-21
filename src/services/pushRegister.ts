import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface RegisteredPush {
  token?: string;
  permission: boolean;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | undefined> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Peringatan Cuaca',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const granted = await ensureNotificationPermission();
    if (!granted) return undefined;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return undefined;
  }
}
