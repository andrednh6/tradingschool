import { createContext, useContext } from "react";
import type { UserData } from "../hooks/useAuth";

export const UserContext = createContext<UserData | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) { // Es más común verificar contra undefined para createContext
    throw new Error("useUser must be used within a UserContext.Provider (likely inside AuthGate)");
  }
  return context; 
};
