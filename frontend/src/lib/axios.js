import axios from "axios";

// Create an axios instance with custom configuration
const axiosInstance = axios.create({
	// Set the baseURL depending on the environment (development or production)
	baseURL: import.meta.mode === "development" ? "http://localhost:5000/api" : "/api",
	
	// Ensure cookies are sent along with requests for cross-origin requests
	withCredentials: true,  // Send cookies to the server
});

// Export the axios instance for use in other parts of the app
export default axiosInstance;
