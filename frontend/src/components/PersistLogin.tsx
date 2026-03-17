import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from "../hooks/useRefreshToken";
import useAuth from "@/hooks/useAuth";

const PersistLogin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { auth } = useAuth();

  const refreshToken = useRefreshToken();

  useEffect(() => {
    let isMounted = true;

    const verifyRefreshToken = async () => {
      try {
        await refreshToken();
        if (isMounted) setIsLoading(false);
      } catch {
        // Refresh token invalid or expired (401, 500, network error)
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.setItem("session_expired", "1");
        window.location.replace("/login");
        // Do not call setIsLoading — page is navigating away
      }
    };

    if (!auth.accessToken) {
      verifyRefreshToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return <>{isLoading ? <p>Loading...</p> : <Outlet />}</>;
};

export default PersistLogin;
