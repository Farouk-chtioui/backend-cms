import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

export interface FcmNotificationOptions {
  title: string;
  body: string;
  imageUrl?: string;
  badge?: string;
  icon?: string;
  color?: string;
  clickAction?: string;
  tag?: string;
  sound?: string;
}

export interface FcmMessageOptions {
  notification: FcmNotificationOptions;
  data?: Record<string, string>;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
  fcmOptions?: admin.messaging.FcmOptions;
  priority?: 'high' | 'normal';
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  sentCount?: number;
  imageUrl?: string;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private notificationHistory: NotificationHistoryItem[] = [];

  constructor() {
    const serviceAccountPath = path.join(__dirname, './firebase-service-account.json');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      this.logger.log('✅ Firebase Admin initialized using service account file');
    }
  }

  /**
   * Get notification history
   */
  getNotificationHistory(): NotificationHistoryItem[] {
    return this.notificationHistory;
  }

  /**
   * Send a message to a specific topic with enhanced FCM features
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
    options: Partial<FcmMessageOptions> = {},
  ) {
    // Start with basic notification structure
    const notification: FcmNotificationOptions = {
      title,
      body,
      ...options.notification,
    };

    // Build the FCM message with all supported features
    const message: admin.messaging.Message = {
      notification: notification,
      data,
      topic,
      android: options.android,
      apns: options.apns,
      webpush: options.webpush,
      fcmOptions: options.fcmOptions,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Sent message to ${topic}: ${response}`);
      
      // Add to history
      const historyItem: NotificationHistoryItem = {
        id: Date.now().toString(),
        title,
        body,
        imageUrl: options.notification?.imageUrl,
        sentAt: new Date(),
        status: 'sent',
        sentCount: 100 // Simulating sent count like the frontend
      };
      
      this.notificationHistory = [historyItem, ...this.notificationHistory].slice(0, 50); // Keep last 50 items
      
      return { 
        success: true, 
        response,
        messageId: response,
        notificationHistory: historyItem
      };
    } catch (error) {
      this.logger.error(`❌ Error sending FCM: ${error.message}`);
      
      // Add failed notification to history
      const historyItem: NotificationHistoryItem = {
        id: Date.now().toString(),
        title,
        body,
        imageUrl: options.notification?.imageUrl,
        sentAt: new Date(),
        status: 'failed'
      };
      
      this.notificationHistory = [historyItem, ...this.notificationHistory].slice(0, 50);
      
      return { 
        success: false, 
        error: error.message,
        notificationHistory: historyItem
      };
    }
  }

  /**
   * Send a message with image notification to a topic
   */
  async sendImageToTopic(
    topic: string,
    title: string,
    body: string,
    imageUrl: string,
    data: Record<string, string> = {},
    priority: 'normal' | 'high' = 'normal',
  ) {
    // Create notification with image support
    const notification: FcmNotificationOptions = {
      title,
      body,
      imageUrl,
    };

    // Configure platform-specific settings for optimal image display
    const android: admin.messaging.AndroidConfig = {
      notification: {
        imageUrl,
      },
      priority: priority === 'high' ? 'high' : 'normal',
    };

    const apns: admin.messaging.ApnsConfig = {
      payload: {
        aps: {
          mutableContent: true, // Required for iOS to download and display the image
          priority: priority === 'high' ? 10 : 5,
        },
      },
      fcmOptions: {
        imageUrl,
      },
    };

    const webpush: admin.messaging.WebpushConfig = {
      notification: {
        image: imageUrl,
      },
    };

    return this.sendToTopic(topic, title, body, data, { 
      notification, 
      android, 
      apns, 
      webpush,
      priority
    });
  }

  /**
   * Send notification based on frontend's requirements
   * This consolidated method handles all notification types
   */
  async sendPushNotification({
    topic,
    title,
    body,
    imageUrl,
    priority = 'normal',
    data = {}
  }: {
    topic: string;
    title: string;
    body: string;
    imageUrl?: string;
    priority?: 'normal' | 'high';
    data?: Record<string, string>;
  }) {
    // If image URL is provided, use the image notification method
    if (imageUrl) {
      return this.sendImageToTopic(topic, title, body, imageUrl, data, priority);
    }
    
    // Otherwise use standard notification with priority
    const android: admin.messaging.AndroidConfig = {
      priority: priority === 'high' ? 'high' : 'normal',
    };

    const apns: admin.messaging.ApnsConfig = {
      payload: {
        aps: {
          contentAvailable: priority === 'high',
          priority: priority === 'high' ? 10 : 5,
        },
      },
    };

    return this.sendToTopic(topic, title, body, data, {
      android,
      apns,
      priority,
    });
  }

  /**
   * Send a high priority notification
   */
  async sendUrgentToTopic(
    topic: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
    options: Partial<FcmMessageOptions> = {},
  ) {
    const android: admin.messaging.AndroidConfig = {
      priority: 'high',
      ...(options.android || {}),
    };

    const apns: admin.messaging.ApnsConfig = {
      payload: {
        aps: {
          contentAvailable: true,
          priority: 10,
          ...((options.apns?.payload as any)?.aps || {}),
        },
      },
      ...(options.apns || {}),
    };

    return this.sendToTopic(topic, title, body, data, {
      ...options,
      android,
      apns,
    });
  }

  /**
   * Send a notification to multiple topics using a condition
   */
  async sendToMultipleTopics(
    condition: string, // e.g., "'topic1' in topics && ('topic2' in topics || 'topic3' in topics)"
    title: string,
    body: string,
    data: Record<string, string> = {},
    options: Partial<FcmMessageOptions> = {},
  ) {
    const notification = {
      title,
      body,
      ...options.notification,
    };

    const message: admin.messaging.Message = {
      notification,
      data,
      condition,
      android: options.android,
      apns: options.apns,
      webpush: options.webpush,
      fcmOptions: options.fcmOptions,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Sent message with condition: ${condition}: ${response}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`❌ Error sending FCM: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe device tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string) {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`✅ Subscribed tokens to ${topic}: ${JSON.stringify(response)}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`❌ Error subscribing to topic: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string) {
    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(`✅ Unsubscribed tokens from ${topic}: ${JSON.stringify(response)}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`❌ Error unsubscribing from topic: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
