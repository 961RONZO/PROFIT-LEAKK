import React, { useState } from 'react';

const SEVERITY_CONFIG = {
  high: {
    badge: 'bg-red-900 text-red-300 border-red-700',
    border: 'border-red-800/60',
    bg: 'bg-red-950/20',
    icon: '🔴',
    label: 'HIGH',
  },
  medium: {
    badge: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    border: 'border-yellow-800/60',
    bg: 'bg-yellow-950/20',
    icon: '🟡',
    label: 'MEDIUM',
  },
  low: {
    badge: 'bg-green-900 text-green-300 border-green-700',
    border: 'border-green-800/60',
    bg: 'bg-green-950/20',
    icon: '🟢',
    label: 'LOW',
  },
};

const CATEGORY_ICONS = {
  'Ad Spend': '💸',
  'Funnel': '🔻',
  'Product': '📦',
  'Retention': '🔄',
  'Creative/Audience': '🎨',
};

export default function LeakCard({ leak, index }) {
  const [expanded, setExpanded] = useState(index < 3);
  const config = SEVERITY_CONFIG[leak.severity] || SEVERITY_CONFIG.medium;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${config.border} ${config.bg}`}>
      {/* Header (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${config.badge}`}>
                {config.label}
              </span>
              <span className="text-xs text-slate-500">
                {CATEGORY_ICONS[leak.category] || '⚠️'} {leak.category}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-1">{leak.title}</p>
          </div>
        </div>
        <span className="text-slate-500 text-xs ml-3 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Body (expandable) */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-800/50">
          <p className="text-sm text-slate-300 pt-3 leading-relaxed">{leak.description}</p>

          <div className="bg-slate-900/60 rounded-lg px-4 py-3 space-y-2">
            <div>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Data Point</span>
              <p className="text-sm text-slate-200 mt-0.5 font-mono">{leak.dataPoint}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Estimated Impact</span>
              <p className="text-sm text-orange-300 mt-0.5">{leak.estimatedImpact}</p>
            </div>
          </div>

          <div className="border border-blue-800/40 bg-blue-950/20 rounded-lg px-4 py-3">
            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Recommended Fix</span>
            <p className="text-sm text-slate-200 mt-1 leading-relaxed">{leak.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
