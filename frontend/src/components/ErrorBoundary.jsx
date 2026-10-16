import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('NoticeGuard UI Error Boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060B18] text-white flex items-center justify-center p-6 font-body">
          <div className="max-w-md w-full bg-[#0E1B38] border border-rose-500/40 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h1 className="font-heading font-black text-xl text-white">
              Something unexpected happened
            </h1>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              NoticeGuard AI encountered a temporary display issue. Don't worry, your data is safe.
            </p>

            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-full bg-[#FFC72C] text-black font-bold text-xs hover:bg-[#FDB813] transition-colors inline-flex items-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
