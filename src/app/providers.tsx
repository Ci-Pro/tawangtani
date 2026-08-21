import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOCALE } from '@/constants/locale';

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    void LOCALE;
    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
};

export { AppProviders, ThemeProvider };
