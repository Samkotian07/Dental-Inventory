import { useState } from "react";
import { Moon, Mail, Shield, Lock, LogOut, Sliders, Laptop } from "lucide-react";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";
import Input from "./common/Input";
import ToggleSwitch from "./common/ToggleSwitch";
import ConfirmDialog from "./common/ConfirmDialog";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { useMenuClick } from "./Layout.jsx";
import { toast } from "sonner";
import "./Settings.css";

export default function Settings() {
  const onMenuClick = useMenuClick();
  const { user, logout, logoutAll } = useAuth();
  const { settings = { lowQuantityThreshold: 10, twoFactor: false }, updateSettings, changePassword } = useData();
  const { darkMode, toggleDarkMode } = useTheme();

  const [twoFactor, setTwoFactor] = useState(settings?.twoFactor || false);
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [thresholdEdit, setThresholdEdit] = useState(settings?.lowQuantityThreshold ?? 10);

  const handle2FAToggle = () => {
    setTwoFactor(!twoFactor);
    updateSettings({ twoFactor: !twoFactor });
    toast.success(
      `Two-factor authentication ${!twoFactor ? "enabled" : "disabled"}`,
    );
  };

  const handleDarkToggle = () => {
    toggleDarkMode();
    toast.success(`Dark mode ${!darkMode ? "enabled" : "disabled"}`);
  };

  const handleThresholdChange = (e) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setThresholdEdit(value);
    }
  };

  const handleThresholdSave = () => {
    updateSettings({ lowQuantityThreshold: thresholdEdit });
    toast.success(`Default threshold set to ${thresholdEdit}`);
  };

  const handlePasswordChange = async () => {
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
    const result = await changePassword(pwd.current, pwd.new);
    if (result.success) {
      toast.success(result.message || "Password changed successfully");
      setPwd({ current: "", new: "", confirm: "" });
    } else {
      toast.error(result.message || "Failed to update password");
    }
  };

  const sections = [
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
    // ⭐ FIXED: Added Default Threshold section
    {
      icon: Sliders,
      title: "Default Low Stock Threshold",
      desc: "Set the default threshold for all products without custom values",
      content: (
        <div className="settings-threshold-wrapper">
          <div className="settings-threshold-row">
            <input
              type="number"
              min="0"
              value={thresholdEdit}
              onChange={handleThresholdChange}
              className="settings-threshold-input"
              style={{
                width: "100px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
              }}
            />
            <button
              onClick={handleThresholdSave}
              disabled={thresholdEdit === (settings?.lowQuantityThreshold ?? 10)}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                background: thresholdEdit === (settings?.lowQuantityThreshold ?? 10) ? "#E5E7EB" : "#2563EB",
                color: thresholdEdit === (settings?.lowQuantityThreshold ?? 10) ? "#9CA3AF" : "white",
                cursor: thresholdEdit === (settings?.lowQuantityThreshold ?? 10) ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Save
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
            Current: <strong>{settings?.lowQuantityThreshold ?? 10}</strong> units
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <DashboardHeader title="Settings" onMenuClick={onMenuClick} />
      <main className="settings-container">
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
            logoutAll();
          }}
          title="Logout All Devices"
          message="Are you sure you want to sign out from every active session? You will need to log in again on all devices."
          confirmLabel="Sign Out All"
        />
      </main>
    </>
  );
}