import { createContext, useContext, useState, useEffect } from "react";
import usersData from "../data/users.json";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user was previously logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("dental_user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem("dental_user");
      }
    }
    setLoading(false);
  }, []);

  // Login function - reads from users.json
  const login = (email, password) => {
    // Find user by email from JSON (case-insensitive)
    const foundUser = usersData.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser) {
      return { success: false, message: "User not found" };
    }

    if (foundUser.password !== password) {
      return { success: false, message: "Invalid password" };
    }

    if (foundUser.status !== "active") {
      return { success: false, message: "Account is inactive" };
    }

    // Remove password before storing
    const { password: _, ...userWithoutPassword } = foundUser;

    setUser(userWithoutPassword);
    setIsAuthenticated(true);
    localStorage.setItem("dental_user", JSON.stringify(userWithoutPassword));

    return { success: true, user: userWithoutPassword };
  };

  // Logout function - clears everything
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("dental_user");
    // Force navigation to login with clean state
    window.location.href = "/login";
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
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
