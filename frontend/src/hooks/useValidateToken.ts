import axios from "axios";

import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const useValidateToken = () => {
  const { setAuth } = useAuth();

  const validateToken = async (token: string) => {
    try {
      const response = await axios.post("/auth/validate-token", null, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.valid) {
        setAuth({});
      }
    } catch (error) {
      console.log(error);
    }
  };

  return validateToken;
};

export default useValidateToken;
