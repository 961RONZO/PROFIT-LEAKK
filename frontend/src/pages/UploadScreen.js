import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const FILE_INSTRUCTIONS = [
  {
    platform: 'Shopify',
    color: 'from-green-900/50 to-green-800/30 border-green-700/50',
    icon: '🛒',
    exports: [
      { name: 'Orders Export', path: 'Admin → Orders → Export (all orders, CSV)', note: 'Primary data source' },
      { name: 'Products Export', path: 'Admin → Products → Export (CSV)', note: 'Needed for COGS margin analysis' },
      { name: 'Customers Export', path: 'Admin → Customers → Export (CSV)', note: 'For retention analysis' },
    ],
  },
  {
    platform: 'Meta Ads',
    color: 'from-blue-900/50 to-blue-800/30 border-blue-700/50',
    icon: '📊',
    exports: [
      { name: 'Campaigns Report', path: 'Ads Manager → Campaigns tab → Export (CSV)', note: 'Top-level spend & ROAS' },
      { name: 'Ad Sets Report', path: 'Ads Manager → Ad Sets tab → Export (CSV)', note: 'Most detailed for leak detection' },
      { name: 'Ads Report', path: 'Ads Manager → Ads tab → Export (CSV)', note: 'Creative-level performance' },
    ],
  },
];

export default function UploadScreen({ onProcessing, onComplete, darkMode, setDarkMode }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = acceptedFiles.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true,
  });

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleUpload = async () => {
    if (files.length === 0) { setError('Please add at least one file'); return; }
    setError('');
    onProcessing();

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const resp = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      onComplete(resp.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
      // Go back to upload screen by calling a reset via window reload workaround
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-sm font-bold">P</div>
          <span className="font-semibold text-lg tracking-tight">Profit Leak Auditor</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Internal Tool</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="text-slate-400 hover:text-slate-200 text-sm">
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Find Where Your Profit Is Leaking
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Upload your Shopify and Meta Ads exports. Get an instant AI-powered profit leak analysis with specific fixes.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6
            ${isDragActive
              ? 'border-blue-400 bg-blue-950/30'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'}`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-3">📁</div>
          {isDragActive ? (
            <p className="text-blue-400 font-medium text-lg">Drop files here...</p>
          ) : (
            <>
              <p className="text-slate-200 font-medium text-lg mb-1">Drag & drop your CSV/Excel files here</p>
              <p className="text-slate-500 text-sm">or click to browse — supports multiple files at once</p>
            </>
          )}
          <div className="flex justify-center gap-2 mt-4">
            {['.csv', '.xlsx', '.xls'].map(ext => (
              <span key={ext} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{ext}</span>
            ))}
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-6 space-y-2">
            {files.map(f => (
              <div key={f.name} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">📄</span>
                  <span className="text-sm text-slate-200">{f.name}</span>
                  <span className="text-xs text-slate-500">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-red-400 text-xs">✕ Remove</button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="mb-4 text-red-400 text-sm bg-red-950/30 border border-red-800 rounded-lg px-4 py-3">{error}</div>}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-all mb-10
            ${files.length > 0
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          {uploading ? 'Analyzing...' : `Analyze ${files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''}` : 'Files'} →`}
        </button>

        {/* Instructions */}
        <div className="mb-4">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">How to export your data</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {FILE_INSTRUCTIONS.map(platform => (
              <div key={platform.platform} className={`bg-gradient-to-br ${platform.color} border rounded-xl p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span>{platform.icon}</span>
                  <span className="font-semibold text-slate-200">{platform.platform}</span>
                </div>
                <ul className="space-y-3">
                  {platform.exports.map(exp => (
                    <li key={exp.name}>
                      <div className="text-sm font-medium text-slate-200">{exp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{exp.path}</div>
                      <div className="text-xs text-slate-500 italic">{exp.note}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          All data is processed in memory and never stored. Internal use only.
        </p>
      </main>
    </div>
  );
}
