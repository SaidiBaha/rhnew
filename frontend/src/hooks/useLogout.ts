import axios from "axios";

import useAuth from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const useLogout = () => {
  const { auth, setAuth } = useAuth();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await axios.post("/auth/logout", null, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAuth({});
      localStorage.removeItem("refreshToken");
      queryClient.clear();
    }
  };

  return logout;
};

export default useLogout;
