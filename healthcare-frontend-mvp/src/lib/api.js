import axios from "axios";
import useStore from "./store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach active role and clinic from Zustand store to every outgoing request
api.interceptors.request.use(
  (config) => {
    try {
      if (typeof window !== "undefined") {
        const state = useStore.getState();
        if (state?.currentRole) {
          config.headers["x-role"] = state.currentRole;
        }
        if (state?.selectedClinic?._id) {
          config.headers["x-clinic-id"] = state.selectedClinic._id;
        }
        if (state?.selectedDoctor?._id) {
          config.headers["x-doctor-id"] = state.selectedDoctor._id;
        }
      }
    } catch {
      // Fallback silently if store is unavailable
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;