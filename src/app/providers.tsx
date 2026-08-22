import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOCALE } from '@/constants/locale';
import { syncCatalog } from '@/services/catalogSync';

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    void LOCALE;
    syncCatalog().catch(() => undefined);
    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
};

export { AppProviders, ThemeProvider };
