import mongoose, { Schema, Document, Types } from "mongoose";

export interface ProviderDocument extends Document {
	userId: Types.ObjectId;
	category: "driver" | "cook" | "plumber" | "electrician" | "cleaner" | "maid" ;
	description?: string;
	phone?: string;
	location: {
		type: "Point";
		coordinates: [number, number]; // [lng, lat]
		address?: {
			street: string;
			city: string;
			state: string;
			country: string;
			postalCode: string;
		};
	};
	verified: boolean;
	idDocumentUrl?: string;
	phoneVerified: boolean;
	rating?: number;
	available: boolean;
	
	// Profile Enrichment
	portfolio?: Array<{
		name: string;
		type: string;
		size: number;
		url: string;
		uploadedAt: Date;
	}>;
	certifications?: Array<{
		name: string;
		type: string;
		size: number;
		url: string;
		uploadedAt: Date;
		issuingAuthority?: string;
		validUntil?: Date;
	}>;
	languages: string[];
	
	// Verification and Trust
	backgroundCheck: boolean;
	backgroundCheckDate?: Date;
	skillTestCompleted: boolean;
	skillTestScore?: number;
	skillTestDate?: Date;
	trustScore: number;
	verificationStatus: "pending" | "verified" | "rejected";
	verificationNotes?: string;
	
	// Availability and Flexibility
	availability: {
		monday: { morning: boolean; afternoon: boolean; evening: boolean };
		tuesday: { morning: boolean; afternoon: boolean; evening: boolean };
		wednesday: { morning: boolean; afternoon: boolean; evening: boolean };
		thursday: { morning: boolean; afternoon: boolean; evening: boolean };
		friday: { morning: boolean; afternoon: boolean; evening: boolean };
		saturday: { morning: boolean; afternoon: boolean; evening: boolean };
		sunday: { morning: boolean; afternoon: boolean; evening: boolean };
	};
	serviceRadius: number; // in kilometers
	emergencyWork: boolean;
	leaveDays?: Date[];
	preferredTimeSlots?: string[];
	
	// Engagement and Growth
	membershipTier: "basic" | "verified" | "premium";
	referralCode?: string;
	referredBy?: string;
	referralEarnings: number;
	trainingCompleted: string[];
	skillLevel: "beginner" | "intermediate" | "expert";
	yearsOfExperience?: number;
	
	// Service Pricing
	servicePrice: number; // Base price for the service in paise (INR * 100)
	pricePerHour?: number; // Optional hourly rate in paise
	emergencyCharge?: number; // Emergency service charge in paise
	minimumCharge?: number; // Minimum charge for any service in paise
	
	// Earnings & Financial Tools
	bankDetails?: {
		accountNumber: string;
		ifscCode: string;
		accountHolderName: string;
		bankName?: string;
	};
	upiId?: string;
	totalEarnings: number; // Total earnings in paise
	platformFees: number; // Total platform fees paid in paise
	availableBalance: number; // Available balance for withdrawal in paise
	withdrawalHistory: Array<{
		amount: number;
		date: Date;
		status: "pending" | "completed" | "failed";
		transactionId?: string;
		method: "bank_transfer" | "upi";
	}>;
	
	// Insurance and Benefits
	insuranceOpted: boolean;
	insuranceDetails?: {
		policyNumber: string;
		provider: string;
		coverage: string;
		validUntil: Date;
	};
	
	// Communication & Support
	supportTickets: Array<{
		id: string;
		subject: string;
		description: string;
		status: "open" | "in_progress" | "resolved" | "closed";
		createdAt: Date;
		resolvedAt?: Date;
		priority: "low" | "medium" | "high" | "urgent";
	}>;
	
	// Performance Metrics
	totalBookings: number;
	completedBookings: number;
	cancelledBookings: number;
	averageResponseTime: number; // in minutes
	customerSatisfactionScore: number;
	
	// Additional Information
	emergencyContact?: {
		name: string;
		phone: string;
		relationship: string;
	};
	preferences?: {
		workType: "full_time" | "part_time" | "freelance";
		paymentMethod: "cash" | "online" | "both";
		communicationPreference: "call" | "message" | "both";
	};
	
	createdAt: Date;
	updatedAt: Date;
}

