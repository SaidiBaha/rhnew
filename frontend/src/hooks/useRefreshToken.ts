import axios from "axios";

import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const useRefreshToken = () => {
  const { auth, setAuth } = useAuth();

  const refreshToken = async () => {
    const response = await axios.post("/auth/refresh-token", null, {
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.refreshToken}`,
      },
    });

    const { accessToken, refreshToken, user } = response.data;

    setAuth({ accessToken, refreshToken, user });
    localStorage.setItem("refreshToken", refreshToken);

    return accessToken;
  };

  return refreshToken;
};

export default useRefreshToken;
