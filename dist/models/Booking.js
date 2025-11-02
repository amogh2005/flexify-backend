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
exports.BookingModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BookingSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    providerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Provider", required: true, index: true },
    // Service details
    serviceType: { type: String, required: true },
    description: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true },
    urgency: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    budget: { type: Number },
    address: { type: String, required: true },
    contactPhone: { type: String },
    // New fields for User Booking Panel
    serviceCategory: { type: String },
    duration: { type: String },
    durationValue: { type: Number },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    skillTags: [{ type: String }],
    insuranceRequired: { type: Boolean, default: false },
    backgroundCheckRequired: { type: Boolean, default: false },
    basePrice: { type: Number },
    surgeMultiplier: { type: Number, default: 1 },
    insuranceCost: { type: Number, default: 0 },
    // Workflow fields
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "in_progress", "completed", "cancelled"],
        default: "pending",
        index: true
    },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    // Provider response
    providerNotes: { type: String },
    estimatedDuration: { type: String },
    finalAmount: { type: Number },
    // Payment fields
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "inr" },
    paymentIntentId: { type: String },
    clientSecret: { type: String },
    paymentStatus: {
        type: String,
        enum: [
            "unpaid",
            "requires_payment_method",
            "requires_confirmation",
            "processing",
            "requires_action",
            "canceled",
            "succeeded",
            "refunded",
            "paid"
        ],
        default: "unpaid",
        index: true
    },
    paidAt: { type: Date },
    // Commission and earnings
    servicePrice: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    providerEarnings: { type: Number, required: true },
    commissionRate: { type: Number, default: 0.10 }, // 10% commission
    // Payment gateway details
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentMethod: {
        type: String,
        enum: ["card", "upi", "netbanking", "wallet", "UPI", "Cash"]
    },
    paymentAcceptedAt: { type: Date },
    // Rating and review
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
    reviewedAt: { type: Date },
}, { timestamps: true });
// Indexes for better query performance
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ providerId: 1, status: 1 });
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ preferredDate: 1 });
exports.BookingModel = mongoose_1.default.model("Booking", BookingSchema);
//# sourceMappingURL=Booking.js.map