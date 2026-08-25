import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// Backend API URL
const API_URL = "http://localhost:5000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user was previously logged in (check token validity)
  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    const savedUser = localStorage.getItem("dental_user");

    if (token && savedUser) {
      try {
        // Verify token with backend
        fetch(`${API_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser(data.data);
            setIsAuthenticated(true);
          } else {
            // Token invalid - clear storage
            localStorage.removeItem("dental_token");
            localStorage.removeItem("dental_user");
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          // Network error - try using saved user
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
          } catch (e) {
            localStorage.removeItem("dental_token");
            localStorage.removeItem("dental_user");
          }
        })
        .finally(() => {
          setLoading(false);
        });
      } catch (e) {
        localStorage.removeItem("dental_token");
        localStorage.removeItem("dental_user");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Login function - calls backend API
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        const userData = data.data.user;
        const token = data.data.token;
        
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("dental_token", token);
        localStorage.setItem("dental_user", JSON.stringify(userData));
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: data.error?.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Network error. Please try again." };
    }
  };

  // Logout function
  const logout = () => {
    // Optional: Call logout API
    // fetch(`${API_URL}/auth/logout`, { method: "POST" });
    
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("dental_token");
    localStorage.removeItem("dental_user");
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