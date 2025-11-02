import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";

export async function ensureAdminSeed(): Promise<void> {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;
	if (!email || !password) {
		console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; admin seeding skipped");
		return;
	}
	const existing = await UserModel.findOne({ email });
	if (existing) return;
	const passwordHash = await bcrypt.hash(password, 10);
	await UserModel.create({ name: "Admin", email, passwordHash, role: "admin" });
	console.log("Seeded admin user", email);
}


