import sgMail from "@sendgrid/mail";
import { Twilio } from "twilio";

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) sgMail.setApiKey(sendgridApiKey);

const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;

let twilioClient: Twilio | undefined;
if (twilioSid && twilioToken) twilioClient = new Twilio(twilioSid, twilioToken);

export async function sendEmail(to: string, subject: string, text: string) {
	if (!sendgridApiKey) return; // noop in dev
	await sgMail.send({ to, from: process.env.SENDGRID_FROM || "no-reply@example.com", subject, text });
}

export async function sendSms(to: string, body: string) {
	if (!twilioClient) return;
	await twilioClient.messages.create({ to, from: process.env.TWILIO_FROM || "", body });
}

// Real-time notification functions
export async function sendRealTimeNotification(userId: string, event: string, data: any) {
	try {
		const socketService = (global as any).socketService;
		if (socketService) {
			socketService.sendToUser(userId, event, data);
		}
	} catch (error) {
		console.error('Failed to send real-time notification:', error);
	}
}

export async function sendRealTimeNotificationToRole(role: string, event: string, data: any) {
	try {
		const socketService = (global as any).socketService;
		if (socketService) {
			socketService.sendToRole(role, event, data);
		}
	} catch (error) {
		console.error('Failed to send real-time notification to role:', error);
	}
}

// Enhanced notification functions for booking events
export async function notifyNewBooking(providerUserId: string, bookingData: any) {
	// Send email notification
	try {
		const provider = await import('../models/Provider').then(m => m.ProviderModel.findOne({ userId: providerUserId }));
		if (provider) {
			const user = await import('../models/User').then(m => m.UserModel.findById(providerUserId));
			if (user?.email) {
				await sendEmail(
					user.email,
					"New Booking Request",
					`You have a new booking request for ${bookingData.serviceType}. Please check your dashboard to accept or reject.`
				);
			}
		}
	} catch (error) {
		console.error('Failed to send email notification:', error);
	}

	// Send real-time notification
	await sendRealTimeNotification(providerUserId, 'new-booking', {
		type: 'new-booking',
		message: 'You have a new booking request',
		booking: bookingData
	});
}

export async function notifyBookingStatusChange(userId: string, providerUserId: string, bookingData: any, status: string) {
	const statusMessages = {
		accepted: 'Your booking has been accepted by the provider',
		rejected: 'Your booking has been rejected by the provider',
		started: 'The provider has started working on your service',
		completed: 'Your service has been completed'
	};

	const message = statusMessages[status as keyof typeof statusMessages] || 'Your booking status has changed';

	// Send email to user
	try {
		const user = await import('../models/User').then(m => m.UserModel.findById(userId));
		if (user?.email) {
			await sendEmail(
				user.email,
				`Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
				`${message}. Service: ${bookingData.serviceType}`
			);
		}
	} catch (error) {
		console.error('Failed to send email notification:', error);
	}

  // Send real-time notification to user
	await sendRealTimeNotification(userId, 'booking-status-update', {
		type: 'booking-status-update',
		message,
		booking: bookingData,
		status
	});

	// Send real-time notification to provider
	await sendRealTimeNotification(providerUserId, 'booking-status-update', {
		type: 'booking-status-update',
    message: `Booking ${status} successfully`,
		booking: bookingData,
		status
	});
}