const ProviderSchema = new Schema<ProviderDocument>(
	{
		userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		category: { 
			type: String, 
			required: true, 
			index: true,
			enum: ["driver", "cook", "plumber", "electrician", "cleaner", "maid"],
			message: "Category must be one of: driver, cook, plumber, electrician, cleaner, maid"
		},
		description: { type: String },
		location: {
			type: { type: String, enum: ["Point"], required: true, default: "Point" },
			coordinates: { type: [Number], required: true, index: "2dsphere" },
			address: {
				street: String,
				city: String,
				state: String,
				country: String,
				postalCode: String
			}
		},
		verified: { type: Boolean, default: false, index: true },
		idDocumentUrl: { type: String },
		phoneVerified: { type: Boolean, default: false },
		rating: { type: Number, default: 0 },
		available: { type: Boolean, default: true },
		
		// Profile Enrichment
		portfolio: [{
			name: { type: String, required: true },
			type: { type: String, required: true },
			size: { type: Number, required: true },
			url: { type: String, required: true },
			uploadedAt: { type: Date, default: Date.now }
		}],
		certifications: [{
			name: { type: String, required: true },
			type: { type: String, required: true },
			size: { type: Number, required: true },
			url: { type: String, required: true },
			uploadedAt: { type: Date, default: Date.now },
			issuingAuthority: String,
			validUntil: Date
		}],
		languages: { type: [String], default: ["English"] },
		
		// Verification and Trust
		backgroundCheck: { type: Boolean, default: false },
		backgroundCheckDate: Date,
		skillTestCompleted: { type: Boolean, default: false },
		skillTestScore: { type: Number, min: 0, max: 100 },
		skillTestDate: Date,
		trustScore: { type: Number, default: 0, min: 0, max: 100 },
		verificationStatus: { 
			type: String, 
			enum: ["pending", "verified", "rejected"], 
			default: "pending",
			index: true
		},
		verificationNotes: String,
		
		// Availability and Flexibility
		availability: {
			monday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: true }
			},
			tuesday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: true }
			},
			wednesday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: true }
			},
			thursday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: true }
			},
			friday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: true }
			},
			saturday: {
				morning: { type: Boolean, default: true },
				afternoon: { type: Boolean, default: true },
				evening: { type: Boolean, default: false }
			},
			sunday: {
				morning: { type: Boolean, default: false },
				afternoon: { type: Boolean, default: false },
				evening: { type: Boolean, default: false }
			}
		},
		serviceRadius: { type: Number, default: 10, min: 1, max: 50 },
		emergencyWork: { type: Boolean, default: false },
		leaveDays: [Date],
		preferredTimeSlots: [String],
		
		// Engagement and Growth
		membershipTier: { 
			type: String, 
			enum: ["basic", "verified", "premium"], 
			default: "basic",
			index: true
		},
		referralCode: String,
		referredBy: String,
		referralEarnings: { type: Number, default: 0 },
		trainingCompleted: [String],
		skillLevel: { 
			type: String, 
			enum: ["beginner", "intermediate", "expert"], 
			default: "beginner" 
		},
		yearsOfExperience: { type: Number, min: 0 },
		
		// Service Pricing
		servicePrice: { type: Number, required: true, min: 100 }, // Minimum ₹1
		pricePerHour: { type: Number, min: 100 },
		emergencyCharge: { type: Number, min: 100 },
		minimumCharge: { type: Number, min: 100 },
		
		// Earnings & Financial Tools
		bankDetails: {
			accountNumber: String,
			ifscCode: String,
			accountHolderName: String,
			bankName: String
		},
		upiId: String,
		totalEarnings: { type: Number, default: 0 },
		platformFees: { type: Number, default: 0 },
		availableBalance: { type: Number, default: 0 },
		withdrawalHistory: [{
			amount: { type: Number, required: true },
			date: { type: Date, default: Date.now },
			status: { 
				type: String, 
				enum: ["pending", "completed", "failed"], 
				default: "pending" 
			},
			transactionId: String,
			method: { 
				type: String, 
				enum: ["bank_transfer", "upi"], 
				required: true 
			}
		}],
		
		// Insurance and Benefits
		insuranceOpted: { type: Boolean, default: false },
		insuranceDetails: {
			policyNumber: String,
			provider: String,
			coverage: String,
			validUntil: Date
		},
		
		// Communication & Support
		supportTickets: [{
			id: { type: String, required: true },
			subject: { type: String, required: true },
			description: { type: String, required: true },
			status: { 
				type: String, 
				enum: ["open", "in_progress", "resolved", "closed"], 
				default: "open" 
			},
			createdAt: { type: Date, default: Date.now },
			resolvedAt: Date,
			priority: { 
				type: String, 
				enum: ["low", "medium", "high", "urgent"], 
				default: "medium" 
			}
		}],
		
		// Performance Metrics
		totalBookings: { type: Number, default: 0 },
		completedBookings: { type: Number, default: 0 },
		cancelledBookings: { type: Number, default: 0 },
		averageResponseTime: { type: Number, default: 0 },
		customerSatisfactionScore: { type: Number, default: 0, min: 0, max: 5 },
		
		// Additional Information
		emergencyContact: {
			name: String,
			phone: String,
			relationship: String
		},
		preferences: {
			workType: { 
				type: String, 
				enum: ["full_time", "part_time", "freelance"], 
				default: "part_time" 
			},
			paymentMethod: { 
				type: String, 
				enum: ["cash", "online", "both"], 
				default: "both" 
			},
			communicationPreference: { 
				type: String, 
				enum: ["call", "message", "both"], 
				default: "both" 
			}
		}
	},
	{ timestamps: true }
);

