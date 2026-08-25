import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isDOMError: boolean;
  retryCount: number;
}

// Errors that are safe to auto-recover from (DOM manipulation errors from Radix UI portals / ReactFlow)
const DOM_ERROR_PATTERNS = [
  "removeChild",
  "insertBefore",
  "appendChild",
  "zustand",
  "ReactFlow",
  "Cannot read properties of null",
  "The node to be removed is not a child",
  "Failed to execute",
  "NotFoundError",
];

function isDOMRecoverableError(error: Error): boolean {
  const msg = error.message || "";
  const stack = error.stack || "";
  return DOM_ERROR_PATTERNS.some(
    pattern => msg.includes(pattern) || stack.includes(pattern)
  );
}

class ErrorBoundary extends Component<Props, State> {
  private autoRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isDOMError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isDOMError = isDOMRecoverableError(error);
    return { hasError: true, error, isDOMError };
  }

  componentDidCatch(error: Error) {
    const isDOMError = isDOMRecoverableError(error);
    if (isDOMError) {
      // Auto-recover from DOM errors after a short delay
      console.warn(
        "[ErrorBoundary] DOM error caught, auto-recovering:",
        error.message
      );
      this.autoRetryTimer = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          isDOMError: false,
          retryCount: prev.retryCount + 1,
        }));
      }, 150);
    } else {
      console.error("[ErrorBoundary] Unrecoverable error:", error);
    }
  }

  componentWillUnmount() {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      isDOMError: false,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    // For DOM errors, render nothing while auto-recovering (brief flash)
    if (this.state.hasError && this.state.isDOMError) {
      return null;
    }

    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">
              Se ha producido un error inesperado.
            </h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.message}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RefreshCw size={16} />
                Intentar de nuevo
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
