import type { UserRole } from "@/modules/auth/types";
import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface User {
  fullName: String;
  id: string;
  matricule: string;
  role: UserRole;
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
    return refreshToken ? { refreshToken } : {};
  });

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
