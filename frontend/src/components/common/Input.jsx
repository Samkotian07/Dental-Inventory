import { cn } from '../utils/helpers';

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <input className={cn('input-base', error && 'border-error-500 focus:ring-error-500', className)} {...props} />
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}
