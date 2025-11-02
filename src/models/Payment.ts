import mongoose, { Schema, Document, Types } from "mongoose";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentMethod = "card" | "upi" | "netbanking" | "wallet" | "cash";

export interface PaymentDocument extends Document {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  providerId: Types.ObjectId;
  
  // Payment details
  amount: number; // Total amount in paise (INR * 100)
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Commission breakdown
  servicePrice: number; // Provider's service price in paise
  platformCommission: number; // 10% commission in paise
  providerEarnings: number; // 90% earnings in paise
  commissionRate: number; // Commission rate (0.10 for 10%)
  
  // Razorpay details
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayRefundId?: string;
  
  // Transaction details
  transactionId?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  
  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  
  // Refund details
  refundAmount?: number;
  refundReason?: string;
  refundStatus?: "pending" | "completed" | "failed";
  
  // Additional metadata
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    [key: string]: any;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    bookingId: { 
      type: Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true, 
      index: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    providerId: { 
      type: Schema.Types.ObjectId, 
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
    gatewayResponse: { type: Schema.Types.Mixed },
    
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
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

// Indexes for better query performance
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ providerId: 1, status: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });

// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${(this.amount / 100).toFixed(2)}`;
});

// Virtual for formatted provider earnings
PaymentSchema.virtual('formattedProviderEarnings').get(function() {
  return `₹${(this.providerEarnings / 100).toFixed(2)}`;
});

// Virtual for formatted commission
PaymentSchema.virtual('formattedCommission').get(function() {
  return `₹${(this.platformCommission / 100).toFixed(2)}`;
});

// Method to calculate commission
PaymentSchema.methods.calculateCommission = function(servicePrice: number, commissionRate: number = 0.10) {
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
PaymentSchema.methods.updateStatus = function(status: PaymentStatus, additionalData?: any) {
  this.status = status;
  
  if (status === 'completed') {
    this.completedAt = new Date();
  } else if (status === 'failed') {
    this.failedAt = new Date();
  } else if (status === 'refunded') {
    this.refundedAt = new Date();
  }
  
  if (additionalData) {
    Object.assign(this, additionalData);
  }
  
  return this.save();
};

// Method to process refund
PaymentSchema.methods.processRefund = function(amount: number, reason: string) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundStatus = 'pending';
  this.status = 'refunded';
  this.refundedAt = new Date();
  
  return this.save();
};

// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = function(providerId?: string, dateRange?: { start: Date, end: Date }) {
  const match: any = {};
  
  if (providerId) {
    match.providerId = new mongoose.Types.ObjectId(providerId);
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

export const PaymentModel = mongoose.model<PaymentDocument>("Payment", PaymentSchema);
