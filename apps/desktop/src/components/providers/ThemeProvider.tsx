import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// Theme types
export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

// Context type
export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
}

// Create context with undefined default
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider props
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// Get system preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Get stored theme
const getStoredTheme = (storageKey: string, defaultTheme: Theme): Theme => {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && ['dark', 'light', 'system'].includes(stored)) {
      return stored as Theme;
    }
  } catch {
    // localStorage not available
  }
  return defaultTheme;
};

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'productify-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  // Initialize theme from storage or default
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(storageKey, defaultTheme)
  );

  // Track resolved theme (actual dark/light value)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme(storageKey, defaultTheme);
    return stored === 'system' ? getSystemTheme() : stored as ResolvedTheme;
  });

  // Apply theme to document
  const applyTheme = useCallback((newResolvedTheme: ResolvedTheme) => {
    const root = window.document.documentElement;

    // Optionally disable transitions during theme change
    if (disableTransitionOnChange) {
      root.style.setProperty('--transition-duration', '0s');
    }

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(newResolvedTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        newResolvedTheme === 'dark' ? '#0f0f23' : '#667eea'
      );
    }

    // Re-enable transitions after a brief delay
    if (disableTransitionOnChange) {
      setTimeout(() => {
        root.style.removeProperty('--transition-duration');
      }, 100);
    }

    setResolvedTheme(newResolvedTheme);
  }, [disableTransitionOnChange]);

  // Set theme and persist to storage
  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch {
      // localStorage not available
    }
    setThemeState(newTheme);
  }, [storageKey]);

  // Toggle between dark and light
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Handle theme changes
  useEffect(() => {
    let resolved: ResolvedTheme;

    if (theme === 'system' && enableSystem) {
      resolved = getSystemTheme();
    } else if (theme === 'system') {
      resolved = 'dark'; // Fallback if system detection disabled
    } else {
      resolved = theme;
    }

    applyTheme(resolved);
  }, [theme, enableSystem, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, enableSystem, applyTheme]);

  // Sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (['dark', 'light', 'system'].includes(newTheme)) {
          setThemeState(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  // Context value
  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Export context for advanced use cases
export { ThemeContext };
