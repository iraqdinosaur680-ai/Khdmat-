import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export class NotificationService {
  private static isPushSupported = Capacitor.getPlatform() !== 'web';
  private static channelCreated = false;

  static async createNotificationChannel() {
    if (!this.isPushSupported || this.channelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: 'khdmat-default',
        name: 'خدمات Notifications',
        description: 'General app notifications',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#03452E',
        bypassDnd: true,
      });
      this.channelCreated = true;
    } catch (e) {
      console.error('Error creating notification channel:', e);
    }
  }

  static async requestPermissions() {
    await this.createNotificationChannel();
    let pushGranted = false;
    let localGranted = false;

    try {
      const localPerms = await LocalNotifications.requestPermissions();
      localGranted = localPerms.display === 'granted';
    } catch (e) {
      console.error('Error requesting local notification permissions:', e);
    }

    if (this.isPushSupported) {
      try {
        let pushPerms = await PushNotifications.checkPermissions();
        if (pushPerms.receive === 'prompt' || pushPerms.receive === 'prompt-with-rationale') {
          pushPerms = await PushNotifications.requestPermissions();
        }
        pushGranted = pushPerms.receive === 'granted';
        if (pushGranted) {
          await PushNotifications.register();
        }
      } catch (e) {
        console.error('Error requesting push notification permissions:', e);
      }
    }

    return localGranted || pushGranted;
  }

  private static listenersAdded = false;

  static async registerToken(userId: string) {
    if (!this.isPushSupported || this.listenersAdded) return;
    PushNotifications.addListener('registration', async (token) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data().fcmToken === token.value) {
          return; // Skip if already matches
        }
        await updateDoc(doc(db, 'users', userId), { fcmToken: token.value });
      } catch (error) {
        console.error('Error updating FCM token:', error);
      }
    });
    PushNotifications.addListener('registrationError', (err) => {
      console.error('Registration error:', err.error);
    });
  }

  static async addListeners() {
    if (!this.isPushSupported || this.listenersAdded) return;
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.showLocalNotification(
        notification.title || 'خدمات',
        notification.body || ''
      );
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
    });
    this.listenersAdded = true;
  }

  static async showLocalNotification(title: string, body: string, id: number = Math.floor(Math.random() * 9000) + 1) {
    try {
      await this.createNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id,
          channelId: 'khdmat-default',
          schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_notification',
          actionTypeId: '',
          extra: null,
        }]
      });
    } catch (e) {
      console.error('Error showing local notification:', e);
    }
  }

  static async scheduleReminder(bookingId: string, scheduledTime: string, title: string, body: string) {
    const scheduledDate = new Date(scheduledTime);
    const reminderDate = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminderDate.getTime() <= Date.now()) return;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Math.floor(Math.random() * 9000) + 1,
          channelId: 'khdmat-default',
          schedule: { at: reminderDate, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_notification',
          extra: { bookingId },
        }]
      });
    } catch (e) {
      console.error('Error scheduling reminder:', e);
    }
  }

  static async scheduleEngagementReminder() {
    try {
      await this.createNotificationChannel();
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') return;

      const pending = await LocalNotifications.getPending();
      const existing = pending.notifications.filter(n => n.id >= 9001 && n.id <= 9010);
      if (existing.length > 0) {
        await LocalNotifications.cancel({ notifications: existing });
      }

      const randomDays = Math.floor(Math.random() * 5) + 3; // 3–7 days
      const triggerDate = new Date(Date.now() + randomDays * 24 * 60 * 60 * 1000);
      const lang = localStorage.getItem('i18nextLng') || 'en';

      const messages: Record<string, { title: string; body: string }> = {
        en: { title: '👋 We miss you!', body: 'Book a service today and get things done easily.' },
        ar: { title: '👋 اشتقنا إليك!', body: 'احجز خدمة اليوم وأنجز أمورك بسهولة.' },
        ku: { title: '👋 بێت بمانەوە!', body: 'ئەمرۆ خزمەتگوزارییەک حجز بکە و کارەکانت ئاسان بکە.' },
      };

      const msg = messages[lang] || messages['en'];

      await LocalNotifications.schedule({
        notifications: [{
          id: 9001,
          title: msg.title,
          body: msg.body,
          channelId: 'khdmat-default',
          schedule: { at: triggerDate, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_notification',
          actionTypeId: '',
          extra: { type: 'engagement' },
        }]
      });
    } catch (e) {
      console.error('Failed to schedule engagement reminder:', e);
    }
  }

  static async cancelAllNotifications() {
    try {
      await LocalNotifications.cancel({ notifications: [] });
    } catch (e) {}
  }
}
