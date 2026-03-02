// context/AuthProvider.tsx
import type { UserRole } from "@/modules/auth/types";
import {
  createContext,
  useState,
  type ReactNode,
  
} from "react";

// Interface étendue pour inclure tous les champs
export interface User {
  id: number; // Changé de string à number pour correspondre à l'ID de votre backend
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
  // ✅ accepte un objet Auth OU une fonction d'update (comme setState)
  setAuth: (auth: Auth | ((prev: Auth) => Auth)) => void;
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
    const user = userStr ? (JSON.parse(userStr) as User) : undefined;

    return {
      user,
      refreshToken: refreshToken || undefined,
    };
  });

  // ✅ Version sans Dispatch/SetStateAction + typings explicites
  const updateAuth = (newAuth: Auth | ((prev: Auth) => Auth)) => {
    setAuth((prevAuth) => {
      const authToSet =
        typeof newAuth === "function" ? (newAuth as (p: Auth) => Auth)(prevAuth) : newAuth;

      // 🔐 Persistance locale sécurisée
      if (authToSet.user) {
        localStorage.setItem("user", JSON.stringify(authToSet.user));
      } else {
        localStorage.removeItem("user");
      }

      if (authToSet.refreshToken) {
        localStorage.setItem("refreshToken", authToSet.refreshToken);
      } else {
        localStorage.removeItem("refreshToken");
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