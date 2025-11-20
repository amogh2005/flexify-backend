import mongoose, { Document, Types } from "mongoose";
export interface ProviderDocument extends Document {
    userId: Types.ObjectId;
    category: "driver" | "cook" | "plumber" | "electrician" | "cleaner" | "maid" ;
    description?: string;
    phone?: string;
    location: {
        type: "Point";
        coordinates: [number, number];
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
    backgroundCheck: boolean;
    backgroundCheckDate?: Date;
    skillTestCompleted: boolean;
    skillTestScore?: number;
    skillTestDate?: Date;
    trustScore: number;
    verificationStatus: "pending" | "verified" | "rejected";
    verificationNotes?: string;
    availability: {
        monday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        tuesday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        wednesday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        thursday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        friday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        saturday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
        sunday: {
            morning: boolean;
            afternoon: boolean;
            evening: boolean;
        };
    };
    serviceRadius: number;
    emergencyWork: boolean;
    leaveDays?: Date[];
    preferredTimeSlots?: string[];
    membershipTier: "basic" | "verified" | "premium";
    referralCode?: string;
    referredBy?: string;
    referralEarnings: number;
    trainingCompleted: string[];
    skillLevel: "beginner" | "intermediate" | "expert";
    yearsOfExperience?: number;
    servicePrice: number;
    pricePerHour?: number;
    emergencyCharge?: number;
    minimumCharge?: number;
    bankDetails?: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName?: string;
    };
    upiId?: string;
    totalEarnings: number;
    platformFees: number;
    availableBalance: number;
    withdrawalHistory: Array<{
        amount: number;
        date: Date;
        status: "pending" | "completed" | "failed";
        transactionId?: string;
        method: "bank_transfer" | "upi";
    }>;
    insuranceOpted: boolean;
    insuranceDetails?: {
        policyNumber: string;
        provider: string;
        coverage: string;
        validUntil: Date;
    };
    supportTickets: Array<{
        id: string;
        subject: string;
        description: string;
        status: "open" | "in_progress" | "resolved" | "closed";
        createdAt: Date;
        resolvedAt?: Date;
        priority: "low" | "medium" | "high" | "urgent";
    }>;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    averageResponseTime: number;
    customerSatisfactionScore: number;
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
export declare const ProviderModel: mongoose.Model<ProviderDocument, {}, {}, {}, mongoose.Document<unknown, {}, ProviderDocument, {}, {}> & ProviderDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Provider.d.ts.map