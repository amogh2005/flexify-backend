import { Router } from "express";
import { verifyJwt, requireRole } from "../middleware/auth";
import { ProviderModel } from "../models/Provider";
import { UserModel } from "../models/User";
import { BookingModel } from "../models/Booking";

const router = Router();

// Admin: verify provider
router.post("/providers/:id/verify", verifyJwt, requireRole("admin"), async (req, res) => {
	const { id } = req.params;
	const doc = await ProviderModel.findByIdAndUpdate(id, { verified: true }, { new: true });
	if (!doc) return res.status(404).json({ error: "Not found" });
	return res.json(doc);
});

// Admin: reject provider
router.post("/providers/:id/reject", verifyJwt, requireRole("admin"), async (req, res) => {
	const { id } = req.params;
	const { reason } = req.body;
	
	const doc = await ProviderModel.findByIdAndUpdate(
		id, 
		{ 
			verified: false,
			rejectionReason: reason,
			rejectedAt: new Date()
		}, 
		{ new: true }
	);
	
	if (!doc) return res.status(404).json({ error: "Provider not found" });
	return res.json(doc);
});

// Admin: list unverified
router.get("/providers/pending", verifyJwt, requireRole("admin"), async (_req, res) => {
	try {
		const docs = await ProviderModel.find({ verified: false })
			.populate('userId', 'name email')
			.limit(200)
			.sort({ createdAt: -1 });
		return res.json(docs);
	} catch (error) {
		console.error('Error fetching pending providers:', error);
		return res.status(500).json({ error: 'Failed to fetch pending providers' });
	}
});

// Admin: list all providers
router.get("/providers", verifyJwt, requireRole("admin"), async (req, res) => {
	try {
		const { verified, category, limit = 200 } = req.query;
		
		const match: any = {};
		if (verified !== undefined) match.verified = verified === 'true';
		if (category) match.category = category;
		
		const docs = await ProviderModel.find(match)
			.populate('userId', 'name email blocked')
			.limit(Number(limit))
			.sort({ verified: -1, createdAt: -1 });
		
		return res.json(docs);
	} catch (error) {
		console.error('Error fetching providers:', error);
		return res.status(500).json({ error: 'Failed to fetch providers' });
	}
});

// Admin: list all users
router.get("/users", verifyJwt, requireRole("admin"), async (req, res) => {
	try {
		const { role, blocked, limit = 200 } = req.query;
		
		const match: any = {};
		if (role) match.role = role;
		if (blocked !== undefined) match.blocked = blocked === 'true';
		
		const docs = await UserModel.find(match)
			.select('-passwordHash')
			.limit(Number(limit))
			.sort({ createdAt: -1 });
		
		return res.json(docs);
	} catch (error) {
		console.error('Error fetching users:', error);
		return res.status(500).json({ error: 'Failed to fetch users' });
	}
});

// Admin: update user (block/unblock)
router.patch("/users/:id", verifyJwt, requireRole("admin"), async (req, res) => {
	try {
		const { id } = req.params;
		const { blocked } = req.body;
		
		const doc = await UserModel.findByIdAndUpdate(
			id, 
			{ blocked: Boolean(blocked) }, 
			{ new: true }
		).select('-passwordHash');
		
		if (!doc) return res.status(404).json({ error: "User not found" });
		return res.json(doc);
	} catch (error) {
		console.error('Error updating user:', error);
		return res.status(500).json({ error: 'Failed to update user' });
	}
});

// Admin: list all bookings
router.get("/bookings", verifyJwt, requireRole("admin"), async (req, res) => {
	try {
		const { status, limit = 200 } = req.query;
		
		const match: any = {};
		if (status) match.status = status;
		
		const docs = await BookingModel.find(match)
			.populate('userId', 'name email')
			.populate('providerId', 'category')
			.limit(Number(limit))
			.sort({ createdAt: -1 });
		
		return res.json(docs);
	} catch (error) {
		console.error('Error fetching bookings:', error);
		return res.status(500).json({ error: 'Failed to fetch bookings' });
	}
});

export default router;


