import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { validateLoginForm } from "../../utils/validators";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { toast } from "sonner";

// Clean inline Tooth icon
const Tooth = ({ size = 28, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 3C4.2 3 2 5.2 2 8c0 3 2.5 4.5 2.5 7 .5 3.5 1.5 6 3.5 6 1.5 0 2-2 2-4 0-1.5.5-3 2-3s2 1.5 2 3c0 2 .5 4 2 4 2 0 3-2.5 3.5-6 0-2.5 2.5-4 2.5-7 0-2.8-2.2-5-5-5-1.5 0-3 .8-4 2-1-1.2-2.5-2-4-2z" />
  </svg>
);

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setAuthError("");
    const validationErrors = validateLoginForm({ email, password });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (result.success) {
        toast.success("Welcome back!");
        navigate("/");
      } else {
        setAuthError(result.error);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel - Black with white text */}
      <div className="hidden lg:flex lg:w-2/5 bg-black relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Subtle white glow */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col justify-center px-12 py-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <Tooth size={28} className="text-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              YENDENTAL
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-3 text-white">
            Dental Inventory
            <br />
            <span className="text-white/80">Management System</span>
          </h1>

          <p className="text-base text-white/60 max-w-md leading-relaxed">
            Track, manage, and optimize your dental supply inventory with
            real-time insights and powerful tools.
          </p>
        </div>
      </div>

      {/* Right panel - White with black text */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center">
              <Tooth size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold text-black">YENDENTAL</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-1">Sign In</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Enter your credentials to access the dashboard
            </p>

            {authError && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle size={18} />
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yendental.com"
                    className={`w-full bg-white border ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-black"} rounded-lg px-10 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all duration-200`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full bg-white border ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-black"} rounded-lg px-10 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-black transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-black focus:ring-black/20 focus:ring-offset-0"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-black hover:text-gray-600 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-black/20 hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Forgot Password"
        size="sm"
      >
        <div className="text-gray-700">
          <p className="text-sm mb-4">
            This is a demo application. Password recovery is not available.
            Please use the demo credentials shown on the login page.
          </p>
          <button
            onClick={() => setForgotOpen(false)}
            className="w-full py-2 px-4 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}
