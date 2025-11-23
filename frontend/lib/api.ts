import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post("/auth/login", { username, password });
    return data;
  },
  verifyOtp: async (user_id: string, otp: string, audio_base64: string) => {
    const { data } = await api.post("/auth/token", { user_id, otp, audio_base64 });
    return data;
  },
  enrollVoice: async (user_id: string, audio_base64: string) => {
    await api.post("/auth/voice/enroll", { user_id, audio_base64 });
  },
  verifyVoice: async (user_id: string, audio_base64: string, otp?: string) => {
    const { data } = await api.post("/auth/voice/verify", {
      user_id,
      audio_base64,
      otp,
    });
    return data;
  },
};

// Banking endpoints
export const bankingApi = {
  getBalance: async (account_type = "savings") => {
    const { data } = await api.get(`/balance?account_type=${account_type}`);
    return data;
  },
  initTransfer: async (payload: {
    amount: number;
    counterparty: string;
    channel: string;
  }) => {
    const { data } = await api.post("/transfer/init", payload);
    return data;
  },
  confirmTransfer: async (payload: {
    session_id: string;
    otp?: string;
    voice_verified?: boolean;
  }) => {
    const { data } = await api.post("/transfer/confirm", payload);
    return data;
  },
  getTransactions: async (limit = 5) => {
    const { data } = await api.get(`/transactions?limit=${limit}`);
    return data;
  },
  getLoans: async () => {
    const { data } = await api.get("/loans");
    return data;
  },
  createReminder: async (payload: {
    title: string;
    schedule_iso: string;
    channel: string;
  }) => {
    const { data } = await api.post("/reminders", payload);
    return data;
  },
  getReminders: async () => {
    const { data } = await api.get("/reminders");
    return data;
  },
  deleteReminder: async (reminder_id: string) => {
    await api.delete(`/reminders/${reminder_id}`);
  },
  getEligibleOffers: async () => {
    const { data } = await api.get("/offers/eligible");
    return data;
  },
  getDueReminders: async () => {
    const { data } = await api.get("/reminders/due");
    return data;
  },
};

// Dialogue endpoints
export const dialogueApi = {
  voiceTurn: async (payload: {
    audio_base64: string;
    language?: string;
    context?: string;
  }) => {
    const { data } = await api.post("/dialogue/voice-turn", payload);
    return data;
  },
  getSession: async (user_id: string) => {
    const { data } = await api.get(`/dialogue/session/${user_id}`);
    return data;
  },
};

