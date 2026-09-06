import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F9FAFB",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              padding: "40px",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              maxWidth: "480px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>
              An unexpected error occurred while rendering the page.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#DC2626",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  marginBottom: "24px",
                  maxHeight: "150px",
                  overflowY: "auto",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#E5E7EB",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
