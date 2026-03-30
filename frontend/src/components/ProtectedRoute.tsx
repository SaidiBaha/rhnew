import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import useValidateToken from "@/hooks/useValidateToken";
import type { UserRole } from "@/modules/auth/types";
import { useEffect } from "react";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { auth } = useAuth();

  const validateToken = useValidateToken();

  useEffect(() => {
    const token = auth.accessToken;
    if (token) {
      validateToken(token);
    }
  }, [auth, validateToken]);

  return auth.user?.role && (allowedRoles as string[]).includes(auth.user?.role) ? (
    <Outlet />
  ) : auth.accessToken ? (
    <Navigate to="/unauthorized" replace />
  ) : (
    <Navigate to="/login" replace />
  );

}
