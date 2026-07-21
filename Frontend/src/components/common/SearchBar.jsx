import { Search } from 'lucide-react';
import { cn } from '../utils/helpers';

export default function SearchBar({ placeholder = 'Search...', value, onChange, className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-10"
      />
    </div>
  );
}
