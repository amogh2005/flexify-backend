import mongoose, { Document, Types } from "mongoose";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentMethod = "card" | "upi" | "netbanking" | "wallet" | "cash";
export interface PaymentDocument extends Document {
    bookingId: Types.ObjectId;
    userId: Types.ObjectId;
    providerId: Types.ObjectId;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    servicePrice: number;
    platformCommission: number;
    providerEarnings: number;
    commissionRate: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    razorpayRefundId?: string;
    transactionId?: string;
    gatewayTransactionId?: string;
    gatewayResponse?: any;
    initiatedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
    refundAmount?: number;
    refundReason?: string;
    refundStatus?: "pending" | "completed" | "failed";
    metadata?: {
        userAgent?: string;
        ipAddress?: string;
        deviceType?: string;
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentModel: mongoose.Model<PaymentDocument, {}, {}, {}, mongoose.Document<unknown, {}, PaymentDocument, {}, {}> & PaymentDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Payment.d.ts.map