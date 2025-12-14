import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-900 text-white min-h-screen p-10 font-mono">
                    <h1 className="text-3xl font-bold mb-4">CRITICAL FRONTEND CRASH</h1>
                    <div className="bg-black/50 p-6 rounded border border-red-500 overflow-auto">
                        <h2 className="text-xl text-red-300 mb-2">{this.state.error && this.state.error.toString()}</h2>
                        <details className="whitespace-pre-wrap text-sm text-gray-300">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </div>
                    <p className="mt-8 text-lg">Please screenshot this page and share it with the developer.</p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
