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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    bookingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    providerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Provider",
        required: true,
        index: true
    },
    // Payment details
    amount: { type: Number, required: true, min: 100 }, // Minimum ₹1
    currency: { type: String, required: true, default: "inr" },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded", "cancelled"],
        default: "pending",
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ["card", "upi", "netbanking", "wallet", "cash"],
        required: true
    },
    // Commission breakdown
    servicePrice: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    providerEarnings: { type: Number, required: true },
    commissionRate: { type: Number, default: 0.10 }, // 10% commission
    // Razorpay details
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    razorpayRefundId: { type: String },
    // Transaction details
    transactionId: { type: String, unique: true, sparse: true },
    gatewayTransactionId: { type: String },
    gatewayResponse: { type: mongoose_1.Schema.Types.Mixed },
    // Timestamps
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
    // Refund details
    refundAmount: { type: Number, min: 0 },
    refundReason: { type: String },
    refundStatus: {
        type: String,
        enum: ["pending", "completed", "failed"]
    },
    // Additional metadata
    metadata: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: true });
// Indexes for better query performance
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ providerId: 1, status: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });
// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function () {
    return `₹${(this.amount / 100).toFixed(2)}`;
});
// Virtual for formatted provider earnings
PaymentSchema.virtual('formattedProviderEarnings').get(function () {
    return `₹${(this.providerEarnings / 100).toFixed(2)}`;
});
// Virtual for formatted commission
PaymentSchema.virtual('formattedCommission').get(function () {
    return `₹${(this.platformCommission / 100).toFixed(2)}`;
});
// Method to calculate commission
PaymentSchema.methods.calculateCommission = function (servicePrice, commissionRate = 0.10) {
    const commission = Math.round(servicePrice * commissionRate);
    const providerEarnings = servicePrice - commission;
    this.servicePrice = servicePrice;
    this.platformCommission = commission;
    this.providerEarnings = providerEarnings;
    this.commissionRate = commissionRate;
    return {
        servicePrice,
        platformCommission: commission,
        providerEarnings,
        commissionRate
    };
};
// Method to update payment status
PaymentSchema.methods.updateStatus = function (status, additionalData) {
    this.status = status;
    if (status === 'completed') {
        this.completedAt = new Date();
    }
    else if (status === 'failed') {
        this.failedAt = new Date();
    }
    else if (status === 'refunded') {
        this.refundedAt = new Date();
    }
    if (additionalData) {
        Object.assign(this, additionalData);
    }
    return this.save();
};
// Method to process refund
PaymentSchema.methods.processRefund = function (amount, reason) {
    this.refundAmount = amount;
    this.refundReason = reason;
    this.refundStatus = 'pending';
    this.status = 'refunded';
    this.refundedAt = new Date();
    return this.save();
};
// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = function (providerId, dateRange) {
    const match = {};
    if (providerId) {
        match.providerId = new mongoose_1.default.Types.ObjectId(providerId);
    }
    if (dateRange) {
        match.createdAt = {
            $gte: dateRange.start,
            $lte: dateRange.end
        };
    }
    return this.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalCommission: { $sum: '$platformCommission' },
                totalProviderEarnings: { $sum: '$providerEarnings' },
                totalPayments: { $sum: 1 },
                averageAmount: { $avg: '$amount' }
            }
        }
    ]);
};
exports.PaymentModel = mongoose_1.default.model("Payment", PaymentSchema);
//# sourceMappingURL=Payment.js.map