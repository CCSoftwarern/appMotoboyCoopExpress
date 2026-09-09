import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { Notification as ExpoNotification } from 'expo-notifications';

import { useAuth } from '@/context/auth';
import { atualizarPushToken } from '@/lib/api';

type NotificationsModule = typeof import('expo-notifications');

/**
 * O expo-notifications lança erro ao ser importado no Expo Go (Android)
 * desde o SDK 53 (push remoto removido de lá). Carregamos o módulo de forma
 * defensiva: no Expo Go fica desativado; em dev build / standalone funciona.
 */
function loadNotifications(): NotificationsModule | null {
  const inExpoGo = Constants.executionEnvironment === 'storeClient';
  if (inExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

const Notifications: NotificationsModule | null = loadNotifications();

export function configureNotificationHandler() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('corridas', {
      name: 'Corridas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('EAS projectId não configurado — push desativado.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** Registra o token do Expo Push no banco (coluna tokencelular do motoboy). 
 * Plano B robusto: registra ao logar, ao voltar para foreground e quando o token nativo muda.
 */
export function useRegisterPushToken() {
  const { client, motoboy } = useAuth();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!client || !motoboy) return;
    let cancelled = false;

    const register = async (force = false) => {
      try {
        const token = await getExpoPushToken();
        if (!token) return;
        if (!force && lastTokenRef.current === token) return;
        lastTokenRef.current = token;
        await atualizarPushToken(client, token);
      } catch (e) {
        console.warn('Falha ao registrar push token', e);
      }
    };

    // registro inicial
    void register(true);

    // re-registra ao voltar para foreground (token pode ter rotacionado)
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !cancelled) {
        void register();
      }
    });

    // listener de rotação do token nativo (se disponível)
    let pushTokenSub: { remove: () => void } | null = null;
    try {
      const n = Notifications as unknown as {
        addPushTokenListener?: (cb: (t: { data: string }) => void) => { remove: () => void };
      };
      if (n?.addPushTokenListener) {
        pushTokenSub = n.addPushTokenListener((event) => {
          const newToken = (event as unknown as string) ?? (event as { data: string })?.data;
          if (typeof newToken === 'string' && newToken) {
            void atualizarPushToken(client, newToken).catch((e) =>
              console.warn('Falha ao atualizar token rotacionado', e),
            );
          } else {
            void register(true);
          }
        });
      }
    } catch {
      // ignora se API não existir
    }

    return () => {
      cancelled = true;
      appStateSub.remove();
      pushTokenSub?.remove();
    };
  }, [client, motoboy]);
}

/** Navega para a tela da entrega ao tocar em uma notificação de nova corrida. */
export function useNotificationNavigation() {
  useEffect(() => {
    const notifications = Notifications;
    if (!notifications) return;

    const redirect = (notification: ExpoNotification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as never);
      }
    };

    notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) redirect(response.notification);
    });

    const sub = notifications.addNotificationResponseReceivedListener((response) => {
      redirect(response.notification);
    });

    return () => sub.remove();
  }, []);
}
