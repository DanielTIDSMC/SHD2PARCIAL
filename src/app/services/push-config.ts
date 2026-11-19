export const VAPID_PUBLIC_KEY = 'BKrHycAfqg2mppK_wiba2YBpdytAU_5BW_XouM_qOA5qddpzMooT3Re1BTgrP8tw2ZQ_UCpNWPzPrt6JcQHj3c0';
const realtimeHost = typeof window === 'undefined' || ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3001'
  : 'https://mi-pwa-api.onrender.com';
export const PUSH_API_URL = `${realtimeHost}/api`;
export const REALTIME_URL = `${realtimeHost}/events`;
