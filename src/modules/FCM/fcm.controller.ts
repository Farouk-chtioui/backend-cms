import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { FcmService, FcmMessageOptions, NotificationHistoryItem } from './fcm.service';

interface SendNotificationDto {
  title: string;
  body: string;
  imageUrl?: string;
  sendToAll?: boolean;
  priority?: 'normal' | 'high';
  data?: Record<string, string>;
  mobileAppId: string;
}

@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Get('history')
  getNotificationHistory(): NotificationHistoryItem[] {
    return this.fcmService.getNotificationHistory();
  }

  @Post('send')
  async sendNotification(@Body() body: SendNotificationDto) {
    const { title, body: messageBody, imageUrl, priority = 'normal', data = {}, mobileAppId } = body;
    
    // Format topic as expected by frontend
    const topic = `app_${mobileAppId}`;
    
    return this.fcmService.sendPushNotification({
      topic,
      title,
      body: messageBody,
      imageUrl,
      priority,
      data
    });
  }

  @Post('send-image')
  async sendImageToTopic(@Body() body: {
    mobileAppId: string;
    title: string;
    body: string;
    imageUrl: string;
    data?: Record<string, string>;
    priority?: 'normal' | 'high';
  }) {
    const topic = `app_${body.mobileAppId}`;
    return this.fcmService.sendImageToTopic(
      topic,
      body.title,
      body.body,
      body.imageUrl,
      body.data || {},
      body.priority || 'normal'
    );
  }

  @Post('send-urgent')
  async sendUrgentToTopic(@Body() body: {
    mobileAppId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    options?: Partial<FcmMessageOptions>;
  }) {
    const topic = `app_${body.mobileAppId}`;
    return this.fcmService.sendUrgentToTopic(
      topic,
      body.title,
      body.body,
      body.data || {},
      body.options || {}
    );
  }

  @Post('subscribe')
  async subscribeToTopic(@Body() body: {
    tokens: string[];
    mobileAppId: string;
  }) {
    const topic = `app_${body.mobileAppId}`;
    return this.fcmService.subscribeToTopic(body.tokens, topic);
  }

  @Post('unsubscribe')
  async unsubscribeFromTopic(@Body() body: {
    tokens: string[];
    mobileAppId: string;
  }) {
    const topic = `app_${body.mobileAppId}`;
    return this.fcmService.unsubscribeFromTopic(body.tokens, topic);
  }
}
