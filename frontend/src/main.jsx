import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import { InventoryProvider } from "./context/InventoryContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <InventoryProvider>
              <Toaster richColors position="top-right" />
              <App />
            </InventoryProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
