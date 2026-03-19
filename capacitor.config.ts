import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.focusflow',
  appName: 'FocusFlow',
  webDir: 'dist',
  server: {
    url: 'https://59a00456-c837-4a1f-80c1-0c057bb4c79a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
