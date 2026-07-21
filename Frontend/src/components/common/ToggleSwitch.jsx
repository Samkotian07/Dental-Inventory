import { cn } from '../utils/helpers';

export default function ToggleSwitch({ isOn, onToggle, label }) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-3 group"
      type="button"
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          isOn ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
            isOn ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </span>
      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      )}
    </button>
  );
}
