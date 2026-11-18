import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("group-chat-token");
  if (config.noAuth) {
    delete config.noAuth;
    delete config.headers.Authorization;
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.code === "ECONNABORTED"
        ? "The request timed out. Please try again."
        : "Unable to reach the chat server. Check your connection and try again.");
    return Promise.reject(Object.assign(error, { userMessage: message }));
  },
);

export function getErrorMessage(error) {
  return error?.userMessage || error?.response?.data?.message || error?.message || "Something went wrong.";
}

export default api;
