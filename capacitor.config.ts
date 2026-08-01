import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.median.ios.zryayz',
  appName: 'The Ultimate Break-up Guide',
  server: {
    url: 'https://break-up-app-ios.vercel.app/',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#F0F4FF",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;