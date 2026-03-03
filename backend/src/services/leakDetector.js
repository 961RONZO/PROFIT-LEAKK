/**
 * Profit Leak Detection Engine
 * Modular design — add new detectors by pushing to LEAK_DETECTORS array.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
function pct(num, denom) {
  if (!denom || denom === 0) return 0;
  return (num / denom) * 100;
}

function fmt(n, decimals = 2) {
  return Number(n.toFixed(decimals));
}

// ─── Individual Leak Detectors ───────────────────────────────────────────────

/**
 * AD SPEND LEAKS
 */
function detectAdSpendLeaks(data) {
  const leaks = [];
  const adsets = data.metaAdsets || [];
  const campaigns = data.metaCampaigns || [];

  const allAds = [...adsets, ...campaigns];

  // 1. Low ROAS but significant spend
  for (const ad of allAds) {
    if (ad.spend < 50) continue;
    if (ad.roas > 0 && ad.roas < 1.5) {
      const lost = ad.spend - (ad.purchaseValue || ad.spend * ad.roas);
      leaks.push({
        category: 'Ad Spend',
        severity: ad.roas < 1.0 ? 'high' : 'medium',
        title: `Low ROAS on "${ad.name}"`,
        description: `This ${ad.level} has a ROAS of ${fmt(ad.roas, 2)} on $${fmt(ad.spend)} spend — below the 1.5 profitability threshold.`,
        dataPoint: `ROAS: ${fmt(ad.roas, 2)} | Spend: $${fmt(ad.spend)} | Revenue generated: $${fmt(ad.purchaseValue || 0)}`,
        estimatedImpact: `Potential loss vs breakeven: ~$${fmt(Math.max(0, ad.spend - (ad.purchaseValue || 0)))}`,
        recommendation: `Pause or restructure "${ad.name}". Test new creatives, tighten audience targeting, or move budget to higher-ROAS ad sets.`,
      });
    }

    // 2. High CPM + Low CTR (creative/placement problem)
    if (ad.cpm > 30 && ad.ctr < 1.0 && ad.spend > 50) {
      leaks.push({
        category: 'Ad Spend',
        severity: 'medium',
        title: `High CPM + Low CTR on "${ad.name}"`,
        description: `CPM of $${fmt(ad.cpm)} with only ${fmt(ad.ctr, 2)}% CTR indicates expensive reach with poor engagement.`,
        dataPoint: `CPM: $${fmt(ad.cpm)} | CTR: ${fmt(ad.ctr, 2)}% | Spend: $${fmt(ad.spend)}`,
        estimatedImpact: `Inflated cost-per-click of $${fmt(ad.cpc || 0)} limits funnel efficiency`,
        recommendation: `Refresh ad creative for "${ad.name}". Test different hooks, angles, or formats (video vs static). Consider excluding saturated audiences.`,
      });
    }

    // 3. Campaigns with 0 or 1 purchase but significant spend
    if (ad.spend > 100 && ad.purchases <= 1) {
      leaks.push({
        category: 'Ad Spend',
        severity: 'high',
        title: `Near-zero purchases on "${ad.name}"`,
        description: `$${fmt(ad.spend)} spent with only ${ad.purchases} purchase(s). This ${ad.level} is generating almost no conversions.`,
        dataPoint: `Spend: $${fmt(ad.spend)} | Purchases: ${ad.purchases} | CPP: $${fmt(ad.costPerPurchase || ad.spend)}`,
        estimatedImpact: `~$${fmt(ad.spend)} at risk with minimal return`,
        recommendation: `Immediately review landing page experience, audience-offer fit, and ad creative for "${ad.name}". Consider pausing and reallocating budget.`,
      });
    }
  }

  return leaks;
}

/**
 * FUNNEL LEAKS
 */
