import React, { useEffect, useState } from 'react';

const STEPS = [
  'Parsing uploaded files...',
  'Detecting file types from column headers...',
  'Normalizing Shopify data...',
  'Normalizing Meta Ads data...',
  'Calculating performance metrics...',
  'Running profit leak detection engine...',
  'Generating insights...',
];

export default function ProcessingScreen() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < STEPS.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Animated Logo */}
        <div className="w-16 h-16 bg-red-500/20 border-2 border-red-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-8 animate-pulse">
          🔍
        </div>

        <h2 className="text-2xl font-bold mb-2">Auditing Your Data</h2>
        <p className="text-slate-400 mb-10">Scanning for profit leaks across all uploaded files...</p>

        {/* Progress Steps */}
        <div className="space-y-3 text-left">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${i <= step ? 'opacity-100' : 'opacity-20'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs
                ${i < step ? 'bg-green-500' : i === step ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}>
                {i < step ? '✓' : i === step ? '•' : ''}
              </div>
              <span className={`text-sm ${i === step ? 'text-white' : i < step ? 'text-slate-400' : 'text-slate-600'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Loading Bar */}
        <div className="mt-8 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
