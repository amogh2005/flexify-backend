"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Provider_1 = require("../models/Provider");
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Helper function to check authentication
function checkAuth(req, res) {
    if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return false;
    }
    return true;
}
// Get all providers (for admin/customer search)
router.get("/", async (req, res) => {
    try {
        const { category, verified, available, minRating, maxDistance, membershipTier, skillLevel, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (category)
            filter.category = category;
        if (verified !== undefined)
            filter.verified = verified === 'true';
        if (available !== undefined)
            filter.available = available === 'true';
        if (minRating)
            filter.rating = { $gte: parseFloat(minRating) };
        if (membershipTier)
            filter.membershipTier = membershipTier;
        if (skillLevel)
            filter.skillLevel = skillLevel;
        const providers = await Provider_1.ProviderModel.find(filter)
            .populate('userId', 'name email')
            .sort({ trustScore: -1, rating: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await Provider_1.ProviderModel.countDocuments(filter);
        res.json({
            providers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        console.error("Get providers error:", error);
        res.status(500).json({ message: "Failed to get providers" });
    }
});
// NOTE: Place literal routes like "/me" BEFORE param routes like "/:id"
// Get provider profile (authenticated) - Alias for /me
router.get("/me", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        console.log('Looking for provider with userId:', req.user.userId);
        console.log('User role:', req.user.role);
        const provider = await Provider_1.ProviderModel.findOne({ userId: new mongoose_1.default.Types.ObjectId(req.user.userId) })
            .populate('userId', 'name email');
        console.log('Provider found:', provider ? 'Yes' : 'No');
        if (provider) {
            console.log('Provider ID:', provider._id);
        }
        if (!provider) {
            // If user is provider but profile missing, create a minimal profile from User
            if (req.user.role === 'provider') {
                const minimal = await Provider_1.ProviderModel.create({
                    userId: new mongoose_1.default.Types.ObjectId(req.user.userId),
                    category: 'other',
                    description: '',
                    phone: '',
                    location: { type: 'Point', coordinates: [0, 0] },
                    verified: false,
                    phoneVerified: false,
                    available: true,
                    languages: ['English'],
                    availability: {
                        monday: { morning: true, afternoon: true, evening: true },
                        tuesday: { morning: true, afternoon: true, evening: true },
                        wednesday: { morning: true, afternoon: true, evening: true },
                        thursday: { morning: true, afternoon: true, evening: true },
                        friday: { morning: true, afternoon: true, evening: true },
                        saturday: { morning: true, afternoon: true, evening: false },
                        sunday: { morning: false, afternoon: false, evening: false },
                    },
                    serviceRadius: 10,
                    emergencyWork: false,
                    referralEarnings: 0,
                    trainingCompleted: [],
                    totalEarnings: 0,
                    platformFees: 0,
                    withdrawalHistory: [],
                    insuranceOpted: false,
                    supportTickets: [],
                    totalBookings: 0,
                    completedBookings: 0,
                    cancelledBookings: 0,
                    averageResponseTime: 0,
                    customerSatisfactionScore: 0,
                    membershipTier: 'basic',
                    skillLevel: 'beginner',
                    trustScore: 0,
                    verificationStatus: 'pending'
                });
                return res.json(minimal);
            }
            return res.status(404).json({ message: "Provider profile not found" });
        }
        res.json(provider);
    }
    catch (error) {
        console.error("Get provider profile error:", error);
        res.status(500).json({ message: "Failed to get provider profile" });
    }
});
// Get provider by ID (place after literal routes)
router.get("/:id", async (req, res) => {
    try {
        const provider = await Provider_1.ProviderModel.findById(req.params.id)
            .populate('userId', 'name email');
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        res.json(provider);
    }
    catch (error) {
        console.error("Get provider error:", error);
        res.status(500).json({ message: "Failed to get provider" });
    }
});
// Get provider profile (authenticated) - Original endpoint
router.get("/profile/me", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId })
            .populate('userId', 'name email');
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        res.json(provider);
    }
    catch (error) {
        console.error("Get provider profile error:", error);
        res.status(500).json({ message: "Failed to get provider profile" });
    }
});
// Update provider profile
router.put("/profile/me", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const allowedUpdates = [
            'description', 'phone', 'portfolio', 'certifications', 'languages',
            'availability', 'serviceRadius', 'emergencyWork', 'emergencyCharge',
            'bankDetails', 'upiId', 'membershipTier', 'insuranceOpted',
            'emergencyContact', 'preferences', 'yearsOfExperience', 'skillLevel'
        ];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                provider[field] = req.body[field];
            }
        });
        // Recalculate trust score (simplified calculation)
        provider.trustScore = Math.min(100, Math.max(0, (provider.verified ? 20 : 0) +
            (provider.phoneVerified ? 10 : 0) +
            (provider.portfolio?.length || 0) * 5 +
            (provider.certifications?.length || 0) * 10 +
            (provider.completedBookings || 0) * 2));
        await provider.save();
        res.json({
            message: "Profile updated successfully",
            trustScore: provider.trustScore
        });
    }
    catch (error) {
        console.error("Update provider profile error:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
});
// Update availability
router.put("/availability", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { day, timeSlot, available } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        // Update availability manually
        if (provider.availability && day && timeSlot) {
            provider.availability[day][timeSlot] = available;
        }
        await provider.save();
        res.json({ message: "Availability updated successfully" });
    }
    catch (error) {
        console.error("Update availability error:", error);
        res.status(500).json({ message: "Failed to update availability" });
    }
});
// Add portfolio item
router.post("/portfolio", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { name, type, size, url } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const portfolioItem = {
            name,
            type,
            size,
            url,
            uploadedAt: new Date()
        };
        // Add portfolio item manually
        if (!provider.portfolio) {
            provider.portfolio = [];
        }
        provider.portfolio.push(portfolioItem);
        // Recalculate trust score
        provider.trustScore = Math.min(100, Math.max(0, (provider.verified ? 20 : 0) +
            (provider.phoneVerified ? 10 : 0) +
            (provider.portfolio?.length || 0) * 5 +
            (provider.certifications?.length || 0) * 10 +
            (provider.completedBookings || 0) * 2));
        await provider.save();
        res.json({
            message: "Portfolio item added successfully",
            trustScore: provider.trustScore
        });
    }
    catch (error) {
        console.error("Add portfolio item error:", error);
        res.status(500).json({ message: "Failed to add portfolio item" });
    }
});
// Remove portfolio item
router.delete("/portfolio/:index", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const index = parseInt(req.params.index || '0');
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        if (provider.portfolio && index >= 0 && index < provider.portfolio.length) {
            provider.portfolio.splice(index, 1);
            // Recalculate trust score
            provider.trustScore = Math.min(100, Math.max(0, (provider.verified ? 20 : 0) +
                (provider.phoneVerified ? 10 : 0) +
                (provider.portfolio?.length || 0) * 5 +
                (provider.certifications?.length || 0) * 10 +
                (provider.completedBookings || 0) * 2));
            await provider.save();
            res.json({
                message: "Portfolio item removed successfully",
                trustScore: provider.trustScore
            });
        }
        else {
            res.status(400).json({ message: "Invalid portfolio item index" });
        }
    }
    catch (error) {
        console.error("Remove portfolio item error:", error);
        res.status(500).json({ message: "Failed to remove portfolio item" });
    }
});
// Add certification
router.post("/certifications", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { name, type, size, url, issuingAuthority, validUntil } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const certification = {
            name,
            type,
            size,
            url,
            issuingAuthority,
            ...(validUntil && { validUntil: new Date(validUntil) }),
            uploadedAt: new Date()
        };
        // Add certification manually
        if (!provider.certifications) {
            provider.certifications = [];
        }
        provider.certifications.push(certification);
        // Recalculate trust score
        provider.trustScore = Math.min(100, Math.max(0, (provider.verified ? 20 : 0) +
            (provider.phoneVerified ? 10 : 0) +
            (provider.portfolio?.length || 0) * 5 +
            (provider.certifications?.length || 0) * 10 +
            (provider.completedBookings || 0) * 2));
        await provider.save();
        res.json({
            message: "Certification added successfully",
            trustScore: provider.trustScore
        });
    }
    catch (error) {
        console.error("Add certification error:", error);
        res.status(500).json({ message: "Failed to add certification" });
    }
});
// Remove certification
router.delete("/certifications/:index", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const index = parseInt(req.params.index || '0');
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        if (provider.certifications && index >= 0 && index < provider.certifications.length) {
            provider.certifications.splice(index, 1);
            // Recalculate trust score
            provider.trustScore = Math.min(100, Math.max(0, (provider.verified ? 20 : 0) +
                (provider.phoneVerified ? 10 : 0) +
                (provider.portfolio?.length || 0) * 5 +
                (provider.certifications?.length || 0) * 10 +
                (provider.completedBookings || 0) * 2));
            await provider.save();
            res.json({
                message: "Certification removed successfully",
                trustScore: provider.trustScore
            });
        }
        else {
            res.status(400).json({ message: "Invalid certification index" });
        }
    }
    catch (error) {
        console.error("Remove certification error:", error);
        res.status(500).json({ message: "Failed to remove certification" });
    }
});
// Update earnings (called after successful booking completion)
router.put("/earnings", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { amount, platformFee } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        // Update earnings manually
        provider.totalEarnings = (provider.totalEarnings || 0) + (amount || 0);
        provider.platformFees = (provider.platformFees || 0) + (platformFee || 0);
        await provider.save();
        res.json({
            message: "Earnings updated successfully",
            totalEarnings: provider.totalEarnings,
            platformFees: provider.platformFees
        });
    }
    catch (error) {
        console.error("Update earnings error:", error);
        res.status(500).json({ message: "Failed to update earnings" });
    }
});
// Get earnings dashboard
router.get("/earnings/dashboard", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const earningsData = {
            totalEarnings: provider.totalEarnings || 0,
            platformFees: provider.platformFees || 0,
            netEarnings: (provider.totalEarnings || 0) - (provider.platformFees || 0),
            withdrawalHistory: provider.withdrawalHistory || [],
            recentWithdrawals: (provider.withdrawalHistory || [])
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
        };
        res.json(earningsData);
    }
    catch (error) {
        console.error("Get earnings dashboard error:", error);
        res.status(500).json({ message: "Failed to get earnings dashboard" });
    }
});
// Create support ticket
router.post("/support", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { subject, description, priority = "medium" } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const ticketData = {
            id: new Date().getTime().toString(),
            subject: subject,
            description: description,
            priority: priority,
            status: "open",
            createdAt: new Date()
        };
        // Add support ticket manually
        if (!provider.supportTickets) {
            provider.supportTickets = [];
        }
        provider.supportTickets.push(ticketData);
        await provider.save();
        res.json({ message: "Support ticket created successfully" });
    }
    catch (error) {
        console.error("Create support ticket error:", error);
        res.status(500).json({ message: "Failed to create support ticket" });
    }
});
// Get support tickets
router.get("/support", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        res.json(provider.supportTickets || []);
    }
    catch (error) {
        console.error("Get support tickets error:", error);
        res.status(500).json({ message: "Failed to get support tickets" });
    }
});
// Update support ticket status
router.put("/support/:ticketId", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { ticketId } = req.params;
        const { status } = req.body;
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const ticket = provider.supportTickets?.find(t => t.id === ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Support ticket not found" });
        }
        ticket.status = status;
        if (status === "resolved") {
            ticket.resolvedAt = new Date();
        }
        await provider.save();
        res.json({ message: "Support ticket updated successfully" });
    }
    catch (error) {
        console.error("Update support ticket error:", error);
        res.status(500).json({ message: "Failed to update support ticket" });
    }
});
// Get performance metrics
router.get("/performance", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        const performanceData = {
            totalBookings: provider.totalBookings || 0,
            completedBookings: provider.completedBookings || 0,
            cancelledBookings: provider.cancelledBookings || 0,
            completionRate: (provider.totalBookings || 0) > 0
                ? ((provider.completedBookings || 0) / (provider.totalBookings || 1)) * 100
                : 0,
            averageResponseTime: provider.averageResponseTime || 0,
            customerSatisfactionScore: provider.customerSatisfactionScore || 0,
            trustScore: provider.trustScore || 0,
            verificationStatus: provider.verificationStatus || "pending",
            membershipTier: provider.membershipTier || "basic"
        };
        res.json(performanceData);
    }
    catch (error) {
        console.error("Get performance metrics error:", error);
        res.status(500).json({ message: "Failed to get performance metrics" });
    }
});
// Update location
router.put("/location", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { longitude, latitude, address, city, state, country, postalCode } = req.body;
        if (!longitude || !latitude) {
            return res.status(400).json({ message: "Longitude and latitude are required" });
        }
        // Validate coordinates
        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return res.status(400).json({ message: "Invalid coordinates" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        // Update location coordinates
        provider.location.coordinates = [longitude, latitude];
        // Add address details if provided
        if (address || city || state || country || postalCode) {
            provider.location.address = {
                street: address || "",
                city: city || "",
                state: state || "",
                country: country || "",
                postalCode: postalCode || ""
            };
        }
        await provider.save();
        res.json({
            message: "Location updated successfully",
            location: {
                coordinates: provider.location.coordinates,
                address: provider.location.address
            }
        });
    }
    catch (error) {
        console.error("Update location error:", error);
        res.status(500).json({ message: "Failed to update location" });
    }
});
// Get current location
router.get("/location", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        res.json({
            coordinates: provider.location.coordinates,
            address: provider.location.address || null,
            serviceRadius: provider.serviceRadius
        });
    }
    catch (error) {
        console.error("Get location error:", error);
        res.status(500).json({ message: "Failed to get location" });
    }
});
// Update service radius
router.put("/service-radius", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { radius } = req.body;
        if (!radius || radius < 1 || radius > 50) {
            return res.status(400).json({ message: "Service radius must be between 1 and 50 kilometers" });
        }
        const provider = await Provider_1.ProviderModel.findOne({ userId: req.user.userId });
        if (!provider) {
            return res.status(404).json({ message: "Provider profile not found" });
        }
        provider.serviceRadius = radius;
        await provider.save();
        res.json({
            message: "Service radius updated successfully",
            serviceRadius: provider.serviceRadius
        });
    }
    catch (error) {
        console.error("Update service radius error:", error);
        res.status(500).json({ message: "Failed to update service radius" });
    }
});
// Search providers by location (for customers)
router.get("/search/nearby", async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 50, category } = req.query;
        if (!longitude || !latitude) {
            return res.status(400).json({ message: "Longitude and latitude are required" });
        }
        const filter = {
            available: true,
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
                }
            }
        };
        if (category)
            filter.category = category;
        const providers = await Provider_1.ProviderModel.find(filter)
            .populate('userId', 'name email')
            .sort({ trustScore: -1, rating: -1 })
            .limit(50);
        res.json(providers);
    }
    catch (error) {
        console.error("Search nearby providers error:", error);
        res.status(500).json({ message: "Failed to search nearby providers" });
    }
});
// Admin: Update verification status
router.put("/:id/verify", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        const { verificationStatus, verificationNotes } = req.body;
        const provider = await Provider_1.ProviderModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        provider.verificationStatus = verificationStatus;
        if (verificationNotes) {
            provider.verificationNotes = verificationNotes;
        }
        await provider.save();
        res.json({ message: "Verification status updated successfully" });
    }
    catch (error) {
        console.error("Update verification status error:", error);
        res.status(500).json({ message: "Failed to update verification status" });
    }
});
// Admin: Get verification queue
router.get("/admin/verification-queue", auth_1.verifyJwt, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        const providers = await Provider_1.ProviderModel.find({ verificationStatus: "pending" })
            .populate("userId", "name email phone")
            .sort({ trustScore: -1, createdAt: 1 });
        res.json(providers);
    }
    catch (error) {
        console.error("Get verification queue error:", error);
        res.status(500).json({ message: "Failed to get verification queue" });
    }
});
exports.default = router;
//# sourceMappingURL=providers.routes.js.map