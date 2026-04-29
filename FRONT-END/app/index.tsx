import { Redirect } from 'expo-router';
import React from 'react';

// Splash router. _layout.tsx decide o destino real ao detectar a sessão.
// Esta tela é mostrada apenas se chegarmos em "/" sem decisão prévia.
export default function Index() {
  return <Redirect href="/onboarding-filho" />;
}
