import { cn } from '../utils/helpers';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(VARIANTS[variant], SIZES[size], 'disabled:opacity-50 disabled:cursor-not-allowed', className)}
      {...props}
    >
      {children}
    </button>
  );
}
