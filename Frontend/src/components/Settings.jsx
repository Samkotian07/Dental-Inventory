import { useState } from "react";
import { Moon, Mail, Shield, Lock, LogOut, Sliders } from "lucide-react";
import { useData } from "../context/DataContext";
// ThemeContext doesn't exist - remove it
// import { useTheme } from '../../context/ThemeContext';
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";
import Input from "./common/Input";
import ToggleSwitch from "./common/ToggleSwitch";
import ConfirmDialog from "./common/ConfirmDialog";
import { toast } from "sonner";
import "./Settings.css";

export default function Settings() {
  const { user } = useAuth();
  const { settings, updateSettings } = useData();
  // Remove darkMode - no ThemeContext
  // const { darkMode, toggleDarkMode } = useTheme();
  const [darkMode, setDarkMode] = useState(false); // Add fallback state
  const [stockLimit, setStockLimit] = useState(settings.stockLimit || 10);
  const [emailUpdates, setEmailUpdates] = useState(
    settings.emailUpdates || false,
  );
  const [twoFactor, setTwoFactor] = useState(settings.twoFactor || false);
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  const handleStockLimit = () => {
    updateSettings({ stockLimit: Number(stockLimit) });
    toast.success("Stock limit updated");
  };

  const handleEmailToggle = () => {
    setEmailUpdates(!emailUpdates);
    updateSettings({ emailUpdates: !emailUpdates });
    toast.success(`Email updates ${!emailUpdates ? "enabled" : "disabled"}`);
  };

  const handle2FAToggle = () => {
    setTwoFactor(!twoFactor);
    updateSettings({ twoFactor: !twoFactor });
    toast.success(
      `Two-factor authentication ${!twoFactor ? "enabled" : "disabled"}`,
    );
  };

  const handleDarkToggle = () => {
    setDarkMode(!darkMode);
    toast.success(`Dark mode ${!darkMode ? "enabled" : "disabled"}`);
  };

  const handlePasswordChange = () => {
    if (!pwd.current || !pwd.new || !pwd.confirm) {
      toast.error("Please fill all password fields");
      return;
    }
    if (pwd.new !== pwd.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwd.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    toast.success("Password changed successfully");
    setPwd({ current: "", new: "", confirm: "" });
  };

  const sections = [
    {
      icon: Sliders,
      title: "Stock Limit",
      desc: "Set stock limit here, later you will receive the notification when stock hits the limit",
      content: (
        <div className="settings-section-content">
          <Input
            label="Stock Limit"
            type="number"
            value={stockLimit}
            onChange={(e) => setStockLimit(e.target.value)}
            className="settings-stock-input"
          />
          <Button onClick={handleStockLimit} className="settings-save-btn">
            Save
          </Button>
        </div>
      ),
    },
    {
      icon: Mail,
      title: "Email Updates",
      desc: "Keep it ON to receive notifications through email",
      content: (
        <div className="settings-toggle-wrapper">
          <ToggleSwitch isOn={emailUpdates} onToggle={handleEmailToggle} />
        </div>
      ),
    },
    {
      icon: Moon,
      title: "Dark Mode",
      desc: "Keep it ON for dark display",
      content: (
        <div className="settings-toggle-wrapper">
          <ToggleSwitch isOn={darkMode} onToggle={handleDarkToggle} />
        </div>
      ),
    },
  ];

  return (
    <div className="settings-container">
      {/* Settings sections */}
      {sections.map((section, idx) => {
        const Icon = section.icon;
        return (
          <div key={idx} className="settings-card">
            <div className="settings-card-inner">
              <div className="settings-card-icon">
                <Icon size={18} />
              </div>
              <div className="settings-card-content">
                <h3 className="settings-card-title">{section.title}</h3>
                <p className="settings-card-desc">{section.desc}</p>
                {section.content}
              </div>
            </div>
          </div>
        );
      })}

      {/* Security section */}
      <div className="settings-card">
        <div className="settings-security-header">
          <Shield size={18} className="settings-security-icon" />
          <h3 className="settings-card-title">Security</h3>
        </div>

        {/* Change Password */}
        <div className="settings-password-section">
          <div className="settings-password-header">
            <Lock size={16} className="settings-password-icon" />
            <h4 className="settings-password-title">Change Password</h4>
          </div>
          <div className="settings-password-grid">
            <Input
              label="Current Password"
              type="password"
              value={pwd.current}
              onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              className="settings-password-input"
            />
            <Input
              label="New Password"
              type="password"
              value={pwd.new}
              onChange={(e) => setPwd({ ...pwd, new: e.target.value })}
              className="settings-password-input"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              className="settings-password-input"
            />
          </div>
          <div className="settings-password-actions">
            <Button
              onClick={handlePasswordChange}
              className="settings-update-btn"
            >
              Update Password
            </Button>
          </div>
        </div>

        {/* 2FA */}
        <div className="settings-2fa-section">
          <div className="settings-2fa-content">
            <div>
              <p className="settings-2fa-title">Two-Factor Authentication</p>
              <p className="settings-2fa-desc">
                Keep your account secure by enabling 2FA
              </p>
            </div>
            <ToggleSwitch isOn={twoFactor} onToggle={handle2FAToggle} />
          </div>
        </div>
      </div>

      {/* Logout all devices */}
      <div className="settings-card">
        <div className="settings-logout-content">
          <div className="settings-logout-left">
            <div className="settings-logout-icon">
              <LogOut size={18} />
            </div>
            <div>
              <h3 className="settings-card-title">Logout All Devices</h3>
              <p className="settings-card-desc">
                Sign out from every active session.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => setLogoutAllOpen(true)}
            className="settings-logout-btn"
          >
            Sign Out All
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        onConfirm={() => {
          setLogoutAllOpen(false);
          toast.success("Signed out from all devices");
        }}
        title="Logout All Devices"
        message="Are you sure you want to sign out from every active session? You will need to log in again on all devices."
        confirmLabel="Sign Out All"
      />
    </div>
  );
}
