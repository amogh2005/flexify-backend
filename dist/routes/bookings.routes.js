"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Booking_1 = require("../models/Booking");
const Provider_1 = require("../models/Provider");
const notifications_1 = require("../services/notifications");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Create new booking with worker selection
router.post("/create", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const bookingSchema = zod_1.z.object({
            workerId: zod_1.z.string().min(1),
            serviceType: zod_1.z.string().min(1),
            serviceCategory: zod_1.z.string().min(1),
            duration: zod_1.z.string().min(1),
            durationValue: zod_1.z.number().min(1),
            location: zod_1.z.string().min(1),
            coordinates: zod_1.z.object({
                lat: zod_1.z.number(),
                lng: zod_1.z.number()
            }),
            timeSlot: zod_1.z.string().min(1),
            date: zod_1.z.string().min(1),
            urgency: zod_1.z.enum(["normal", "urgent", "emergency"]).default("normal"),
            skillTags: zod_1.z.array(zod_1.z.string()).optional(),
            specialRequirements: zod_1.z.string().optional(),
            insuranceRequired: zod_1.z.boolean().default(false),
            backgroundCheckRequired: zod_1.z.boolean().default(false),
            totalPrice: zod_1.z.number().min(0),
            basePrice: zod_1.z.number().min(0),
            surgeMultiplier: zod_1.z.number().min(1),
            insuranceCost: zod_1.z.number().min(0)
        });
        const parsed = bookingSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { workerId, serviceType, serviceCategory, duration, durationValue, location, coordinates, timeSlot, date, urgency, skillTags, specialRequirements, insuranceRequired, backgroundCheckRequired, totalPrice, basePrice, surgeMultiplier, insuranceCost } = parsed.data;
        // Verify worker exists and is verified
        const worker = await Provider_1.ProviderModel.findById(workerId);
        if (!worker) {
            return res.status(404).json({ error: "Worker not found" });
        }
        if (!worker.verified) {
            return res.status(400).json({ error: "Worker is not verified yet" });
        }
        if (!worker.available) {
            return res.status(400).json({ error: "Worker is currently unavailable" });
        }
        // Calculate commission and earnings
        const COMMISSION_RATE = 0.10; // 10% platform commission
        const servicePriceInPaise = totalPrice * 100; // Convert to paise
        const platformCommission = Math.round(servicePriceInPaise * COMMISSION_RATE);
        const providerEarnings = servicePriceInPaise - platformCommission;
        // Create booking with new structure
        const booking = await Booking_1.BookingModel.create({
            userId: req.user.userId,
            providerId: workerId,
            serviceType,
            description: specialRequirements || `${serviceCategory} service`,
            preferredDate: new Date(date),
            preferredTime: timeSlot,
            urgency: urgency === 'emergency' ? 'high' : urgency === 'urgent' ? 'normal' : 'low',
            address: location,
            amount: servicePriceInPaise,
            currency: "inr",
            status: "pending",
            // Commission and earnings (required fields)
            servicePrice: servicePriceInPaise,
            platformCommission: platformCommission,
            providerEarnings: providerEarnings,
            commissionRate: COMMISSION_RATE,
            // Additional fields for new booking structure
            serviceCategory,
            duration,
            durationValue,
            coordinates,
            skillTags,
            insuranceRequired,
            backgroundCheckRequired,
            basePrice: basePrice * 100,
            surgeMultiplier,
            insuranceCost: insuranceCost * 100
        });
        // Populate user and worker details for response
        const populatedBooking = await booking.populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        // Send notification to worker
        await (0, notifications_1.notifyNewBooking)(worker.userId.toString(), {
            id: booking._id,
            serviceType,
            description: specialRequirements || `${serviceCategory} service`,
            preferredDate: date,
            preferredTime: timeSlot,
            urgency: urgency === 'emergency' ? 'high' : urgency === 'urgent' ? 'normal' : 'low',
            address: location
        });
        return res.status(201).json({
            bookingId: booking._id,
            message: "Booking created successfully",
            booking: populatedBooking
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        const message = error?.message || 'Failed to create booking';
        return res.status(500).json({ error: message });
    }
});
// Create new booking (legacy endpoint)
router.post("/", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const bookingSchema = zod_1.z.object({
            providerId: zod_1.z.string().min(1),
            serviceType: zod_1.z.string().min(1),
            description: zod_1.z.string().min(10),
            preferredDate: zod_1.z.string().min(1),
            preferredTime: zod_1.z.string().min(1),
            urgency: zod_1.z.enum(["low", "normal", "high"]).default("normal"),
            budget: zod_1.z.number().optional(),
            address: zod_1.z.string().min(1),
            contactPhone: zod_1.z.string().min(1),
            amount: zod_1.z.number().default(5000), // Default INR 50.00
            currency: zod_1.z.string().default("inr")
        });
        const parsed = bookingSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { providerId, serviceType, description, preferredDate, preferredTime, urgency, budget, address, contactPhone, amount, currency } = parsed.data;
        // Verify provider exists and is verified
        const provider = await Provider_1.ProviderModel.findById(providerId);
        if (!provider) {
            return res.status(404).json({ error: "Provider not found" });
        }
        if (!provider.verified) {
            return res.status(400).json({ error: "Provider is not verified yet" });
        }
        if (!provider.available) {
            return res.status(400).json({ error: "Provider is currently unavailable" });
        }
        // Calculate commission and earnings
        const COMMISSION_RATE = 0.10; // 10% platform commission
        const servicePriceInPaise = amount;
        const platformCommission = Math.round(servicePriceInPaise * COMMISSION_RATE);
        const providerEarnings = servicePriceInPaise - platformCommission;
        const booking = await Booking_1.BookingModel.create({
            userId: req.user.userId,
            providerId,
            serviceType,
            description,
            preferredDate: new Date(preferredDate),
            preferredTime,
            urgency,
            budget,
            address,
            contactPhone,
            amount: servicePriceInPaise,
            currency,
            status: "pending",
            // Commission and earnings (required fields)
            servicePrice: servicePriceInPaise,
            platformCommission: platformCommission,
            providerEarnings: providerEarnings,
            commissionRate: COMMISSION_RATE
        });
        // Populate user and provider details for response
        const populatedBooking = await booking.populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'name email' }
        ]);
        // Send notification to provider
        await (0, notifications_1.notifyNewBooking)(provider.userId.toString(), {
            id: booking._id,
            serviceType,
            description,
            preferredDate,
            preferredTime,
            urgency,
            address
        });
        return res.status(201).json(populatedBooking);
    }
    catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({ error: "Failed to create booking" });
    }
});
// Get user's bookings
router.get("/me", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;
        const match = { userId: req.user.userId };
        if (status)
            match.status = status;
        const docs = await Booking_1.BookingModel.find(match)
            .populate('providerId', 'category description verified')
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        return res.json(docs);
    }
    catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.status(500).json({ error: "Failed to fetch bookings" });
    }
});
// Get provider's bookings
router.get("/provider/me", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.json([]);
        }
        const { status, limit = 100 } = req.query;
        const match = { providerId: provider._id };
        if (status)
            match.status = status;
        const docs = await Booking_1.BookingModel.find(match)
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        return res.json(docs);
    }
    catch (error) {
        console.error('Error fetching provider bookings:', error);
        return res.status(500).json({ error: "Failed to fetch bookings" });
    }
});
// Provider accepts booking
router.patch("/:id/accept", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const { id } = req.params;
        const { providerNotes, estimatedDuration, finalAmount } = req.body;
        // Verify provider owns this booking
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(403).json({ error: "Provider profile not found" });
        }
        const booking = await Booking_1.BookingModel.findOne({ _id: id, providerId: provider._id });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ error: "Booking cannot be accepted in current status" });
        }
        // Update booking status
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            status: "accepted",
            acceptedAt: new Date(),
            providerNotes,
            estimatedDuration,
            finalAmount
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        // Send notification to both user and provider
        await (0, notifications_1.notifyBookingStatusChange)(booking.userId.toString(), provider.userId.toString(), {
            id: booking._id,
            serviceType: booking.serviceType,
            providerNotes,
            estimatedDuration,
            finalAmount
        }, "accepted");
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error accepting booking:', error);
        return res.status(500).json({ error: "Failed to accept booking" });
    }
});
// Provider rejects booking
router.patch("/:id/reject", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({ error: "Rejection reason is required" });
        }
        // Verify provider owns this booking
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(403).json({ error: "Provider profile not found" });
        }
        const booking = await Booking_1.BookingModel.findOne({ _id: id, providerId: provider._id });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ error: "Booking cannot be rejected in current status" });
        }
        // Update booking status
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            status: "rejected",
            rejectedAt: new Date(),
            rejectionReason
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        await (0, notifications_1.notifyBookingStatusChange)(booking.userId.toString(), provider.userId.toString(), { id: booking._id, serviceType: booking.serviceType, rejectionReason }, "rejected");
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error rejecting booking:', error);
        return res.status(500).json({ error: "Failed to reject booking" });
    }
});
// Provider starts work
router.patch("/:id/start", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const { id } = req.params;
        // Verify provider owns this booking
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(403).json({ error: "Provider profile not found" });
        }
        const booking = await Booking_1.BookingModel.findOne({ _id: id, providerId: provider._id });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "accepted") {
            return res.status(400).json({ error: "Booking must be accepted before starting work" });
        }
        // Update booking status
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            status: "in_progress",
            startedAt: new Date()
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        if (updatedBooking) {
            await (0, notifications_1.notifyBookingStatusChange)(booking.userId.toString(), provider.userId.toString(), { id: booking._id, serviceType: booking.serviceType, startedAt: updatedBooking.startedAt }, "started");
        }
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error starting booking:', error);
        return res.status(500).json({ error: "Failed to start booking" });
    }
});
// Provider completes work
router.patch("/:id/complete", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const { id } = req.params;
        const { finalAmount } = req.body;
        // Verify provider owns this booking
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(403).json({ error: "Provider profile not found" });
        }
        const booking = await Booking_1.BookingModel.findOne({ _id: id, providerId: provider._id });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "in_progress") {
            return res.status(400).json({ error: "Booking must be in progress to complete" });
        }
        // Update booking status
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            status: "completed",
            completedAt: new Date(),
            finalAmount: finalAmount || booking.amount
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        if (updatedBooking) {
            await (0, notifications_1.notifyBookingStatusChange)(booking.userId.toString(), provider.userId.toString(), { id: booking._id, serviceType: booking.serviceType, completedAt: updatedBooking.completedAt, finalAmount: updatedBooking.finalAmount }, "completed");
        }
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error completing booking:', error);
        return res.status(500).json({ error: "Failed to complete booking" });
    }
});
// User rates and reviews completed booking
router.patch("/:id/review", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        const reviewSchema = zod_1.z.object({
            rating: zod_1.z.number().min(1).max(5),
            review: zod_1.z.string().min(1).max(500)
        });
        const parsed = reviewSchema.safeParse({ rating, review });
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        // Verify user owns this booking
        const booking = await Booking_1.BookingModel.findOne({ _id: id, userId: req.user.userId });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "completed") {
            return res.status(400).json({ error: "Can only review completed bookings" });
        }
        if (booking.rating) {
            return res.status(400).json({ error: "Booking has already been reviewed" });
        }
        // Update booking with review
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            rating: parsed.data.rating,
            review: parsed.data.review,
            reviewedAt: new Date()
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        // Update provider's average rating
        await updateProviderRating(booking.providerId);
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error adding review:', error);
        return res.status(500).json({ error: "Failed to add review" });
    }
});
// Cancel booking (user only, before accepted)
router.patch("/:id/cancel", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const { id } = req.params;
        // Verify user owns this booking
        const booking = await Booking_1.BookingModel.findOne({ _id: id, userId: req.user.userId });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ error: "Can only cancel pending bookings" });
        }
        // Update booking status
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            status: "cancelled"
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({ error: "Failed to cancel booking" });
    }
});
// Confirm payment (user only, after work completion)
router.patch("/:id/payment-confirmed", auth_1.verifyJwt, (0, auth_1.requireRole)("user"), async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, paymentStatus } = req.body;
        // Verify user owns this booking
        const booking = await Booking_1.BookingModel.findOne({ _id: id, userId: req.user.userId });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        if (booking.status !== "completed") {
            return res.status(400).json({ error: "Can only confirm payment for completed bookings" });
        }
        if (!paymentMethod) {
            return res.status(400).json({ error: "Payment method is required" });
        }
        // Update booking with payment details
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus || 'paid',
            paidAt: new Date()
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error confirming payment:', error);
        return res.status(500).json({ error: "Failed to confirm payment" });
    }
});
// Accept payment (provider only, after work completion)
router.patch("/:id/payment-accepted", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;
        // Verify provider owns this booking
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(403).json({ error: "Provider profile not found" });
        }
        const booking = await Booking_1.BookingModel.findOne({ _id: id, providerId: provider._id });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found or you don't have permission to access it" });
        }
        if (booking.status !== "completed") {
            return res.status(400).json({ error: "Can only accept payment for completed bookings" });
        }
        // Check if already paid
        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ error: "Payment already accepted for this booking" });
        }
        // Update booking with payment acceptance first
        const updatedBooking = await Booking_1.BookingModel.findByIdAndUpdate(id, {
            paymentStatus: paymentStatus || 'paid',
            paymentAcceptedAt: new Date()
        }, { new: true }).populate([
            { path: 'userId', select: 'name email' },
            { path: 'providerId', select: 'category description' }
        ]);
        // Update provider earnings if not already updated
        // Check if payment was already accepted to avoid duplicate earnings
        if (!booking.paymentAcceptedAt) {
            try {
                // Calculate earnings if not set on booking
                const earningsToAdd = booking.providerEarnings || booking.amount || 0;
                if (earningsToAdd > 0) {
                    provider.totalEarnings = (provider.totalEarnings || 0) + earningsToAdd;
                    provider.availableBalance = (provider.availableBalance || 0) + earningsToAdd;
                    provider.completedBookings = (provider.completedBookings || 0) + 1;
                    await provider.save();
                    console.log('Updated provider earnings:', earningsToAdd);
                }
            }
            catch (earningsError) {
                // Log but don't fail the request
                console.error('Error updating provider earnings:', earningsError.message);
            }
        }
        return res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error accepting payment:', error);
        return res.status(500).json({ error: error.message || "Failed to accept payment" });
    }
});
// Get single booking details
router.get("/:id", auth_1.verifyJwt, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.user;
        let match = { _id: id };
        // Users can only see their own bookings, providers can only see bookings assigned to them
        if (role === "user") {
            match.userId = userId;
        }
        else if (role === "provider") {
            const provider = await Provider_1.ProviderModel.findOne({ userId });
            if (!provider) {
                return res.status(403).json({ error: "Provider profile not found" });
            }
            match.providerId = provider._id;
        }
        const booking = await Booking_1.BookingModel.findOne(match).populate([
            { path: 'userId', select: 'name email phone' },
            { path: 'providerId', select: 'category description verified' }
        ]);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        return res.json(booking);
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({ error: "Failed to fetch booking" });
    }
});
// Helper function to update provider's average rating
async function updateProviderRating(providerId) {
    try {
        const ratings = await Booking_1.BookingModel.find({
            providerId,
            rating: { $exists: true, $ne: null }
        }).select('rating');
        if (ratings.length > 0) {
            const averageRating = ratings.reduce((sum, booking) => sum + booking.rating, 0) / ratings.length;
            await Provider_1.ProviderModel.findByIdAndUpdate(providerId, { rating: averageRating });
        }
    }
    catch (error) {
        console.error('Error updating provider rating:', error);
    }
}
exports.default = router;
//# sourceMappingURL=bookings.routes.js.map