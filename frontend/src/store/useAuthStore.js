import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

function getBaseUrlForSocket() {
  // prefer axios baseURL if set (e.g. "http://localhost:5000/api")
  const base = axiosInstance?.defaults?.baseURL || (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/");
  return base.replace(/\/api(\/)?$/, ""); // remove trailing /api if present
}

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      if (res?.data) get().connectSocket();
    } catch (error) {
      console.error("Error in checkAuth:", error);
      // don't try to read error.response.data.message directly (may be undefined)
      const msg = error?.response?.data?.message || error?.message || "Auth check failed";
      // optional: show toast only on certain errors
      if (error?.response?.status && error.response.status !== 401) toast.error(msg);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      console.error("signup error:", error);
      const msg = error?.response?.data?.message || error?.message || "Signup failed";
      toast.error(msg);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      console.error("login error:", error);
      const msg = error?.response?.data?.message || error?.message || "Login failed";
      toast.error(msg);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      console.error("logout error:", error);
      const msg = error?.response?.data?.message || error?.message || "Logout failed";
      toast.error(msg);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("updateProfile error:", error);
      const msg = error?.response?.data?.message || error?.message || "Update failed";
      toast.error(msg);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    // avoid duplicate connections
    if (socket && socket.connected) return;

    // cleanup stale socket
    if (socket && !socket.connected) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (e) {
        /* ignore */
      }
      set({ socket: null });
    }

    const socketUrl = getBaseUrlForSocket();
    const newSocket = io(socketUrl, {
      query: { userId: authUser._id },
      reconnectionAttempts: 5,
    });

    set({ socket: newSocket });

    // ensure single listener
    newSocket.off("getOnlineUsers");
    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    newSocket.on("disconnect", (reason) => {
      // clear socket on client-initiated disconnect
      if (reason === "io client disconnect") {
        set({ socket: null, onlineUsers: [] });
      }
    });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      try {
        if (s.connected) s.disconnect();
        s.removeAllListeners();
      } catch (e) {
        /* ignore */
      }
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
