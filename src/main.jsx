import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './style.css';

const storedFont = localStorage.getItem('wheretogo:fontFamily');
if (storedFont) {
  document.documentElement.style.setProperty('--app-font', storedFont);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
); 
