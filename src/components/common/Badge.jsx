import "./Badge.css";

const VARIANTS = {
  success: "badge--success",
  warning: "badge--warning",
  error: "badge--error",
  primary: "badge--primary",
  secondary: "badge--secondary",
  neutral: "badge--neutral",
};

export default function Badge({ variant = "neutral", children, className }) {
  return (
    <span className={`badge ${VARIANTS[variant]} ${className || ""}`}>
      {children}
    </span>
  );
}
