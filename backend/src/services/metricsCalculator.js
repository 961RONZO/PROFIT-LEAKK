/**
 * Calculate high-level dashboard metrics from normalized data.
 */

function safeDiv(num, denom) {
  if (!denom || denom === 0) return 0;
  return num / denom;
}

function calculateMetrics(data) {
  const orders = data.orders || [];
  const customers = data.customers || [];
  const metaAdsets = data.metaAdsets || [];
  const metaCampaigns = data.metaCampaigns || [];
  const products = data.products || [];

  const allMetaData = [...metaCampaigns, ...metaAdsets];

  // ── Shopify Metrics ──────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);
  const totalRefunds = orders.reduce((s, o) => s + o.refundAmount, 0);
  const totalDiscounts = orders.reduce((s, o) => s + o.discountAmount, 0);
  const netRevenue = totalRevenue - totalRefunds;
  const orderCount = orders.length;
  const aov = safeDiv(totalRevenue, orderCount);
  const refundRate = safeDiv(totalRefunds, totalRevenue) * 100;
  const discountRate = safeDiv(totalDiscounts, totalRevenue + totalDiscounts) * 100;

  // Product revenue breakdown
  const productRevMap = {};
  for (const o of orders) {
    const key = o.productTitle || 'Unknown';
    productRevMap[key] = (productRevMap[key] || 0) + o.totalPrice;
  }
  const topProducts = Object.entries(productRevMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Unique customers / repeat rate from orders
  const emailCounts = {};
  for (const o of orders) {
    if (o.email) emailCounts[o.email] = (emailCounts[o.email] || 0) + 1;
  }
  const uniqueFromOrders = Object.keys(emailCounts).length;
  const repeatFromOrders = Object.values(emailCounts).filter(c => c > 1).length;
  const repeatRateFromOrders = safeDiv(repeatFromOrders, uniqueFromOrders) * 100;

  // Customer metrics (from customer file if available)
  let avgLTV = 0;
  let repeatRate = repeatRateFromOrders;
  if (customers.length > 0) {
    avgLTV = safeDiv(customers.reduce((s, c) => s + c.totalSpent, 0), customers.length);
    const repeat = customers.filter(c => c.ordersCount > 1).length;
    repeatRate = safeDiv(repeat, customers.length) * 100;
  }

  // COGS / gross profit (only if product cost data available)
  let estGrossProfit = null;
  let grossMargin = null;
  const productsWithCogs = products.filter(p => p.cogs > 0);
  if (productsWithCogs.length > 0) {
    const avgCogs = safeDiv(productsWithCogs.reduce((s, p) => s + p.cogs, 0), productsWithCogs.length);
    const avgPrice = safeDiv(productsWithCogs.reduce((s, p) => s + p.price, 0), productsWithCogs.length);
    const cogsRatio = safeDiv(avgCogs, avgPrice);
    const estimatedCOGS = netRevenue * cogsRatio;
    estGrossProfit = netRevenue - estimatedCOGS;
    grossMargin = safeDiv(estGrossProfit, netRevenue) * 100;
  }

  // ── Meta Ads Metrics ─────────────────────────────────────────────────────
  const totalAdSpend = allMetaData.reduce((s, a) => s + a.spend, 0);
  const totalPurchaseValue = allMetaData.reduce((s, a) => s + a.purchaseValue, 0);
  const totalPurchases = allMetaData.reduce((s, a) => s + a.purchases, 0);
  const totalImpressions = allMetaData.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = allMetaData.reduce((s, a) => s + a.clicks, 0);
  const totalAddToCarts = allMetaData.reduce((s, a) => s + a.addToCarts, 0);
  const totalInitiateCheckouts = allMetaData.reduce((s, a) => s + a.initiateCheckouts, 0);

  // Use reported ROAS if available, else calculate from data
  const reportedROAS = allMetaData.filter(a => a.roas > 0);
  let blendedROAS = 0;
  if (totalAdSpend > 0) {
    if (totalPurchaseValue > 0) {
      blendedROAS = safeDiv(totalPurchaseValue, totalAdSpend);
    } else if (reportedROAS.length > 0) {
      const weightedRoas = reportedROAS.reduce((s, a) => s + a.roas * a.spend, 0);
      const totalSpendWithRoas = reportedROAS.reduce((s, a) => s + a.spend, 0);
      blendedROAS = safeDiv(weightedRoas, totalSpendWithRoas);
    } else if (totalRevenue > 0) {
      blendedROAS = safeDiv(totalRevenue, totalAdSpend);
    }
  }

  const avgCTR = safeDiv(totalClicks, totalImpressions) * 100;
  const avgCPM = safeDiv(totalAdSpend, totalImpressions) * 1000;
  const avgCPC = safeDiv(totalAdSpend, totalClicks);
  const cpp = safeDiv(totalAdSpend, totalPurchases);
  const addToCartRate = safeDiv(totalAddToCarts, totalClicks) * 100;
  const checkoutAbandonRate = totalAddToCarts > 0
    ? safeDiv(totalAddToCarts - totalPurchases, totalAddToCarts) * 100
    : 0;

  // ── Worst ad sets by ROAS ────────────────────────────────────────────────
  const adsetROAS = [...metaAdsets, ...metaCampaigns]
    .filter(a => a.spend > 0)
    .map(a => ({
      name: a.name,
      level: a.level,
      roas: a.roas || safeDiv(a.purchaseValue, a.spend),
      spend: a.spend,
      purchases: a.purchases,
    }))
    .sort((a, b) => a.roas - b.roas)
    .slice(0, 10);

  return {
    shopify: {
      totalRevenue,
      netRevenue,
      totalRefunds,
      totalDiscounts,
      orderCount,
      aov,
      refundRate,
      discountRate,
      topProducts,
      repeatRate,
      avgLTV,
      estGrossProfit,
      grossMargin,
      hasCogsData: productsWithCogs.length > 0,
    },
    meta: {
      totalAdSpend,
      totalPurchaseValue,
      totalPurchases,
      totalImpressions,
      totalClicks,
      totalAddToCarts,
      totalInitiateCheckouts,
      blendedROAS,
      avgCTR,
      avgCPM,
      avgCPC,
      cpp,
      addToCartRate,
      checkoutAbandonRate,
      worstAdsets: adsetROAS,
    },
    combined: {
      hasShopifyData: orders.length > 0 || products.length > 0 || customers.length > 0,
      hasMetaData: allMetaData.length > 0,
    },
  };
}

module.exports = { calculateMetrics };
