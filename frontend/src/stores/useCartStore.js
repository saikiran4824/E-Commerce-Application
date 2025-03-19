import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

// Create Zustand store for managing the cart and coupon state
export const useCartStore = create((set, get) => ({
	// Initial state of the cart
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	// Fetch the coupon data from the server
	getMyCoupon: async () => {
		try {
			// Fetch coupon information
			const response = await axios.get("/coupons");
			// Update the state with the fetched coupon data
			set({ coupon: response.data });
		} catch (error) {
			// Handle errors if coupon fetching fails
			console.error("Error fetching coupon:", error);
		}
	},

	// Apply a coupon code to the cart
	applyCoupon: async (code) => {
		try {
			// Send coupon code to the server for validation
			const response = await axios.post("/coupons/validate", { code });
			// If valid, update the state with the coupon data and flag it as applied
			set({ coupon: response.data, isCouponApplied: true });
			// Recalculate the cart totals after applying the coupon
			get().calculateTotals();
			// Show success notification
			toast.success("Coupon applied successfully");
		} catch (error) {
			// Show error notification if applying the coupon fails
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},

	// Remove the applied coupon from the cart
	removeCoupon: () => {
		// Reset the coupon and isCouponApplied state
		set({ coupon: null, isCouponApplied: false });
		// Recalculate the cart totals after removing the coupon
		get().calculateTotals();
		// Show success notification
		toast.success("Coupon removed");
	},

	// Fetch the cart items from the server
	getCartItems: async () => {
		try {
			// Fetch the cart data from the server
			const res = await axios.get("/cart");
			// Update the state with the fetched cart data
			set({ cart: res.data });
			// Recalculate the cart totals after fetching items
			get().calculateTotals();
		} catch (error) {
			// Reset the cart state in case of error
			set({ cart: [] });
			// Show error notification
			toast.error(error.response.data.message || "An error occurred");
		}
	},

	// Clear the entire cart and coupon
	clearCart: async () => {
		// Reset the state to clear the cart and coupon data
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},

	// Add a product to the cart
	addToCart: async (product) => {
		try {
			// Send a request to the server to add the product to the cart
			await axios.post("/cart", { productId: product._id });
			// Show success notification
			toast.success("Product added to cart");

			// Update the local cart state with the new product
			set((prevState) => {
				const existingItem = prevState.cart.find((item) => item._id === product._id);
				const newCart = existingItem
					// If the product already exists in the cart, increase its quantity
					? prevState.cart.map((item) =>
							item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
					  )
					// If the product is not in the cart, add it
					: [...prevState.cart, { ...product, quantity: 1 }];
				return { cart: newCart };
			});
			// Recalculate the cart totals after adding the item
			get().calculateTotals();
		} catch (error) {
			// Show error notification if adding to the cart fails
			toast.error(error.response.data.message || "An error occurred");
		}
	},

	// Remove a product from the cart
	removeFromCart: async (productId) => {
		// Send a request to remove the product from the server
		await axios.delete(`/cart`, { data: { productId } });
		// Update the local cart state to remove the product
		set((prevState) => ({ cart: prevState.cart.filter((item) => item._id !== productId) }));
		// Recalculate the cart totals after removing the product
		get().calculateTotals();
	},

	// Update the quantity of a product in the cart
	updateQuantity: async (productId, quantity) => {
		// If quantity is zero, remove the product from the cart
		if (quantity === 0) {
			get().removeFromCart(productId);
			return;
		}

		// Send a request to the server to update the product quantity
		await axios.put(`/cart/${productId}`, { quantity });
		// Update the local cart state with the new quantity
		set((prevState) => ({
			cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
		}));
		// Recalculate the cart totals after updating the quantity
		get().calculateTotals();
	},

	// Calculate the cart's subtotal and total (with coupon applied)
	calculateTotals: () => {
		const { cart, coupon } = get();
		// Calculate the subtotal by summing the price * quantity of each cart item
		const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
		let total = subtotal;

		// If a coupon is applied, apply the discount
		if (coupon) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}

		// Update the state with the calculated totals
		set({ subtotal, total });
	},
}));
