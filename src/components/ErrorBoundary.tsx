import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Page
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs bg-secondary p-4 rounded-lg overflow-auto max-h-40 text-destructive">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
