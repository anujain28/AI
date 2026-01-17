
import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary class component to catch rendering errors.
 * Fixed: Extending React.Component explicitly and using constructor for state initialization 
 * to ensure that inherited properties like setState and props are correctly recognized by TypeScript.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Initializing state in constructor to avoid shadowing base class properties
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash Details:", error, errorInfo);
    // Fixed: Accessing setState inherited from React.Component
    this.setState({ errorInfo });
  }

  render() {
    // Fixed: Accessing state inherited from React.Component
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6 font-mono text-center">
          <div className="bg-red-900/20 p-4 rounded-full mb-4 border border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" cy="8" x2="12" y2="12"></line><line x1="12" cy="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Application Crash</h1>
          <p className="text-slate-400 text-sm mb-4">A critical error occurred. Please try reloading.</p>
          <div className="w-full max-w-lg bg-black/50 p-4 rounded-lg border border-slate-800 text-left overflow-auto max-h-64 mb-6">
            <p className="text-red-400 text-xs font-bold mb-1">{this.state.error?.toString()}</p>
            <pre className="text-[10px] text-slate-500">{this.state.error?.stack}</pre>
          </div>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-colors">
            Reload Application
          </button>
        </div>
      );
    }

    // Fixed: Accessing props inherited from React.Component
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
