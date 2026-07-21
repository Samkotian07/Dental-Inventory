import { cn } from '../utils/helpers';

const VARIANTS = {
  success: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500',
  error: 'bg-error-100 text-error-700 dark:bg-error-500/15 dark:text-error-500',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export default function Badge({ variant = 'neutral', children, className }) {
  return (
    <span className={cn('badge', VARIANTS[variant], className)}>
      {children}
    </span>
  );
}
