import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { ProviderModel } from "../models/Provider";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// Helper function to generate referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to calculate trust score
function calculateTrustScore(providerData: any): number {
  let score = 0;
  
  // Basic verification
  if (providerData.phone) score += 10;
  if (providerData.description) score += 10;
  if (providerData.category) score += 10;
  
  // Profile enrichment
  if (providerData.portfolio && providerData.portfolio.length > 0) score += 15;
  if (providerData.certifications && providerData.certifications.length > 0) score += 15;
  if (providerData.languages && providerData.languages.length > 1) score += 5;
  
  // Verification
  if (providerData.idDocument) score += 10;
  if (providerData.backgroundCheck) score += 10;
  if (providerData.skillTestCompleted) score += 10;
  
  // Financial setup
  if (providerData.bankDetails && providerData.bankDetails.accountNumber) score += 5;
  
  return Math.min(score, 100);
}

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, ...additionalData } = req.body;

    console.log('Registration request:', { name, email, role, additionalDataKeys: Object.keys(additionalData) });

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (for all roles)
    const user = new UserModel({
      name,
      email,
      phone,                     
      passwordHash: hashedPassword,
      role,
    });

    await user.save();
    console.log('User saved successfully:', user._id);

    // If registering as provider, create provider profile linked to userId
    if (role === "provider") {
      console.log('Creating provider profile for user:', user._id);
      console.log('Additional data:', additionalData);
      
      const providerData: any = {
        userId: user._id,
        category: additionalData.category || "driver",
        description: additionalData.description || "",
        phone: additionalData.phone || "",
        location: {
          type: "Point",
          coordinates: [0, 0] // Default coordinates, will be updated later
        },
        verified: false,
        phoneVerified: false,
        available: true,
        
        // Profile Enrichment
        portfolio: additionalData.portfolio || [],
        certifications: additionalData.certifications || [],
        languages: additionalData.languages || ["English"],
        
        // Verification and Trust
        idDocumentUrl: additionalData.idDocumentUrl || "",
        backgroundCheck: additionalData.backgroundCheck || false,
        skillTestCompleted: additionalData.skillTestCompleted || false,
        skillTestScore: additionalData.skillTestScore || 0,
        trustScore: 0,
        verificationStatus: "pending",
        
        // Availability and Flexibility
        availability: additionalData.availability || {
          monday: { morning: true, afternoon: true, evening: true },
          tuesday: { morning: true, afternoon: true, evening: true },
          wednesday: { morning: true, afternoon: true, evening: true },
          thursday: { morning: true, afternoon: true, evening: true },
          friday: { morning: true, afternoon: true, evening: true },
          saturday: { morning: true, afternoon: true, evening: false },
          sunday: { morning: false, afternoon: false, evening: false }
        },
        serviceRadius: additionalData.serviceRadius || 10,
        emergencyWork: additionalData.emergencyWork || false,
        
        // Service Pricing
        servicePrice: additionalData.servicePrice || 500, // Default ₹5 in paise
        
        // Engagement and Growth
        membershipTier: additionalData.membershipTier || "basic",
        referralCode: generateReferralCode(),
        referralEarnings: 0,
        trainingCompleted: [],
        skillLevel: additionalData.skillLevel || "beginner",
        yearsOfExperience: additionalData.yearsOfExperience || 0,
        
        // Earnings & Financial Tools
        bankDetails: additionalData.bankDetails || {},
        upiId: additionalData.upiId || "",
        totalEarnings: 0,
        platformFees: 0,
        availableBalance: 0,
        withdrawalHistory: [],
        
        // Insurance and Benefits
        insuranceOpted: additionalData.insuranceOpted || false,
        
        // Communication & Support
        supportTickets: [],
        
        // Performance Metrics
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        averageResponseTime: 0,
        customerSatisfactionScore: 0,
        
        // Additional Information
        emergencyContact: additionalData.emergencyContact || {},
        preferences: additionalData.preferences || {
          workType: "part_time",
          paymentMethod: "both",
          communicationPreference: "both"
        }
      };
      
      // Conditionally add optional pricing fields only if they are provided and valid
      if (additionalData.emergencyCharge && additionalData.emergencyCharge > 0) {
        providerData.emergencyCharge = additionalData.emergencyCharge;
      }
      if (additionalData.pricePerHour && additionalData.pricePerHour > 0) {
        providerData.pricePerHour = additionalData.pricePerHour;
      }
      if (additionalData.minimumCharge && additionalData.minimumCharge > 0) {
        providerData.minimumCharge = additionalData.minimumCharge;
      }

      console.log('Provider data to save:', providerData);
      
      try {
        console.log('Creating provider with data:', JSON.stringify(providerData, null, 2));
        const provider = new ProviderModel(providerData);
        console.log('Provider model created, attempting to save...');
        await provider.save();
        
        console.log('Provider profile created successfully:', provider._id);
      } catch (providerError) {
        console.error('Error creating provider profile:', providerError);
        console.error('Provider validation errors:', providerError.errors);
        console.error('Provider data that failed:', JSON.stringify(providerData, null, 2));
        // Fail the registration if provider creation fails
        throw new Error(`Failed to create provider profile: ${providerError.message}`);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    // Issue tokens on registration
    const accessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "30d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Return detailed error message to help debug
    const errorMessage = error.message || "Registration failed";
    const errorDetails = error.errors ? JSON.stringify(error.errors) : errorMessage;
    
    res.status(500).json({ 
      message: "Registration failed",
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Enhanced Provider Registration with step-by-step process
router.post("/register/provider/step", async (req, res) => {
  try {
    const { step, data, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    let provider = await ProviderModel.findOne({ userId });
    
    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    // Update provider based on step
    switch (step) {
      case 1: // Basic Info
        provider.category = data.category;
        provider.description = data.description;
        provider.phone = data.phone;
        break;
        
      case 2: // Profile Enrichment
        if (data.portfolio) {
          provider.portfolio = [...(provider.portfolio || []), ...data.portfolio];
        }
        if (data.certifications) {
          provider.certifications = [...(provider.certifications || []), ...data.certifications];
        }
        if (data.languages) {
          provider.languages = data.languages;
        }
        break;
        
      case 3: // Verification
        if (data.idDocument) {
          provider.idDocumentUrl = data.idDocument;
        }
        if (data.backgroundCheck !== undefined) {
          provider.backgroundCheck = data.backgroundCheck;
          if (data.backgroundCheck) {
            provider.backgroundCheckDate = new Date();
          }
        }
        if (data.skillTestCompleted !== undefined) {
          provider.skillTestCompleted = data.skillTestCompleted;
          if (data.skillTestScore) {
            provider.skillTestScore = data.skillTestScore;
            provider.skillTestDate = new Date();
          }
        }
        break;
        
      case 4: // Availability
        if (data.availability) {
          provider.availability = data.availability;
        }
        if (data.serviceRadius !== undefined) {
          provider.serviceRadius = data.serviceRadius;
        }
        if (data.emergencyWork !== undefined) {
          provider.emergencyWork = data.emergencyWork;
          if (data.emergencyCharge) {
            provider.emergencyCharge = data.emergencyCharge;
          }
        }
        break;
        
      case 5: // Financial
        if (data.bankDetails) {
          provider.bankDetails = data.bankDetails;
        }
        if (data.upiId) {
          provider.upiId = data.upiId;
        }
        if (data.membershipTier) {
          provider.membershipTier = data.membershipTier;
        }
        if (data.insuranceOpted !== undefined) {
          provider.insuranceOpted = data.insuranceOpted;
        }
        break;
        
      default:
        return res.status(400).json({ message: "Invalid step" });
    }

    // Recalculate trust score
    provider.trustScore = calculateTrustScore(provider);
    
    await provider.save();

    res.json({
      message: `Step ${step} completed successfully`,
      provider: {
        trustScore: provider.trustScore,
        verificationStatus: provider.verificationStatus,
        membershipTier: provider.membershipTier
      }
    });
  } catch (error) {
    console.error("Step registration error:", error);
    res.status(500).json({ message: "Step registration failed" });
  }
});

// Complete Provider Registration
router.post("/register/provider/complete", async (req, res) => {
  try {
    const { userId } = req.body;

    const provider = await ProviderModel.findOne({ userId });
    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    // Final trust score calculation
    provider.trustScore = calculateTrustScore(provider);
    
    // Set verification status based on trust score
    if (provider.trustScore >= 80) {
      provider.verificationStatus = "verified";
    } else if (provider.trustScore >= 50) {
      provider.verificationStatus = "pending";
    } else {
      provider.verificationStatus = "rejected";
    }

    // Keep boolean verified in sync with verificationStatus
    provider.verified = provider.verificationStatus === 'verified';

    await provider.save();

    res.json({
      message: "Provider registration completed",
      provider: {
        trustScore: provider.trustScore,
        verificationStatus: provider.verificationStatus,
        membershipTier: provider.membershipTier,
        referralCode: provider.referralCode
      }
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({ message: "Registration completion failed" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token and refresh token
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "30d" }
    );

    res.json({
      message: "Login successful",
      accessToken: token,
      token, // Backward compatibility
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Missing refresh token" });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "fallback_secret"
      ) as { userId: string; role: string };

      const accessToken = jwt.sign(
        { userId: decoded.userId, role: decoded.role },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "7d" }
      );

      return res.json({ accessToken });
    } catch (e) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

// Get User Profile
router.get("/profile", verifyJwt, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const user = await UserModel.findById(req.user.userId).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user is provider, get provider profile
    let providerProfile = null;
    if (user.role === "provider") {
      providerProfile = await ProviderModel.findOne({ userId: user._id });
    }

    res.json({
      user,
      providerProfile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

// Update User Profile
router.put("/profile", verifyJwt, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { name, email, ...otherFields } = req.body;

    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    // If updating provider profile
    if (user.role === "provider" && Object.keys(otherFields).length > 0) {
      const provider = await ProviderModel.findOne({ userId: user._id });
      if (provider) {
        Object.assign(provider, otherFields);
        
        // Recalculate trust score if relevant fields changed
        if (otherFields.description || otherFields.portfolio || otherFields.certifications) {
          provider.trustScore = calculateTrustScore(provider);
        }
        
        await provider.save();
      }
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Change Password
router.put("/change-password", verifyJwt, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { currentPassword, newPassword } = req.body;

    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;
    
    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User with this email not found" });
    }

    // Check if role matches
    if (role && user.role !== role) {
      return res.status(403).json({ message: "Account type mismatch" });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user._id.toString(), email },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1h" }
    );

    // Store reset token in user document
    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    // Import and send email
    const { sendPasswordResetEmail } = await import('../services/email');
    
    try {
      await sendPasswordResetEmail(email, resetLink, role);
      res.json({ message: "Password reset instructions sent to your email" });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Still return success but log the error
      res.json({ 
        message: "Password reset link generated (email sending failed)",
        resetLink // Include link for development
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process password reset" });
  }
});

// Reset Password (placeholder for future implementation)
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // TODO: Implement password reset logic
    // 1. Verify reset token
    // 2. Update password
    // 3. Invalidate reset token
    
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Logout (client-side token removal)
router.post("/logout", verifyJwt, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    // In a real application, you might want to:
    // 1. Add token to blacklist
    // 2. Update user's last logout time
    // 3. Log logout activity
    
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;


