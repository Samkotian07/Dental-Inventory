import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
const API_URL = "http://127.0.0.1:5000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    const savedUser = localStorage.getItem("dental_user");

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);

        fetch(`${API_URL}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setUser(data.data);
            setIsAuthenticated(true);
            localStorage.setItem("dental_user", JSON.stringify(data.data));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      } catch (e) {
        localStorage.removeItem("dental_token");
        localStorage.removeItem("dental_user");
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

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
        
        // ⭐ FORCE PAGE RELOAD - SIMPLEST FIX
        window.location.href = "/dashboard";
        
        return { success: true, user: userData };
      }
      return { success: false, message: data.error?.message || "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Network error" };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("dental_token");
    localStorage.removeItem("dental_user");
    window.location.href = "/login";
  };

  const value = { user, isAuthenticated, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}