function detectFunnelLeaks(data) {
  const leaks = [];
  const adsets = [...(data.metaAdsets || []), ...(data.metaCampaigns || [])];

  for (const ad of adsets) {
    if (ad.addToCarts === 0 && ad.clicks === 0) continue;

    // High ATC but low purchases = checkout abandonment
    if (ad.addToCarts >= 5 && ad.purchases > 0) {
      const abandonRate = pct(ad.addToCarts - ad.purchases, ad.addToCarts);
      if (abandonRate > 70) {
        leaks.push({
          category: 'Funnel',
          severity: abandonRate > 85 ? 'high' : 'medium',
          title: `High Checkout Abandonment on "${ad.name}"`,
          description: `${fmt(abandonRate, 1)}% of people who added to cart did NOT purchase — a major funnel leak.`,
          dataPoint: `Add to Carts: ${ad.addToCarts} | Purchases: ${ad.purchases} | Abandonment: ${fmt(abandonRate, 1)}%`,
          estimatedImpact: `${Math.round(ad.addToCarts - ad.purchases)} lost conversions from this ${ad.level}`,
          recommendation: `Set up an abandoned cart email/SMS sequence. Review checkout friction: shipping cost surprise, complex checkout, trust signals missing, or payment options limited.`,
        });
      }
    }

    // High clicks but very low ATC = landing page problem
    if (ad.clicks >= 20 && ad.addToCarts === 0) {
      leaks.push({
        category: 'Funnel',
        severity: 'high',
        title: `Zero Add-to-Carts Despite Clicks on "${ad.name}"`,
        description: `${ad.clicks} clicks but 0 add-to-carts. Traffic is landing but not converting — likely a landing page or offer mismatch issue.`,
        dataPoint: `Clicks: ${ad.clicks} | Add to Carts: 0 | Spend: $${fmt(ad.spend)}`,
        estimatedImpact: `$${fmt(ad.spend)} driving zero pipeline`,
        recommendation: `Audit the landing page for "${ad.name}". Check: page speed, above-the-fold messaging, CTA clarity, price-to-value alignment, social proof.`,
      });
    }

    // High ATC but low initiate checkouts
    if (ad.addToCarts >= 10 && ad.initiateCheckouts > 0) {
      const cartToCheckout = pct(ad.initiateCheckouts, ad.addToCarts);
      if (cartToCheckout < 40) {
        leaks.push({
          category: 'Funnel',
          severity: 'medium',
          title: `Cart-to-Checkout Drop on "${ad.name}"`,
          description: `Only ${fmt(cartToCheckout, 1)}% of cart additions proceed to checkout initiation.`,
          dataPoint: `Add to Carts: ${ad.addToCarts} | Initiate Checkouts: ${ad.initiateCheckouts}`,
          estimatedImpact: `${Math.round(ad.addToCarts - ad.initiateCheckouts)} shoppers abandoning at cart stage`,
          recommendation: `Add urgency to the cart page (limited stock, countdown), offer a cart discount popup, or simplify the cart-to-checkout flow.`,
        });
      }
    }
  }

  return leaks;
}

/**
 * PRODUCT LEAKS
 */
function detectProductLeaks(data) {
  const leaks = [];
  const orders = data.orders || [];

  if (orders.length === 0) return leaks;

  // Aggregate by product
  const productMap = {};
  for (const order of orders) {
    const key = order.productTitle || 'Unknown Product';
    if (!productMap[key]) {
      productMap[key] = { revenue: 0, refunds: 0, discounts: 0, count: 0, orders: [] };
    }
    productMap[key].revenue += order.totalPrice;
    productMap[key].refunds += order.refundAmount;
    productMap[key].discounts += order.discountAmount;
    productMap[key].count += order.quantity || 1;
    productMap[key].orders.push(order);
  }

  // Total revenue for context
  const totalRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);

  for (const [product, stats] of Object.entries(productMap)) {
    if (stats.count < 3) continue;

    // High refund rate
    const refundRate = pct(stats.refunds, stats.revenue);
    if (refundRate > 10 && stats.revenue > 200) {
      leaks.push({
        category: 'Product',
        severity: refundRate > 20 ? 'high' : 'medium',
        title: `High Refund Rate: "${product}"`,
        description: `${fmt(refundRate, 1)}% refund rate on this product is eating into gross profit.`,
        dataPoint: `Revenue: $${fmt(stats.revenue)} | Refunds: $${fmt(stats.refunds)} | Orders: ${stats.count}`,
        estimatedImpact: `~$${fmt(stats.refunds)} in returned revenue`,
        recommendation: `Investigate refund reasons for "${product}". Check product quality, description accuracy, sizing/fit issues, and post-purchase communication.`,
      });
    }

    // Heavily discounted
    const discountRate = pct(stats.discounts, stats.revenue + stats.discounts);
    if (discountRate > 20 && stats.revenue > 200) {
      leaks.push({
        category: 'Product',
        severity: 'medium',
        title: `Heavy Discounting: "${product}"`,
        description: `${fmt(discountRate, 1)}% of gross revenue discounted away on this product.`,
        dataPoint: `Discounts: $${fmt(stats.discounts)} | Revenue: $${fmt(stats.revenue)}`,
        estimatedImpact: `~$${fmt(stats.discounts)} in margin erosion`,
        recommendation: `Evaluate discount strategy for "${product}". Consider value-add offers (bundles, upsells) instead of price cuts, or limit discount codes to first-time buyers only.`,
      });
    }
  }

  // Low AOV check
  if (orders.length > 5) {
    const totalRev = orders.reduce((s, o) => s + o.totalPrice, 0);
    const aov = totalRev / orders.length;
    if (aov < 50) {
      leaks.push({
        category: 'Product',
        severity: 'medium',
        title: 'Low Average Order Value (AOV)',
        description: `Average order value is $${fmt(aov, 2)}, which limits gross profit per acquisition and compresses ROAS.`,
        dataPoint: `AOV: $${fmt(aov, 2)} | Total Orders: ${orders.length}`,
        estimatedImpact: `Every $10 AOV increase adds ~$${fmt((orders.length * 10) / 1000, 1)}K in revenue on this volume`,
        recommendation: `Implement post-purchase upsells, product bundles, or a "frequently bought together" section. Set a free shipping threshold above current AOV.`,
      });
    }
  }

  return leaks;
}

