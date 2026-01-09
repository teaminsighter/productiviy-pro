/**
 * useTheme Hook
 *
 * Re-exports the useTheme hook from ThemeProvider for convenient imports.
 * Also provides additional theme-related utilities.
 */

export {
  useTheme,
  ThemeContext,
  type Theme,
  type ResolvedTheme,
  type ThemeContextType,
} from '@/components/providers/ThemeProvider';

/**
 * Theme color values for programmatic access
 */
export const themeColors = {
  dark: {
    background: '#0f0f23',
    surface: '#1a1a3e',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    primary: '#6366f1',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e1b4b',
    textSecondary: 'rgba(30, 27, 75, 0.8)',
    border: 'rgba(0, 0, 0, 0.1)',
    primary: '#6366f1',
  },
} as const;

/**
 * Get theme colors for the specified theme
 */
export function getThemeColors(theme: 'dark' | 'light') {
  return themeColors[theme];
}

/**
 * CSS variable names for theme values
 */
export const themeVariables = {
  bgGradient: '--bg-gradient',
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  glassBg: '--glass-bg',
  glassBorder: '--glass-border',
  glassBlur: '--glass-blur',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  shadowGlow: '--shadow-glow',
  colorPrimary: '--color-primary',
} as const;

/**
 * Get CSS variable value
 */
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}
