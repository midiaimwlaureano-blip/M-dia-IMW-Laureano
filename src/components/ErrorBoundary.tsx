import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let message = "Ocorreu um erro inesperado.";
      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.error.includes("insufficient permissions")) {
            message = "Você não tem permissão para realizar esta ação.";
          }
        }
      } catch (e) {
        // Not JSON, use default or raw message
        if (error?.message.includes("insufficient permissions")) {
           message = "Você não tem permissão para realizar esta ação.";
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
