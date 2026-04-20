import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { FilhosProvider } from '../context/FilhosContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('@juca:filhos').then(v => {
      const filhos = v ? JSON.parse(v) : [];
      if (filhos.length > 0) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/');
      }
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="onboarding-filho" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <FilhosProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </FilhosProvider>
  );
}