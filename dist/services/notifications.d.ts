export declare function sendEmail(to: string, subject: string, text: string): Promise<void>;
export declare function sendSms(to: string, body: string): Promise<void>;
export declare function sendRealTimeNotification(userId: string, event: string, data: any): Promise<void>;
export declare function sendRealTimeNotificationToRole(role: string, event: string, data: any): Promise<void>;
export declare function notifyNewBooking(providerUserId: string, bookingData: any): Promise<void>;
export declare function notifyBookingStatusChange(userId: string, providerUserId: string, bookingData: any, status: string): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map