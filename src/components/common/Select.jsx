import { cn } from '../utils/helpers';

export default function Select({ label, options = [], error, className, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <select className={cn('input-base cursor-pointer', error && 'border-error-500 focus:ring-error-500', className)} {...props}>
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}
