import { LocalNotifications } from '@capacitor/local-notifications';

const DAILY_ID = 1;
const TEST_ID = 99;

export async function requestNotifPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDaily(orario = '08:00') {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] });
    const [h, m] = orario.split(':').map(Number);
    await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_ID,
        title: 'Iron Log 💪',
        body: 'Ricordati di loggare l\'allenamento e la dieta di oggi',
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        smallIcon: 'ic_launcher_round',
      }]
    });
  } catch (e) {
    console.warn('scheduleDaily error', e);
  }
}

export async function cancelDaily() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] });
  } catch {}
}

export async function testNotifica() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: TEST_ID }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: TEST_ID,
        title: 'Iron Log 💪',
        body: 'Test notifica funzionante!',
        schedule: { at: new Date(Date.now() + 20000) },
        smallIcon: 'ic_launcher_round',
      }]
    });
    return true;
  } catch (e) {
    console.warn('testNotifica error', e);
    return false;
  }
}
