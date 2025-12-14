import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import GlobalErrorBoundary from './GlobalErrorBoundary';

import { AppProvider } from './context/AppContext';

console.log("Starting React App...");

try {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <GlobalErrorBoundary>
                <AppProvider>
                    <App />
                </AppProvider>
            </GlobalErrorBoundary>
        </React.StrictMode>
    );
    console.log("React Render Triggered.");
} catch (e) {
    console.error("Root Render Failed:", e);
    document.body.innerHTML = `<h1 style="color:red">Fatal Init Error: ${e.message}</h1>`;
}
