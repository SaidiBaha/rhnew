// context/AuthProvider.tsx
import type { UserRole } from "@/modules/auth/types";
import {
  createContext,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";

export interface User {
  id: number;
  matricule: string;
  role: UserRole;
  fullName: string;
}

export interface Auth {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthContextProps {
  auth: Auth;
  setAuth: (auth: Auth) => void;
}

const AuthContext = createContext<AuthContextProps>({
  auth: {},
  setAuth: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [auth, setAuth] = useState<Auth>(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : undefined;

    return {
      user,
      refreshToken: refreshToken || undefined,
    };
  });

  const updateAuth: Dispatch<SetStateAction<Auth>> = (newAuth) => {
    setAuth((prevAuth) => {
      const authToSet = typeof newAuth === "function" ? newAuth(prevAuth) : newAuth;

      if (authToSet.user) {
        localStorage.setItem("user", JSON.stringify(authToSet.user));
      }
      if (authToSet.refreshToken) {
        localStorage.setItem("refreshToken", authToSet.refreshToken);
      }

      return authToSet;
    });
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth: updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
