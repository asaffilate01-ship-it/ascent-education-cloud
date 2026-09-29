export const isNativeApp=()=>typeof window!=='undefined'&&Boolean((window as Window & {Capacitor?:unknown}).Capacitor);
export const nativePlatform=()=>{const c=(window as Window & {Capacitor?:{getPlatform?:()=>string}}).Capacitor;return c?.getPlatform?.()||'web';};
export const APP_DEEP_LINK_SCHEME='unipathway://';