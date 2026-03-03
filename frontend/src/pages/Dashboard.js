import React, { useState } from 'react';
import MetricCard from '../components/MetricCard';
import LeakCard from '../components/LeakCard';
import ChartsPanel from '../components/ChartsPanel';
import AuditPanel from '../components/AuditPanel';
import FilesSummary from '../components/FilesSummary';

const SEVERITY_TABS = ['All', 'High', 'Medium', 'Low'];

export default function Dashboard({ data, onReset, darkMode, setDarkMode }) {
  const [activeTab, setActiveTab] = useState('All');
  const [showAudit, setShowAudit] = useState(false);
  const { metrics, leaks, files, dataSummary, recordCounts } = data;
  const s = metrics.shopify;
  const m = metrics.meta;
  const hasMeta = metrics.combined.hasMetaData;
  const hasShopify = metrics.combined.hasShopifyData;

  const filteredLeaks = activeTab === 'All'
    ? leaks
    : leaks.filter(l => l.severity === activeTab.toLowerCase());

  const leakCounts = {
    high: leaks.filter(l => l.severity === 'high').length,
    medium: leaks.filter(l => l.severity === 'medium').length,
    low: leaks.filter(l => l.severity === 'low').length,
  };

  const fmt = (n, d = 2) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = (n) => `${fmt(n, 1)}%`;
  const fmtDollar = (n) => `$${fmt(n)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-slate-950/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-sm font-bold">P</div>
          <span className="font-semibold text-lg tracking-tight">Profit Leak Auditor</span>
          {leakCounts.high > 0 && (
            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-medium">
              {leakCounts.high} High Severity Leak{leakCounts.high !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/30"
          >
            {showAudit ? '← Close Audit' : '🤖 AI Deep Audit'}
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="text-slate-400 hover:text-slate-200 text-sm">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={onReset} className="text-slate-400 hover:text-slate-200 text-sm border border-slate-700 px-3 py-1.5 rounded-lg">
            ↩ New Audit
          </button>
        </div>
      </header>

      <div className={`flex flex-1 ${showAudit ? 'gap-0' : ''}`}>
        {/* Main Content */}
        <main className={`flex-1 overflow-auto px-6 py-6 transition-all ${showAudit ? 'max-w-[calc(100%-420px)]' : ''}`}>

          {/* Files Summary */}
          <FilesSummary files={files} recordCounts={recordCounts} />

          {/* Key Metrics Grid */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Performance Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {hasShopify && (
                <>
                  <MetricCard label="Total Revenue" value={fmtDollar(s.totalRevenue)} sub={`${s.orderCount} orders`} trend="neutral" />
                  <MetricCard label="Avg Order Value" value={fmtDollar(s.aov)} sub="per transaction" trend={s.aov > 80 ? 'good' : s.aov < 40 ? 'bad' : 'neutral'} />
                  <MetricCard label="Refund Rate" value={fmtPct(s.refundRate)} sub={fmtDollar(s.totalRefunds) + ' refunded'} trend={s.refundRate > 10 ? 'bad' : s.refundRate < 3 ? 'good' : 'neutral'} />
                  <MetricCard label="Discount Rate" value={fmtPct(s.discountRate)} sub={fmtDollar(s.totalDiscounts) + ' discounted'} trend={s.discountRate > 20 ? 'bad' : s.discountRate < 5 ? 'good' : 'neutral'} />
                  <MetricCard label="Repeat Rate" value={fmtPct(s.repeatRate)} sub="returning customers" trend={s.repeatRate > 30 ? 'good' : s.repeatRate < 10 ? 'bad' : 'neutral'} />
                  {s.estGrossProfit !== null && (
                    <MetricCard label="Est. Gross Profit" value={fmtDollar(s.estGrossProfit)} sub={`${fmtPct(s.grossMargin)} margin`} trend={s.grossMargin > 40 ? 'good' : s.grossMargin < 20 ? 'bad' : 'neutral'} />
                  )}
                </>
              )}
              {hasMeta && (
                <>
                  <MetricCard label="Total Ad Spend" value={fmtDollar(m.totalAdSpend)} sub={`${m.totalPurchases} purchases`} trend="neutral" />
                  <MetricCard label="Blended ROAS" value={`${fmt(m.blendedROAS)}x`} sub="return on ad spend" trend={m.blendedROAS >= 3 ? 'good' : m.blendedROAS < 1.5 ? 'bad' : 'neutral'} />
                  <MetricCard label="Cost Per Purchase" value={fmtDollar(m.cpp)} sub="avg CPP" trend={m.cpp < 30 ? 'good' : m.cpp > 80 ? 'bad' : 'neutral'} />
                  <MetricCard label="Avg CTR" value={fmtPct(m.avgCTR)} sub={`$${fmt(m.avgCPM)} CPM`} trend={m.avgCTR > 2 ? 'good' : m.avgCTR < 0.5 ? 'bad' : 'neutral'} />
                  <MetricCard label="Add-to-Cart Rate" value={fmtPct(m.addToCartRate)} sub="of link clicks" trend={m.addToCartRate > 5 ? 'good' : m.addToCartRate < 1 ? 'bad' : 'neutral'} />
                  <MetricCard label="Checkout Abandon" value={fmtPct(m.checkoutAbandonRate)} sub="of add-to-carts" trend={m.checkoutAbandonRate < 50 ? 'good' : m.checkoutAbandonRate > 80 ? 'bad' : 'neutral'} />
                </>
              )}
            </div>
          </section>

          {/* Charts */}
          <ChartsPanel metrics={metrics} />

          {/* Profit Leaks */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detected Profit Leaks</h2>
                <p className="text-slate-300 text-sm mt-1">
                  {leaks.length === 0
                    ? 'No significant leaks detected'
                    : `${leaks.length} leak${leaks.length !== 1 ? 's' : ''} found — ${leakCounts.high} high, ${leakCounts.medium} medium`}
                </p>
              </div>
              {/* Severity Filter Tabs */}
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                {SEVERITY_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                    {tab !== 'All' && leakCounts[tab.toLowerCase()] > 0 && (
                      <span className={`ml-1 px-1 rounded text-xs ${
                        tab === 'High' ? 'bg-red-800 text-red-300' :
                        tab === 'Medium' ? 'bg-yellow-800 text-yellow-300' :
                        'bg-green-800 text-green-300'
                      }`}>
                        {leakCounts[tab.toLowerCase()]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filteredLeaks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                {activeTab === 'All'
                  ? '✅ No profit leaks detected. Data looks healthy!'
                  : `No ${activeTab.toLowerCase()} severity leaks found.`}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaks.map((leak, i) => <LeakCard key={i} leak={leak} index={i} />)}
              </div>
            )}
          </section>
        </main>

        {/* AI Audit Side Panel */}
        {showAudit && (
          <aside className="w-[420px] border-l border-slate-800 bg-slate-950 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-hidden">
            <AuditPanel dataSummary={dataSummary} />
          </aside>
        )}
      </div>
    </div>
  );
}
