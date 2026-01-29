// context/AuthProvider.tsx
import type { UserRole } from "@/modules/auth/types";
import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
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
  setAuth: Dispatch<SetStateAction<Auth>>;
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
    
    // Récupérer aussi l'utilisateur depuis localStorage si disponible
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : undefined;
    
    return {
      user,
      refreshToken: refreshToken || undefined
    };
  });

  // Fonction pour mettre à jour l'auth et sauvegarder dans localStorage
  const updateAuth = (newAuth: Auth) => {
    if (newAuth.user) {
      localStorage.setItem("user", JSON.stringify(newAuth.user));
    }
    if (newAuth.refreshToken) {
      localStorage.setItem("refreshToken", newAuth.refreshToken);
    }
    setAuth(newAuth);
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth: updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;