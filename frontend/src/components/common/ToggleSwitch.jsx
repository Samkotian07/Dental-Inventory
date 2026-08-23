import "./ToggleSwitch.css";

export default function ToggleSwitch({ isOn, onToggle, label }) {
  return (
    <button
      onClick={onToggle}
      className="toggle-switch-btn"
      type="button"
    >
      <span className={`toggle-switch-track ${isOn ? "is-on" : ""}`}>
        <span className="toggle-switch-thumb" />
      </span>
      {label && (
        <span className="toggle-switch-label">{label}</span>
      )}
    </button>
  );
}
