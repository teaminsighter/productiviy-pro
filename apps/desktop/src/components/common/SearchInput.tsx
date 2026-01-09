import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  debounceMs?: number;
}

const sizeConfig = {
  sm: {
    padding: 'pl-9 pr-8 py-2',
    icon: 'w-4 h-4',
    iconLeft: 'left-3',
    iconRight: 'right-2.5',
    text: 'text-sm',
  },
  md: {
    padding: 'pl-10 pr-9 py-2.5',
    icon: 'w-5 h-5',
    iconLeft: 'left-3',
    iconRight: 'right-3',
    text: 'text-sm',
  },
  lg: {
    padding: 'pl-12 pr-10 py-3',
    icon: 'w-5 h-5',
    iconLeft: 'left-4',
    iconRight: 'right-4',
    text: 'text-base',
  },
};

export function SearchInput({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  onClear,
  className,
  size = 'md',
  autoFocus = false,
  debounceMs = 300,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sizeStyles = sizeConfig[size];

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    // Debounced search
    if (onSearch && debounceMs > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(newValue);
      }, debounceMs);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(value);
    }
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Search icon */}
      <Search
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-white/40 transition-colors',
          sizeStyles.icon,
          sizeStyles.iconLeft,
          isFocused && 'text-primary'
        )}
      />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl outline-none transition-all duration-200',
          'bg-white/5 border border-white/10',
          'text-white placeholder:text-white/40',
          'hover:bg-white/8 hover:border-white/15',
          'focus:bg-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20',
          sizeStyles.padding,
          sizeStyles.text
        )}
      />

      {/* Clear button */}
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleClear}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 p-1 rounded-lg',
              'text-white/40 hover:text-white hover:bg-white/10',
              'transition-colors',
              sizeStyles.iconRight
            )}
          >
            <X className={sizeStyles.icon} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Search input with suggestions dropdown
export function SearchInputWithSuggestions({
  suggestions = [],
  onSelect,
  ...props
}: SearchInputProps & {
  suggestions?: string[];
  onSelect?: (value: string) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="relative">
      <SearchInput
        {...props}
        onChange={(value) => {
          props.onChange?.(value);
          setShowSuggestions(value.length > 0 && suggestions.length > 0);
        }}
      />

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glass-card p-2 z-50"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect?.(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
