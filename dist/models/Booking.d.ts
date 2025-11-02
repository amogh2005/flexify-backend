import mongoose, { Document, Types } from "mongoose";
export type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
export interface BookingDocument extends Document {
    userId: Types.ObjectId;
    providerId: Types.ObjectId;
    serviceType: string;
    description: string;
    preferredDate: Date;
    preferredTime: string;
    urgency: "low" | "normal" | "high";
    budget?: number;
    address: string;
    contactPhone?: string;
    serviceCategory?: string;
    duration?: string;
    durationValue?: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
    skillTags?: string[];
    insuranceRequired?: boolean;
    backgroundCheckRequired?: boolean;
    basePrice?: number;
    surgeMultiplier?: number;
    insuranceCost?: number;
    status: BookingStatus;
    acceptedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
    startedAt?: Date;
    completedAt?: Date;
    providerNotes?: string;
    estimatedDuration?: string;
    finalAmount?: number;
    amount: number;
    currency: string;
    paymentIntentId?: string;
    clientSecret?: string;
    paymentStatus?: "unpaid" | "requires_payment_method" | "requires_confirmation" | "processing" | "requires_action" | "canceled" | "succeeded" | "refunded" | "paid";
    paidAt?: Date;
    servicePrice: number;
    platformCommission: number;
    providerEarnings: number;
    commissionRate: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentMethod?: "card" | "upi" | "netbanking" | "wallet" | "UPI" | "Cash";
    paymentAcceptedAt?: Date;
    rating?: number;
    review?: string;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BookingModel: mongoose.Model<BookingDocument, {}, {}, {}, mongoose.Document<unknown, {}, BookingDocument, {}, {}> & BookingDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.d.ts.map