/**
 * RETENTION LEAKS
 */
function detectRetentionLeaks(data) {
  const leaks = [];
  const customers = data.customers || [];
  const orders = data.orders || [];

  if (customers.length > 0) {
    const oneTimeBuyers = customers.filter(c => c.ordersCount <= 1).length;
    const repeatRate = 100 - pct(oneTimeBuyers, customers.length);

    if (repeatRate < 20 && customers.length >= 10) {
      leaks.push({
        category: 'Retention',
        severity: 'high',
        title: 'Very Low Customer Repeat Rate',
        description: `Only ${fmt(repeatRate, 1)}% of customers have made more than one purchase — heavy reliance on new customer acquisition.`,
        dataPoint: `Customers: ${customers.length} | One-time buyers: ${oneTimeBuyers} | Repeat rate: ${fmt(repeatRate, 1)}%`,
        estimatedImpact: `Acquiring new customers costs 5-7x more than retaining existing ones. Low LTV inflates effective CAC.`,
        recommendation: `Implement a post-purchase email sequence (days 3, 7, 14, 30). Launch a loyalty/rewards program. Create replenishment reminders for consumable products.`,
      });
    }

    // High LTV variance — some customers spend a lot, most don't
    if (customers.length >= 20) {
      const avgSpend = customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length;
      const highValue = customers.filter(c => c.totalSpent > avgSpend * 3);
      if (highValue.length < customers.length * 0.05) {
        leaks.push({
          category: 'Retention',
          severity: 'medium',
          title: 'No VIP Customer Segment Being Leveraged',
          description: `Less than 5% of customers account for a disproportionate share of revenue with no evident VIP nurture strategy.`,
          dataPoint: `High-value customers (>3x avg): ${highValue.length} of ${customers.length} | Avg LTV: $${fmt(avgSpend, 2)}`,
          estimatedImpact: `Untapped upsell/cross-sell revenue from best customers`,
          recommendation: `Create a VIP segment and offer exclusive early access, higher-margin bundles, or subscription options to top ${fmt(pct(highValue.length, customers.length), 1)}% of buyers.`,
        });
      }
    }
  } else if (orders.length > 0) {
    // Infer from orders if customer file not uploaded
    const emailCounts = {};
    for (const o of orders) {
      if (o.email) emailCounts[o.email] = (emailCounts[o.email] || 0) + 1;
    }
    const emails = Object.values(emailCounts);
    if (emails.length > 5) {
      const newOnly = emails.filter(c => c === 1).length;
      const repeatRate = 100 - pct(newOnly, emails.length);
      if (repeatRate < 20) {
        leaks.push({
          category: 'Retention',
          severity: 'medium',
          title: 'Low Repeat Purchase Rate (inferred from orders)',
          description: `~${fmt(repeatRate, 1)}% of email addresses have placed more than 1 order in this period.`,
          dataPoint: `Unique customers: ${emails.length} | One-time buyers: ${newOnly}`,
          estimatedImpact: `High dependency on paid acquisition to maintain revenue`,
          recommendation: `Build a post-purchase flow and retention email campaigns to increase LTV. Upload customer export for deeper analysis.`,
        });
      }
    }
  }

  return leaks;
}

