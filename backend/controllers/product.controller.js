import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

// Controller to fetch all products from the database
export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({}); // Find all products
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to fetch featured products from Redis or MongoDB
export const getFeaturedProducts = async (req, res) => {
	try {
		// Check Redis cache for the featured products
		let featuredProducts = await redis.get("featured_products");

		// If featured products are already in Redis, return them
		if (featuredProducts) {
			return res.json(JSON.parse(featuredProducts));
		}

		// If not in Redis, fetch from MongoDB
		// .lean() is used for performance, as it returns plain JavaScript objects instead of Mongoose documents
		featuredProducts = await Product.find({ isFeatured: true }).lean();

		// If no featured products found, return a 404 error
		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" });
		}

		// Store the fetched featured products in Redis for future quick access
		await redis.set("featured_products", JSON.stringify(featuredProducts));

		// Return the featured products
		res.json(featuredProducts);
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to create a new product
export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category } = req.body;

		let cloudinaryResponse = null;

		// If an image is provided, upload it to Cloudinary
		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
		}

		// Create a new product in the database
		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category,
		});

		// Return the created product
		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to delete a product
export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		// If the product doesn't exist, return a 404 error
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// If the product has an image, delete it from Cloudinary
		if (product.image) {
			const publicId = product.image.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloudinary");
			} catch (error) {
				console.log("error deleting image from cloudinary", error);
			}
		}

		// Delete the product from MongoDB
		await Product.findByIdAndDelete(req.params.id);

		// Return success message
		res.json({ message: "Product deleted successfully" });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to fetch recommended products
export const getRecommendedProducts = async (req, res) => {
	try {
		// Use MongoDB aggregation to fetch random sample of products (for recommendations)
		const products = await Product.aggregate([
			{
				$sample: { size: 4 }, // Randomly pick 4 products
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

		// Return recommended products
		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to fetch products by category
export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		// Find products by category from MongoDB
		const products = await Product.find({ category });
		res.json({ products });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to toggle the "isFeatured" status of a product
export const toggleFeaturedProduct = async (req, res) => {
	try {
		// Find the product by ID
		const product = await Product.findById(req.params.id);
		if (product) {
			// Toggle the isFeatured flag
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			// Update the featured products cache in Redis
			await updateFeaturedProductsCache();
			// Return the updated product
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Helper function to update the featured products cache in Redis
async function updateFeaturedProductsCache() {
	try {
		// Fetch the list of featured products from MongoDB
		const featuredProducts = await Product.find({ isFeatured: true }).lean();

		// Store the featured products in Redis for fast access
		await redis.set("featured_products", JSON.stringify(featuredProducts));
	} catch (error) {
		console.log("Error in update cache function", error.message);
	}
}
