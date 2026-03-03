import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];
const RED = '#ef4444';
const YELLOW = '#eab308';
const GREEN = '#22c55e';

function roasColor(roas) {
  if (roas >= 3) return GREEN;
  if (roas >= 1.5) return YELLOW;
  return RED;
}

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
};

export default function ChartsPanel({ metrics }) {
  const s = metrics.shopify;
  const m = metrics.meta;
  const hasMeta = metrics.combined.hasMetaData;
  const hasShopify = metrics.combined.hasShopifyData;

  const topProducts = s.topProducts.slice(0, 8);
  const worstAdsets = m.worstAdsets.slice(0, 8);

  // Funnel data for pie chart
  const funnelData = hasMeta && m.totalClicks > 0 ? [
    { name: 'Clicks only', value: Math.max(0, m.totalClicks - m.totalAddToCarts) },
    { name: 'Add to Cart', value: Math.max(0, m.totalAddToCarts - m.totalInitiateCheckouts) },
    { name: 'Initiate Checkout', value: Math.max(0, m.totalInitiateCheckouts - m.totalPurchases) },
    { name: 'Purchased', value: m.totalPurchases },
  ].filter(d => d.value > 0) : [];

  const FUNNEL_COLORS = [RED, YELLOW, '#f97316', GREEN];

  if (!hasShopify && !hasMeta) return null;

  return (
    <section className="mb-8 space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data Visualization</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        {hasShopify && topProducts.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Products by Revenue</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topProducts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ad Set ROAS Comparison */}
        {hasMeta && worstAdsets.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Ad Set ROAS Performance</h3>
            <p className="text-xs text-slate-500 mb-4">Red = below 1.5x (losing money)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={worstAdsets} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}x`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={v => v.length > 14 ? v.substring(0, 14) + '…' : v}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, n, p) => [`${p.payload.roas.toFixed(2)}x ROAS ($${p.payload.spend.toFixed(0)} spend)`, p.payload.name]}
                />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                  {worstAdsets.map((entry, i) => (
                    <Cell key={i} fill={roasColor(entry.roas)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Funnel Breakdown */}
        {hasMeta && funnelData.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Purchase Funnel Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString(), 'Users']} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spend vs Revenue */}
        {hasMeta && m.totalAdSpend > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Spend vs Purchase Value</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: 'Ad Spend', value: m.totalAdSpend },
                  { name: 'Purchase Value', value: m.totalPurchaseValue || (m.totalAdSpend * m.blendedROAS) },
                ]}
                margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v.toLocaleString()}`, '']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill={RED} />
                  <Cell fill={GREEN} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-slate-500 mt-2">ROAS: {m.blendedROAS.toFixed(2)}x</p>
          </div>
        )}
      </div>
    </section>
  );
}
