import { redis } from "../lib/redis.js"; // Importing the Redis instance for storing refresh tokens
import User from "../models/user.model.js"; // Importing the User model for database interactions
import jwt from "jsonwebtoken"; // Importing the JWT library for generating and verifying tokens

// Function to generate both access and refresh tokens for a user
const generateTokens = (userId) => {
	// Create an access token with a 15-minute expiration
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m", // Token expires in 15 minutes
	});

	// Create a refresh token with a 7-day expiration
	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d", // Token expires in 7 days
	});

	return { accessToken, refreshToken };
};

// Function to store the refresh token in Redis for secure access
const storeRefreshToken = async (userId, refreshToken) => {
	// Store the refresh token in Redis with an expiration of 7 days
	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7 days in seconds
};

// Function to set the cookies with access and refresh tokens for the client
const setCookies = (res, accessToken, refreshToken) => {
	// Set the access token as an HTTP-only cookie with 15 minutes validity
	res.cookie("accessToken", accessToken, {
		httpOnly: true, // Prevent XSS attacks
		secure: process.env.NODE_ENV === "production", // Secure cookie in production
		sameSite: "strict", // Prevent CSRF attacks
		maxAge: 15 * 60 * 1000, // 15 minutes expiration
	});

	// Set the refresh token as an HTTP-only cookie with 7 days validity
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true, // Prevent XSS attacks
		secure: process.env.NODE_ENV === "production", // Secure cookie in production
		sameSite: "strict", // Prevent CSRF attacks
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
	});
};

// Controller for signing up a new user
export const signup = async (req, res) => {
	const { email, password, name } = req.body;
	try {
		// Check if a user already exists with the provided email
		const userExists = await User.findOne({ email });

		if (userExists) {
			// Return error if user already exists
			return res.status(400).json({ message: "User already exists" });
		}

		// Create a new user in the database
		const user = await User.create({ name, email, password });

		// Generate access and refresh tokens for the newly created user
		const { accessToken, refreshToken } = generateTokens(user._id);
		// Store the refresh token in Redis for secure access
		await storeRefreshToken(user._id, refreshToken);
		// Set the cookies for the access and refresh tokens
		setCookies(res, accessToken, refreshToken);

		// Return the user information along with the tokens
		res.status(201).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
		});
	} catch (error) {
		console.log("Error in signup controller", error.message);
		// Handle any server errors during signup
		res.status(500).json({ message: error.message });
	}
};

// Controller for logging in an existing user
export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		// Find the user in the database by email
		const user = await User.findOne({ email });

		if (user && (await user.comparePassword(password))) {
			// If the user exists and the password is correct, generate tokens
			const { accessToken, refreshToken } = generateTokens(user._id);
			// Store the refresh token in Redis
			await storeRefreshToken(user._id, refreshToken);
			// Set cookies for the access and refresh tokens
			setCookies(res, accessToken, refreshToken);

			// Return the user data along with the tokens
			res.json({
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			});
		} else {
			// Return error if invalid email or password
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (error) {
		console.log("Error in login controller", error.message);
		// Handle any server errors during login
		res.status(500).json({ message: error.message });
	}
};

// Controller for logging out the user by clearing the refresh token from Redis and cookies
export const logout = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;

		if (refreshToken) {
			// Decode the refresh token to get the user ID
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			// Delete the refresh token from Redis
			await redis.del(`refresh_token:${decoded.userId}`);
		}

		// Clear both access and refresh tokens from the cookies
		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");

		// Return a successful logout message
		res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		// Handle any server errors during logout
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to refresh the access token using the refresh token
export const refreshToken = async (req, res) => {
	try {
		// Retrieve the refresh token from cookies
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			// If no refresh token is provided, return an error
			return res.status(401).json({ message: "No refresh token provided" });
		}

		// Decode the refresh token to get the user ID
		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
		// Get the stored refresh token from Redis
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

		if (storedToken !== refreshToken) {
			// If the stored refresh token does not match, return an error
			return res.status(401).json({ message: "Invalid refresh token" });
		}

		// Generate a new access token
		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

		// Set the new access token as a cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true, // Prevent XSS attacks
			secure: process.env.NODE_ENV === "production", // Secure cookie in production
			sameSite: "strict", // Prevent CSRF attacks
			maxAge: 15 * 60 * 1000, // 15 minutes expiration
		});

		// Return a successful response with the refreshed token
		res.json({ message: "Token refreshed successfully" });
	} catch (error) {
		console.log("Error in refreshToken controller", error.message);
		// Handle any server errors during token refresh
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to get the profile of the authenticated user
export const getProfile = async (req, res) => {
	try {
		// Return the user data (from the `req.user` object, set by the `protectRoute` middleware)
		res.json(req.user);
	} catch (error) {
		// Handle any server errors when fetching the profile
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
