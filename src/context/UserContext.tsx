import { createContext, useContext } from "react";

type UserData = {
  uid: string;
  cash: number;
  createdAt: string;
};

export const UserContext = createContext<UserData | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
};
