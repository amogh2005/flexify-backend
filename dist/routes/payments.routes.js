"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Payment_1 = require("../models/Payment");
const Booking_1 = require("../models/Booking");
const Provider_1 = require("../models/Provider");
const auth_1 = require("../middleware/auth");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// Initialize Razorpay
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_key'
});
// Commission rate (10%)
const COMMISSION_RATE = 0.10;
// Utility function to format amount for Razorpay (convert paise to rupees)
const formatAmount = (amountInPaise) => {
    return Math.round(amountInPaise / 100);
};
// Utility function to convert rupees to paise
const convertToPaise = (amountInRupees) => {
    return Math.round(amountInRupees * 100);
};
// Create payment order
router.post('/create-order', auth_1.verifyJwt, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user?.userId;
        if (!bookingId) {
            return res.status(400).json({ error: 'Booking ID is required' });
        }
        // Get booking details
        const booking = await Booking_1.BookingModel.findById(bookingId)
            .populate('providerId', 'servicePrice')
            .populate('userId', 'name email phone');
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to booking' });
        }
        if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'succeeded') {
            return res.status(400).json({ error: 'Booking is already paid' });
        }
        // Get provider's service price
        const provider = await Provider_1.ProviderModel.findById(booking.providerId);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        const servicePrice = provider.servicePrice;
        const platformCommission = Math.round(servicePrice * COMMISSION_RATE);
        const providerEarnings = servicePrice - platformCommission;
        // Update booking with payment details
        booking.servicePrice = servicePrice;
        booking.platformCommission = platformCommission;
        booking.providerEarnings = providerEarnings;
        booking.commissionRate = COMMISSION_RATE;
        booking.amount = servicePrice;
        booking.paymentStatus = 'processing';
        await booking.save();
        // Create Razorpay order
        const orderOptions = {
            amount: formatAmount(servicePrice),
            currency: 'INR',
            receipt: `booking_${bookingId}_${Date.now()}`,
            notes: {
                bookingId: bookingId.toString(),
                userId: userId,
                providerId: booking.providerId.toString(),
                serviceType: booking.serviceType
            }
        };
        const order = await razorpay.orders.create(orderOptions);
        // Create payment record
        const payment = new Payment_1.PaymentModel({
            bookingId: booking._id,
            userId: booking.userId,
            providerId: booking.providerId,
            amount: servicePrice,
            currency: 'inr',
            status: 'pending',
            paymentMethod: 'card', // Default, will be updated based on actual payment method
            servicePrice,
            platformCommission,
            providerEarnings,
            commissionRate: COMMISSION_RATE,
            razorpayOrderId: order.id,
            initiatedAt: new Date()
        });
        await payment.save();
        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            payment: {
                id: payment._id,
                amount: servicePrice,
                formattedAmount: `₹${(servicePrice / 100).toFixed(2)}`,
                servicePrice: servicePrice,
                platformCommission: platformCommission,
                providerEarnings: providerEarnings,
                formattedServicePrice: `₹${(servicePrice / 100).toFixed(2)}`,
                formattedCommission: `₹${(platformCommission / 100).toFixed(2)}`,
                formattedProviderEarnings: `₹${(providerEarnings / 100).toFixed(2)}`
            }
        });
    }
    catch (error) {
        console.error('Error creating payment order:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});
// Verify payment
router.post('/verify-payment', auth_1.verifyJwt, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method } = req.body;
        const userId = req.user?.userId;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification data' });
        }
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'test_secret_key')
            .update(body.toString())
            .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (!isAuthentic) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // Find payment record
        const payment = await Payment_1.PaymentModel.findOne({ razorpayOrderId: razorpay_order_id });
        if (!payment) {
            return res.status(404).json({ error: 'Payment record not found' });
        }
        // Update payment status
        payment.status = 'completed';
        payment.completedAt = new Date();
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.paymentMethod = payment_method || 'card';
        payment.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await payment.save();
        // Update booking status
        const booking = await Booking_1.BookingModel.findById(payment.bookingId);
        if (booking) {
            booking.paymentStatus = 'paid';
            booking.paidAt = new Date();
            booking.razorpayOrderId = razorpay_order_id;
            booking.razorpayPaymentId = razorpay_payment_id;
            booking.razorpaySignature = razorpay_signature;
            booking.paymentMethod = payment_method || 'card';
            await booking.save();
        }
        // Update provider earnings
        const provider = await Provider_1.ProviderModel.findById(payment.providerId);
        if (provider) {
            provider.totalEarnings += payment.providerEarnings;
            provider.platformFees += payment.platformCommission;
            provider.availableBalance += payment.providerEarnings;
            provider.completedBookings += 1;
            await provider.save();
        }
        res.json({
            success: true,
            message: 'Payment verified successfully',
            payment: {
                id: payment._id,
                transactionId: payment.transactionId,
                amount: payment.amount,
                formattedAmount: `₹${(payment.amount / 100).toFixed(2)}`,
                status: payment.status,
                providerEarnings: payment.providerEarnings,
                formattedProviderEarnings: `₹${(payment.providerEarnings / 100).toFixed(2)}`,
                platformCommission: payment.platformCommission,
                formattedCommission: `₹${(payment.platformCommission / 100).toFixed(2)}`
            }
        });
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});
// Get payment details
router.get('/:paymentId', auth_1.verifyJwt, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.userId;
        const payment = await Payment_1.PaymentModel.findById(paymentId)
            .populate('bookingId', 'serviceType description preferredDate preferredTime')
            .populate('providerId', 'category servicePrice')
            .populate('userId', 'name email');
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        // Check if user has access to this payment
        if (payment.userId.toString() !== userId && payment.providerId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to payment' });
        }
        res.json({
            success: true,
            payment: {
                id: payment._id,
                transactionId: payment.transactionId,
                amount: payment.amount,
                formattedAmount: `₹${(payment.amount / 100).toFixed(2)}`,
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                servicePrice: payment.servicePrice,
                formattedServicePrice: `₹${(payment.servicePrice / 100).toFixed(2)}`,
                platformCommission: payment.platformCommission,
                formattedCommission: `₹${(payment.platformCommission / 100).toFixed(2)}`,
                providerEarnings: payment.providerEarnings,
                formattedProviderEarnings: `₹${(payment.providerEarnings / 100).toFixed(2)}`,
                commissionRate: payment.commissionRate,
                initiatedAt: payment.initiatedAt,
                completedAt: payment.completedAt,
                booking: payment.bookingId,
                provider: payment.providerId,
                user: payment.userId
            }
        });
    }
    catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ error: 'Failed to fetch payment details' });
    }
});
// Get provider earnings
router.get('/provider/earnings', auth_1.verifyJwt, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        // Find provider
        const provider = await Provider_1.ProviderModel.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        // Build date filter
        const dateFilter = { providerId: provider._id, status: 'completed' };
        if (startDate && endDate) {
            dateFilter.completedAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        // Get payment statistics
        const stats = await Payment_1.PaymentModel.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$providerEarnings' },
                    totalCommission: { $sum: '$platformCommission' },
                    totalAmount: { $sum: '$amount' },
                    totalPayments: { $sum: 1 },
                    averageEarnings: { $avg: '$providerEarnings' }
                }
            }
        ]);
        // Get recent payments
        const recentPayments = await Payment_1.PaymentModel.find(dateFilter)
            .populate('bookingId', 'serviceType preferredDate')
            .populate('userId', 'name')
            .sort({ completedAt: -1 })
            .limit(10);
        const result = stats[0] || {
            totalEarnings: 0,
            totalCommission: 0,
            totalAmount: 0,
            totalPayments: 0,
            averageEarnings: 0
        };
        res.json({
            success: true,
            earnings: {
                totalEarnings: result.totalEarnings,
                formattedTotalEarnings: `₹${(result.totalEarnings / 100).toFixed(2)}`,
                totalCommission: result.totalCommission,
                formattedTotalCommission: `₹${(result.totalCommission / 100).toFixed(2)}`,
                totalAmount: result.totalAmount,
                formattedTotalAmount: `₹${(result.totalAmount / 100).toFixed(2)}`,
                totalPayments: result.totalPayments,
                averageEarnings: result.averageEarnings,
                formattedAverageEarnings: `₹${(result.averageEarnings / 100).toFixed(2)}`,
                availableBalance: provider.availableBalance,
                formattedAvailableBalance: `₹${(provider.availableBalance / 100).toFixed(2)}`
            },
            recentPayments: recentPayments.map(payment => ({
                id: payment._id,
                amount: payment.amount,
                formattedAmount: `₹${(payment.amount / 100).toFixed(2)}`,
                providerEarnings: payment.providerEarnings,
                formattedProviderEarnings: `₹${(payment.providerEarnings / 100).toFixed(2)}`,
                platformCommission: payment.platformCommission,
                formattedCommission: `₹${(payment.platformCommission / 100).toFixed(2)}`,
                status: payment.status,
                completedAt: payment.completedAt,
                serviceType: payment.bookingId?.serviceType || 'Service',
                clientName: payment.userId?.name || 'Client'
            }))
        });
    }
    catch (error) {
        console.error('Error fetching provider earnings:', error);
        res.status(500).json({ error: 'Failed to fetch provider earnings' });
    }
});
// Process refund
router.post('/refund', auth_1.verifyJwt, async (req, res) => {
    try {
        const { paymentId, amount, reason } = req.body;
        const userId = req.user?.userId;
        if (!paymentId || !amount || !reason) {
            return res.status(400).json({ error: 'Payment ID, amount, and reason are required' });
        }
        const payment = await Payment_1.PaymentModel.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        // Check if user has access to this payment
        if (payment.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to payment' });
        }
        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Only completed payments can be refunded' });
        }
        // Process refund with Razorpay
        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: formatAmount(amount),
            notes: {
                reason: reason,
                paymentId: paymentId
            }
        });
        // Update payment record
        payment.refundAmount = convertToPaise(refund.amount);
        payment.refundReason = reason;
        payment.refundStatus = 'completed';
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        payment.razorpayRefundId = refund.id;
        await payment.save();
        // Update booking status
        const booking = await Booking_1.BookingModel.findById(payment.bookingId);
        if (booking) {
            booking.paymentStatus = 'refunded';
            await booking.save();
        }
        // Update provider earnings (deduct refunded amount)
        const provider = await Provider_1.ProviderModel.findById(payment.providerId);
        if (provider) {
            provider.totalEarnings -= payment.providerEarnings;
            provider.availableBalance -= payment.providerEarnings;
            await provider.save();
        }
        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: {
                id: refund.id,
                amount: refund.amount || 0,
                formattedAmount: `₹${((refund.amount || 0) / 100).toFixed(2)}`,
                status: refund.status
            }
        });
    }
    catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map