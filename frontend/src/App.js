import React, { useState } from 'react';
import UploadScreen from './pages/UploadScreen';
import ProcessingScreen from './pages/ProcessingScreen';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [screen, setScreen] = useState('upload'); // upload | processing | dashboard
  const [auditData, setAuditData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  const handleUploadComplete = (data) => {
    setAuditData(data);
    setScreen('dashboard');
  };

  const handleProcessing = () => {
    setScreen('processing');
  };

  const handleReset = () => {
    setAuditData(null);
    setScreen('upload');
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-950 dark:bg-slate-950 text-slate-100 transition-colors">
        {screen === 'upload' && (
          <UploadScreen
            onProcessing={handleProcessing}
            onComplete={handleUploadComplete}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}
        {screen === 'processing' && (
          <ProcessingScreen />
        )}
        {screen === 'dashboard' && auditData && (
          <Dashboard
            data={auditData}
            onReset={handleReset}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}
      </div>
    </div>
  );
}
