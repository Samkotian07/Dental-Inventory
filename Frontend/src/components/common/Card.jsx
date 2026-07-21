import { cn } from '../../utils/helpers';

const COLORS = {
  primary: 'from-primary-500 to-primary-600',
  secondary: 'from-secondary-500 to-secondary-600',
  success: 'from-success-500 to-success-600',
  warning: 'from-warning-500 to-warning-600',
  error: 'from-error-500 to-error-600',
  accent: 'from-accent-500 to-accent-600',
};

export default function Card({ title, count, icon, color = 'primary', onClick, subtitle, children, className }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-base p-5 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {children ? (
        children
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{count}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {icon && (
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm', COLORS[color])}>
              {icon}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
