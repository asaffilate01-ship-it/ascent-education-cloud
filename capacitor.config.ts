import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig={appId:'pk.edu.unipathway.app',appName:'UniPathway',webDir:'dist',server:{androidScheme:'https'},plugins:{SplashScreen:{launchAutoHide:true},Keyboard:{resize:'body'}}};
export default config;