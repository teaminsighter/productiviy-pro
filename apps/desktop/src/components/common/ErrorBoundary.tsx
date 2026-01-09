import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  // Optional name for identifying which boundary caught the error
  name?: string;
  // Whether to show a minimal error UI (for smaller components)
  minimal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  copied: boolean;
}

// Maximum retries before showing "too many errors" message
const MAX_RETRIES = 3;
const RETRY_RESET_TIME = 60000; // 1 minute

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
    lastErrorTime: 0,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryName = this.props.name || 'Unknown';
    console.error(`ErrorBoundary [${boundaryName}] caught an error:`, error, errorInfo);

    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;

    // Reset error count if enough time has passed
    const newErrorCount = timeSinceLastError > RETRY_RESET_TIME
      ? 1
      : this.state.errorCount + 1;

    this.setState({
      errorInfo,
      errorCount: newErrorCount,
      lastErrorTime: now,
    });

    // Log error to backend for tracking (non-blocking)
    this.logErrorToBackend(error, errorInfo, boundaryName).catch(() => {
      // Silently fail - we don't want error logging to cause more errors
    });
  }

  private async logErrorToBackend(error: Error, errorInfo: ErrorInfo, boundaryName: string) {
    try {
      await fetch('http://localhost:8000/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          boundary: boundaryName,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      });
    } catch {
      // Silently fail
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    window.location.hash = '#/';
    this.handleReset();
  };

  private handleCopyError = async () => {
    if (!this.state.error) return;

    const errorText = [
      `Error: ${this.state.error.name}: ${this.state.error.message}`,
      `\nStack:\n${this.state.error.stack}`,
      this.state.errorInfo ? `\nComponent Stack:\n${this.state.errorInfo.componentStack}` : '',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Clipboard access denied
    }
  };

  private renderMinimalError() {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Something went wrong</span>
          <button
            onClick={this.handleReset}
            className="ml-auto flex items-center gap-1 text-xs hover:text-red-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show minimal error for smaller components
      if (this.props.minimal) {
        return this.renderMinimalError();
      }

      // Check if too many errors have occurred
      const tooManyErrors = this.state.errorCount >= MAX_RETRIES;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6"
          >
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {tooManyErrors ? 'Repeated errors detected' : 'Something went wrong'}
          </h2>
          <p className="text-white/50 mb-6 max-w-md">
            {tooManyErrors
              ? 'This component keeps crashing. Try going back to the dashboard or refreshing the page.'
              : 'An unexpected error occurred. You can try refreshing the page or going back to the dashboard.'}
          </p>

          {/* Error count indicator */}
          {this.state.errorCount > 1 && (
            <div className="mb-4 flex items-center gap-2 text-yellow-400 text-sm">
              <Bug className="w-4 h-4" />
              <span>Error occurred {this.state.errorCount} times</span>
            </div>
          )}

          {/* Development error details */}
          {import.meta.env.DEV && this.state.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-lg w-full text-left">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 text-sm font-mono truncate flex-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                <button
                  onClick={this.handleCopyError}
                  className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy error details"
                >
                  {this.state.copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/50" />
                  )}
                </button>
              </div>
              {this.state.errorInfo && (
                <pre className="text-white/40 text-xs overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!tooManyErrors && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </motion.button>
            {tooManyErrors && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </motion.button>
            )}
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    name?: string;
    minimal?: boolean;
  }
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        fallback={options?.fallback}
        name={options?.name}
        minimal={options?.minimal}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Functional component wrapper for simpler use cases
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  name?: string;
  minimal?: boolean;
  fallback?: ReactNode;
}

export function SafeComponent({ children, name, minimal, fallback }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary name={name} minimal={minimal} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
