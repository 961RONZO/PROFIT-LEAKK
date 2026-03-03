import React, { useState } from 'react';

const FILE_TYPE_LABELS = {
  shopify_orders: { label: 'Shopify Orders', icon: '🛒', color: 'text-green-400' },
  shopify_products: { label: 'Shopify Products', icon: '📦', color: 'text-green-400' },
  shopify_customers: { label: 'Shopify Customers', icon: '👥', color: 'text-green-400' },
  meta_campaigns: { label: 'Meta Campaigns', icon: '📊', color: 'text-blue-400' },
  meta_adsets: { label: 'Meta Ad Sets', icon: '🎯', color: 'text-blue-400' },
  meta_ads: { label: 'Meta Ads', icon: '🎨', color: 'text-blue-400' },
  unknown: { label: 'Unknown Type', icon: '❓', color: 'text-yellow-400' },
  error: { label: 'Parse Error', icon: '❌', color: 'text-red-400' },
  empty: { label: 'Empty File', icon: '⬜', color: 'text-slate-400' },
};

export default function FilesSummary({ files, recordCounts }) {
  const [open, setOpen] = useState(false);

  const successCount = files.filter(f => !f.error).length;
  const errorCount = files.filter(f => f.error).length;

  return (
    <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm font-medium text-slate-200">
              {files.length} file{files.length !== 1 ? 's' : ''} processed
            </span>
            <span className="text-xs text-slate-500 ml-3">
              {successCount > 0 && <span className="text-green-400">{successCount} detected</span>}
              {errorCount > 0 && <span className="text-red-400 ml-2">{errorCount} errors</span>}
            </span>
          </div>
          <div className="flex gap-3 text-xs text-slate-500">
            {recordCounts.orders > 0 && <span>{recordCounts.orders.toLocaleString()} orders</span>}
            {recordCounts.products > 0 && <span>{recordCounts.products.toLocaleString()} products</span>}
            {(recordCounts.metaCampaigns + recordCounts.metaAdsets) > 0 && (
              <span>{(recordCounts.metaCampaigns + recordCounts.metaAdsets).toLocaleString()} ad entries</span>
            )}
          </div>
        </div>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'} Details</span>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-5 py-4">
          <div className="space-y-2">
            {files.map((f, i) => {
              const config = FILE_TYPE_LABELS[f.type] || FILE_TYPE_LABELS.unknown;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-slate-400 max-w-xs truncate">{f.filename}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    {f.rowCount > 0 && <span className="text-xs text-slate-500">{f.rowCount.toLocaleString()} rows</span>}
                    {f.error && <span className="text-xs text-red-400 max-w-xs truncate">{f.error}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