/**
 * CREATIVE / AUDIENCE LEAKS
 */
function detectCreativeAudienceLeaks(data) {
  const leaks = [];
  const adsets = [...(data.metaAdsets || []), ...(data.metaCampaigns || [])];

  for (const ad of adsets) {
    // High frequency = ad fatigue
    if (ad.frequency >= 4 && ad.ctr < 1.0 && ad.spend > 50) {
      leaks.push({
        category: 'Creative/Audience',
        severity: 'medium',
        title: `Ad Fatigue on "${ad.name}"`,
        description: `Frequency of ${fmt(ad.frequency, 1)}x with ${fmt(ad.ctr, 2)}% CTR indicates the audience has seen this ad too many times.`,
        dataPoint: `Frequency: ${fmt(ad.frequency, 1)} | CTR: ${fmt(ad.ctr, 2)}% | Reach: ${ad.reach?.toLocaleString() || 'N/A'}`,
        estimatedImpact: `Declining CTR means rising effective CPC and CPP`,
        recommendation: `Refresh creative for "${ad.name}" immediately. Rotate in new angles, UGC, or testimonial-based ads. Consider expanding audience or excluding recent converters.`,
      });
    }

    // Very high CPC suggesting poor audience-creative match
    if (ad.cpc > 5 && ad.spend > 100) {
      leaks.push({
        category: 'Creative/Audience',
        severity: 'medium',
        title: `High CPC on "${ad.name}"`,
        description: `CPC of $${fmt(ad.cpc, 2)} is elevated, suggesting audience-creative mismatch or competitive pressure.`,
        dataPoint: `CPC: $${fmt(ad.cpc, 2)} | CTR: ${fmt(ad.ctr, 2)}% | Spend: $${fmt(ad.spend)}`,
        estimatedImpact: `Lower CPC by 30% = ~${fmt(ad.clicks * 0.3)} more clicks on same budget`,
        recommendation: `Test broader audiences or Advantage+ audience for "${ad.name}". A/B test different creative formats. Review bid strategy.`,
      });
    }
  }

  // Compare broad vs interest performance if multiple adsets
  if (adsets.length >= 2) {
    const sorted = [...adsets].filter(a => a.roas > 0).sort((a, b) => b.roas - a.roas);
    if (sorted.length >= 2) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      if (best.roas > 0 && worst.spend > 50 && best.roas / worst.roas > 3) {
        leaks.push({
          category: 'Creative/Audience',
          severity: 'medium',
          title: 'Large Performance Gap Between Ad Sets',
          description: `Best performing ad set has ${fmt(best.roas, 2)}x ROAS vs worst at ${fmt(worst.roas, 2)}x — significant budget efficiency gap.`,
          dataPoint: `Best: "${best.name}" ROAS ${fmt(best.roas, 2)} | Worst: "${worst.name}" ROAS ${fmt(worst.roas, 2)}`,
          estimatedImpact: `Shifting budget from worst to best could multiply returns`,
          recommendation: `Shift 30-50% of "${worst.name}" budget to "${best.name}". Analyze what's different (audience, creative, offer) and replicate winners.`,
        });
      }
    }
  }

  return leaks;
}

// ─── Leak Detector Registry (add new detectors here) ────────────────────────
const LEAK_DETECTORS = [
  detectAdSpendLeaks,
  detectFunnelLeaks,
  detectProductLeaks,
  detectRetentionLeaks,
  detectCreativeAudienceLeaks,
];

/**
 * Run all leak detectors and return sorted results.
 */
function runLeakDetection(data) {
  const allLeaks = [];
  for (const detector of LEAK_DETECTORS) {
    try {
      const leaks = detector(data);
      allLeaks.push(...leaks);
    } catch (err) {
      console.error(`Leak detector error: ${err.message}`);
    }
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return allLeaks.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
}

module.exports = { runLeakDetection };
