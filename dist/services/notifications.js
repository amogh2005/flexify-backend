"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendSms = sendSms;
exports.sendRealTimeNotification = sendRealTimeNotification;
exports.sendRealTimeNotificationToRole = sendRealTimeNotificationToRole;
exports.notifyNewBooking = notifyNewBooking;
exports.notifyBookingStatusChange = notifyBookingStatusChange;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const twilio_1 = require("twilio");
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey)
    mail_1.default.setApiKey(sendgridApiKey);
const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;
let twilioClient;
if (twilioSid && twilioToken)
    twilioClient = new twilio_1.Twilio(twilioSid, twilioToken);
async function sendEmail(to, subject, text) {
    if (!sendgridApiKey)
        return; // noop in dev
    await mail_1.default.send({ to, from: process.env.SENDGRID_FROM || "no-reply@example.com", subject, text });
}
async function sendSms(to, body) {
    if (!twilioClient)
        return;
    await twilioClient.messages.create({ to, from: process.env.TWILIO_FROM || "", body });
}
// Real-time notification functions
async function sendRealTimeNotification(userId, event, data) {
    try {
        const socketService = global.socketService;
        if (socketService) {
            socketService.sendToUser(userId, event, data);
        }
    }
    catch (error) {
        console.error('Failed to send real-time notification:', error);
    }
}
async function sendRealTimeNotificationToRole(role, event, data) {
    try {
        const socketService = global.socketService;
        if (socketService) {
            socketService.sendToRole(role, event, data);
        }
    }
    catch (error) {
        console.error('Failed to send real-time notification to role:', error);
    }
}
// Enhanced notification functions for booking events
async function notifyNewBooking(providerUserId, bookingData) {
    // Send email notification
    try {
        const provider = await Promise.resolve().then(() => __importStar(require('../models/Provider'))).then(m => m.ProviderModel.findOne({ userId: providerUserId }));
        if (provider) {
            const user = await Promise.resolve().then(() => __importStar(require('../models/User'))).then(m => m.UserModel.findById(providerUserId));
            if (user?.email) {
                await sendEmail(user.email, "New Booking Request", `You have a new booking request for ${bookingData.serviceType}. Please check your dashboard to accept or reject.`);
            }
        }
    }
    catch (error) {
        console.error('Failed to send email notification:', error);
    }
    // Send real-time notification
    await sendRealTimeNotification(providerUserId, 'new-booking', {
        type: 'new-booking',
        message: 'You have a new booking request',
        booking: bookingData
    });
}
async function notifyBookingStatusChange(userId, providerUserId, bookingData, status) {
    const statusMessages = {
        accepted: 'Your booking has been accepted by the provider',
        rejected: 'Your booking has been rejected by the provider',
        started: 'The provider has started working on your service',
        completed: 'Your service has been completed'
    };
    const message = statusMessages[status] || 'Your booking status has changed';
    // Send email to user
    try {
        const user = await Promise.resolve().then(() => __importStar(require('../models/User'))).then(m => m.UserModel.findById(userId));
        if (user?.email) {
            await sendEmail(user.email, `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`, `${message}. Service: ${bookingData.serviceType}`);
        }
    }
    catch (error) {
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
//# sourceMappingURL=notifications.js.map