import React from 'react';

const TREND_STYLES = {
  good: 'border-green-700/50 bg-green-950/20',
  bad: 'border-red-700/50 bg-red-950/20',
  neutral: 'border-slate-700/50 bg-slate-900/50',
};

const TREND_VALUE_STYLES = {
  good: 'text-green-400',
  bad: 'text-red-400',
  neutral: 'text-white',
};

const TREND_INDICATORS = {
  good: <span className="text-xs text-green-500">●</span>,
  bad: <span className="text-xs text-red-500">●</span>,
  neutral: null,
};

export default function MetricCard({ label, value, sub, trend = 'neutral' }) {
  return (
    <div className={`border rounded-xl p-4 transition-all hover:border-slate-600 ${TREND_STYLES[trend]}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-slate-400 font-medium leading-tight">{label}</p>
        {TREND_INDICATORS[trend]}
      </div>
      <p className={`text-2xl font-bold tracking-tight ${TREND_VALUE_STYLES[trend]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
