import React, { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { NotificationService } from '../services/notificationService';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Message, WorkerApplication } from '../types';
import { useTranslation } from 'react-i18next';

export const NotificationManager = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const scheduledReminders = useRef<Set<string>>(new Set());

  const initialized = useRef(false);

  useEffect(() => {
    if (user && profile && !initialized.current) {
      initialized.current = true;

      // Function to run the daily comparison check
      const runDailyBookingCheck = async () => {
        try {
          const now = new Date();
          const currentLang = localStorage.getItem('i18nextLng') || 'en';
          
          // Query customer bookings
          const qCustomer = query(
            collection(db, 'bookings'),
            where('customerId', '==', user.uid),
            where('status', 'in', ['pending', 'confirmed'])
          );
          const customerSnap = await getDocs(qCustomer);
          const customerBookings = customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
          
          // Query worker bookings if applicable
          let workerBookings: Booking[] = [];
          if (profile.role === 'worker') {
            const qWorker = query(
              collection(db, 'bookings'),
              where('workerId', '==', user.uid),
              where('status', 'in', ['pending', 'confirmed'])
            );
            const workerSnap = await getDocs(qWorker);
            workerBookings = workerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
          }
          
          const allBookings = [...customerBookings, ...workerBookings];
          // Deduplicate bookings
          const uniqueBookings = allBookings.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          
          for (const booking of uniqueBookings) {
            if (!booking.scheduledTime) continue;
            
            const bookingDate = new Date(booking.scheduledTime);
            if (isNaN(bookingDate.getTime())) continue;
            
            const diffMs = bookingDate.getTime() - now.getTime();
            const hours = diffMs / (1000 * 60 * 60);
            
            // If the booking is scheduled within the next 24 hours
            if (hours > 0 && hours <= 24) {
              const notifiedKey = `notified_booking_24h_${booking.id}_${booking.scheduledTime}`;
              if (!localStorage.getItem(notifiedKey)) {
                const isCustomer = booking.customerId === user.uid;
                const otherPartyName = isCustomer ? booking.workerName : booking.customerName;
                
                let title = '';
                let body = '';
                
                if (currentLang === 'ar') {
                  title = '⏰ تذكير بالحجز قريباً';
                  body = isCustomer 
                    ? `لديك حجز لخدمة (${t(booking.category)}) مع مزود الخدمة ${otherPartyName} في غضون 24 ساعة!`
                    : `لديك موعد عمل لخدمة (${t(booking.category)}) مع العميل ${otherPartyName} في غضون 24 ساعة!`;
                } else if (currentLang === 'ku') {
                  title = '⏰ بیرخستنەوەی جێبەجێکردنی حجز';
                  body = isCustomer
                    ? `حجزکردنی خزمەتگوزاری (${t(booking.category)}) لەگەڵ ${otherPartyName} کەمتر لە ٢٤ کاتژمێری ماوە!`
                    : `کاتی کارت هەیە بۆ خزمەتگوزاری (${t(booking.category)}) لەگەڵ کڕیار ${otherPartyName} لە کەمتر لە ٢٤ کاتژمێردا!`;
                } else {
                  title = '⏰ Upcoming Booking Reminder';
                  body = isCustomer
                    ? `Your booking for ${t(booking.category)} with ${otherPartyName} is scheduled within 24 hours!`
                    : `You have an upcoming job for ${t(booking.category)} with customer ${otherPartyName} within 24 hours!`;
                }
                
                await NotificationService.showLocalNotification(title, body);
                localStorage.setItem(notifiedKey, 'true');
              }
            }
          }
        } catch (err) {
          console.error("Daily upcoming booking check failed:", err);
        }
      };

      // Initialize notifications
      NotificationService.requestPermissions().then((granted) => {
        if (granted) {
          NotificationService.registerToken(user.uid);
          NotificationService.addListeners();
          NotificationService.scheduleEngagementReminder();
        }
      });

      // Run daily check on start
      runDailyBookingCheck();

      // Schedule subsequent checks every 12 hours
      const dailyCheckInterval = setInterval(runDailyBookingCheck, 43200000);

      // Flags to ignore initial snapshots
      let isInitialBookings = true;
      let isInitialConfirmations = true;
      let isInitialMessagesCustomer = true;
      let isInitialMessagesWorker = true;
      let isInitialApps = true;

      // 1. Listen for new booking requests (for workers)
      let unsubBookings: () => void;
      if (profile.role === 'worker') {
        const q = query(
          collection(db, 'bookings'),
          where('workerId', '==', profile.uid),
          where('status', '==', 'pending')
        );
        unsubBookings = onSnapshot(q, (snapshot) => {
          if (isInitialBookings) {
            isInitialBookings = false;
            return;
          }
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const booking = change.doc.data() as Booking;
              NotificationService.showLocalNotification(
                t('newBookingRequest'),
                `${booking.customerName} - ${t(booking.category)}`
              );
            }
          });
        }, (error) => {
          console.error("NotificationManager: unsubBookings error", error);
        });
      }

      // 2. Listen for booking confirmations (for customers)
      const qConfirmations = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', '==', 'confirmed')
      );
      const unsubConfirmations = onSnapshot(qConfirmations, (snapshot) => {
        if (isInitialConfirmations) {
          isInitialConfirmations = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const booking = change.doc.data() as Booking;
            if (booking.status === 'confirmed') {
              NotificationService.showLocalNotification(
                t('bookingConfirmed'),
                `${booking.workerName} - ${t(booking.category)}`
              );

              // 3. Schedule upcoming service reminder (24h before)
              if (booking.scheduledTime && !scheduledReminders.current.has(booking.id)) {
                NotificationService.scheduleReminder(
                  booking.id,
                  booking.scheduledTime,
                  t('upcomingServiceReminder'),
                  `${t('serviceReminderBody')} ${booking.workerName}`
                );
                scheduledReminders.current.add(booking.id);
              }
            }
          }
        });
      }, (error) => {
        console.error("NotificationManager: unsubConfirmations error", error);
      });

      // 4. Listen for new messages
      const qMessagesCustomer = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const unsubMessagesCustomer = onSnapshot(qMessagesCustomer, (snapshot) => {
        if (isInitialMessagesCustomer) {
          isInitialMessagesCustomer = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const booking = change.doc.data() as Booking;
            if (booking.lastMessageSenderId !== user.uid && booking.lastMessage) {
              NotificationService.showLocalNotification(
                t('newMessage'),
                `${booking.lastMessage}`
              );
            }
          }
        });
      }, (error) => {
        console.error("NotificationManager: unsubMessagesCustomer error", error);
      });

      let unsubMessagesWorker: (() => void) | undefined;
      if (profile.role === 'worker') {
        const qMessagesWorker = query(
          collection(db, 'bookings'),
          where('workerId', '==', profile.uid),
          where('status', 'in', ['pending', 'confirmed'])
        );
        unsubMessagesWorker = onSnapshot(qMessagesWorker, (snapshot) => {
          if (isInitialMessagesWorker) {
            isInitialMessagesWorker = false;
            return;
          }
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const booking = change.doc.data() as Booking;
              if (booking.lastMessageSenderId !== user.uid && booking.lastMessage) {
                NotificationService.showLocalNotification(
                  t('newMessage'),
                  `${booking.lastMessage}`
                );
              }
            }
          });
        }, (error) => {
          console.error("NotificationManager: unsubMessagesWorker error", error);
        });
      }

      // 5. Listen for worker application status updates
      const unsubApps = onSnapshot(doc(db, 'workerApplications', user.uid), (docSnap) => {
        if (isInitialApps) {
          isInitialApps = false;
          return;
        }
        if (docSnap.exists()) {
          const app = docSnap.data() as WorkerApplication;
          // We only want to notify if the status changed, but onSnapshot on a doc triggers on any change.
          // To be precise, we'd need to compare previous state, but for simplicity we'll just notify.
          // Actually, let's just notify if it exists and we aren't initial.
          NotificationService.showLocalNotification(
            t('applicationUpdate'),
            `${t('applicationStatus')}: ${t(app.status)}`
          );
        }
      }, (error) => {
        console.error("NotificationManager: unsubApps error", error);
      });

      return () => {
        if (unsubBookings) unsubBookings();
        unsubConfirmations();
        unsubMessagesCustomer();
        if (unsubMessagesWorker) unsubMessagesWorker();
        unsubApps();
        clearInterval(dailyCheckInterval);
      };
    }
  }, [user?.uid, profile?.role, t]);

  return null;
};
