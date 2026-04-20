import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/App.css';
// Service Worker 등록 (빌드된 환경에서만 실제 SW가 생성됩니다)
import './registerSW.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
