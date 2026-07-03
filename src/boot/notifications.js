import { boot } from 'quasar/wrappers'
import { api } from '../api'

const VAPID_PUBLIC_KEY = 'BE0XL8QA4PAPUHMB4KqlseP0r3ehFOt8rVqdyQa53p0UbA_ImSbCwj-yVJwr9noIVffXJl_Uj62IhMYwGQqarEw';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default boot(async ({ app }) => {
  // Function to subscribe the user
  app.config.globalProperties.$subscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permission not granted for notifications');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send to server
      await api.post('/notifications/subscribe', subscription);
      console.log('Push subscription successful');
      return true;
    } catch (error) {
      console.error('Push notification setup error:', error);
      return false;
    }
  };
})
