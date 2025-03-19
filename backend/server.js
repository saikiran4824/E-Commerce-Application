import express from "express"; // Importing the express framework for building the API server
import dotenv from "dotenv"; // Importing dotenv to load environment variables from a .env file
import cookieParser from "cookie-parser"; // Importing cookie-parser to parse cookies sent in requests
import path from "path"; // Importing path module for working with file and directory paths

// Importing route modules for different sections of the application
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";

// Importing a function to connect to the database
import { connectDB } from "./lib/db.js";

// Loading environment variables from the .env file
dotenv.config();

const app = express(); // Initializing the Express application
const PORT = process.env.PORT || 5000; // Defining the port on which the server will run

// Resolving the __dirname variable to get the current directory
const __dirname = path.resolve();

// Middleware to parse incoming JSON data (request body) with a size limit of 10mb
app.use(express.json({ limit: "10mb" }));

// Middleware to parse cookies from incoming requests
app.use(cookieParser());

// Defining routes for different sections of the application
app.use("/api/auth", authRoutes); // Routes for authentication (sign up, login, etc.)
app.use("/api/products", productRoutes); // Routes for product management (view products, add products, etc.)
app.use("/api/cart", cartRoutes); // Routes for shopping cart (add/remove items, view cart, etc.)
app.use("/api/coupons", couponRoutes); // Routes for handling coupon codes
app.use("/api/payments", paymentRoutes); // Routes for payment processing
app.use("/api/analytics", analyticsRoutes); // Routes for analytics (sales, views, etc.)

// Production-specific configuration
if (process.env.NODE_ENV === "production") {
	// Serve static files from the "frontend/dist" folder for production (e.g., built React app)
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	// Catch-all route to serve the frontend's index.html for any other route that doesn't match
	app.get("*", (req, res) => {
		// Sends the index.html file located in the frontend/dist folder
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

// Start the server and listen on the specified port
app.listen(PORT, () => {
	// Log the success message with the server URL
	console.log("Server is running on http://localhost:" + PORT);
	// Connect to the database
	connectDB();
});
