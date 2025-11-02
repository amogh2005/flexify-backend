import mongoose from "mongoose";

export async function connectDatabase(mongoUri: string): Promise<void> {
	try {
		await mongoose.connect(mongoUri);
		console.log("Connected to MongoDB");
	} catch (error) {
		console.error("MongoDB connection failed", error);
		throw error;
	}
}