// Indexes for better query performance
ProviderSchema.index({ "verificationStatus": 1, "trustScore": -1 });
ProviderSchema.index({ "membershipTier": 1, "rating": -1 });
ProviderSchema.index({ "category": 1, "available": 1, "location": "2dsphere" });
ProviderSchema.index({ "skillTestCompleted": 1, "backgroundCheck": 1 });

// Virtual for profile completeness percentage
ProviderSchema.virtual('profileCompleteness').get(function() {
	let score = 0;
	if (this.description) score += 10;
	if (this.portfolio && this.portfolio.length > 0) score += 15;
	if (this.certifications && this.certifications.length > 0) score += 15;
	if (this.phoneVerified) score += 10;
	if (this.skillTestCompleted) score += 10;
	if (this.backgroundCheck) score += 10;
	if (this.bankDetails && this.bankDetails.accountNumber) score += 10;
	if (this.languages && this.languages.length > 1) score += 5;
	if (this.yearsOfExperience) score += 5;
	return Math.min(score, 100);
});

// Method to calculate trust score
ProviderSchema.methods.calculateTrustScore = function() {
	let score = 0;
	
	// Basic verification
	if (this.phoneVerified) score += 15;
	if (this.idDocumentUrl) score += 10;
	if (this.backgroundCheck) score += 15;
	if (this.skillTestCompleted) score += 15;
	
	// Profile enrichment
	if (this.description) score += 10;
	if (this.portfolio && this.portfolio.length > 0) score += 10;
	if (this.certifications && this.certifications.length > 0) score += 10;
	
	// Performance metrics
	if (this.rating > 4) score += 5;
	if (this.completedBookings > 10) score += 5;
	if (this.customerSatisfactionScore > 4) score += 5;
	
	return Math.min(score, 100);
};

// Method to update availability
ProviderSchema.methods.updateAvailability = function(day: string, timeSlot: string, available: boolean) {
	if (this.availability[day] && this.availability[day].hasOwnProperty(timeSlot)) {
		this.availability[day][timeSlot] = available;
		return this.save();
	}
	throw new Error('Invalid day or time slot');
};

// Method to add portfolio item
ProviderSchema.methods.addPortfolioItem = function(item: any) {
	this.portfolio.push(item);
	return this.save();
};

// Method to add certification
ProviderSchema.methods.addCertification = function(cert: any) {
	this.certifications.push(cert);
	return this.save();
};

// Method to update earnings
ProviderSchema.methods.updateEarnings = function(amount: number, platformFee: number = 0) {
	this.totalEarnings += amount;
	this.platformFees += platformFee;
	return this.save();
};

// Method to create support ticket
ProviderSchema.methods.createSupportTicket = function(ticketData: any) {
	const ticket = {
		id: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		...ticketData,
		createdAt: new Date()
	};
	this.supportTickets.push(ticket);
	return this.save();
};

export const ProviderModel = mongoose.model<ProviderDocument>("Provider", ProviderSchema);


