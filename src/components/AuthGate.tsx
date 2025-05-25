import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { UserContext } from "../context/UserContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">Loading user...</div>;
  if (!user) return <div className="p-4">Authentication failed.</div>;

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
