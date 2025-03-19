import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// User schema definition for MongoDB using Mongoose
const userSchema = new mongoose.Schema(
	{
		// The name field is required for every user
		name: {
			type: String,
			required: [true, "Name is required"],
		},
		// The email field is required, unique, and stored in lowercase with trimmed spaces
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true, // Ensure email is unique
			lowercase: true, // Convert email to lowercase before saving
			trim: true, // Trim any spaces before or after the email
		},
		// The password field is required and should have a minimum length of 6 characters
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [6, "Password must be at least 6 characters long"],
		},
		// The cartItems field holds the items that a user has added to their cart
		cartItems: [
			{
				// Quantity of the product in the cart, defaults to 1
				quantity: {
					type: Number,
					default: 1,
				},
				// Reference to the Product model
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Product", // Refers to the Product model
				},
			},
		],
		// The role field determines the user's role, defaulting to "customer"
		role: {
			type: String,
			enum: ["customer", "admin"], // Only allow "customer" or "admin" roles
			default: "customer", // Default role is customer
		},
	},
	{
		// Timestamps option will automatically add createdAt and updatedAt fields
		timestamps: true,
	}
);

// Pre-save hook to hash the password before saving to the database
userSchema.pre("save", async function (next) {
	// If the password hasn't been modified, skip hashing
	if (!this.isModified("password")) return next();

	try {
		// Generate a salt for bcrypt to use in hashing the password
		const salt = await bcrypt.genSalt(10);
		// Hash the password using the salt
		this.password = await bcrypt.hash(this.password, salt);
		// Proceed with saving the user
		next();
	} catch (error) {
		// If an error occurs during hashing, pass it to the next middleware
		next(error);
	}
});

// Instance method to compare a candidate password with the stored hash
userSchema.methods.comparePassword = async function (password) {
	// Compare the provided password with the hashed password in the database
	return bcrypt.compare(password, this.password);
};

// Create the User model based on the userSchema
const User = mongoose.model("User", userSchema);

// Export the User model for use in other parts of the application
export default User;
