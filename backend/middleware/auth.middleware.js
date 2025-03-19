import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to protect routes by verifying the user's access token
export const protectRoute = async (req, res, next) => {
	try {
		// Extract access token from cookies
		const accessToken = req.cookies.accessToken;

		// If there's no access token, return unauthorized error
		if (!accessToken) {
			return res.status(401).json({ message: "Unauthorized - No access token provided" });
		}

		// Try to verify the access token using the secret key
		try {
			// Decode the access token to get user information
			const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

			// Find the user in the database using the userId from the decoded token
			const user = await User.findById(decoded.userId).select("-password"); // Exclude password from the user data

			// If no user is found, return an unauthorized error
			if (!user) {
				return res.status(401).json({ message: "User not found" });
			}

			// Attach the user to the request object so that it can be used in other middleware or route handlers
			req.user = user;

			// Proceed to the next middleware or route handler
			next();
		} catch (error) {
			// If the token is expired, send an unauthorized response
			if (error.name === "TokenExpiredError") {
				return res.status(401).json({ message: "Unauthorized - Access token expired" });
			}
			// If another error occurs while verifying the token, throw it
			throw error;
		}
	} catch (error) {
		// Catch any other errors and send an unauthorized error response
		console.log("Error in protectRoute middleware", error.message);
		return res.status(401).json({ message: "Unauthorized - Invalid access token" });
	}
};

// Middleware to protect admin-only routes
export const adminRoute = (req, res, next) => {
	// Check if the user has a role of 'admin'
	if (req.user && req.user.role === "admin") {
		// If the user is an admin, proceed to the next middleware or route handler
		next();
	} else {
		// If the user is not an admin, return a forbidden error
		return res.status(403).json({ message: "Access denied - Admin only" });
	}
};
