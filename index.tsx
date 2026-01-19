
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Engine Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6 text-center font-sans">
          <div className="bg-red-500/10 p-4 rounded-full mb-6 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 uppercase tracking-tighter italic">Engine Error</h1>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">The application encountered a critical runtime failure.</p>
          <div className="bg-black/40 p-4 rounded-xl border border-slate-800 text-left mb-8 max-w-md w-full overflow-hidden">
             <code className="text-red-400 text-xs break-all">{this.state.error?.message}</code>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
          >
            Restart Interface
          </button>
        </div>
      );
    }
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
