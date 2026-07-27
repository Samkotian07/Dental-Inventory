import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Default admin user (login will be added later)
  const [user, setUser] = useState({
    id: 1,
    name: "Admin User",
    email: "admin@yendental.com",
    role: "admin",
    status: "active",
  });

  // Keep user logged in for now
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const value = {
    user,
    isAuthenticated,
    login: () => {}, // Placeholder - will implement later
    logout: () => {}, // Placeholder - will implement later
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
