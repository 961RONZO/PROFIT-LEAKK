/**
 * Auto-detect the type of uploaded file based on column headers.
 * Returns one of: 'shopify_orders' | 'shopify_products' | 'shopify_customers' |
 *                 'meta_campaigns' | 'meta_adsets' | 'meta_ads' | 'unknown'
 */
function detectFileType(columns) {
  const cols = columns.map(c => c.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  const has = (...keys) => keys.every(k => cols.some(c => c.includes(k)));
  const hasAny = (...keys) => keys.some(k => cols.some(c => c.includes(k)));

  // Shopify Orders
  if (hasAny('financial_status', 'fulfillment_status') && hasAny('total_price', 'subtotal')) {
    return 'shopify_orders';
  }

  // Shopify Products
  if (hasAny('variant_price', 'product_price') || (hasAny('variant') && hasAny('price') && hasAny('inventory'))) {
    return 'shopify_products';
  }
  if (has('title') && hasAny('price') && hasAny('inventory_quantity', 'stock')) {
    return 'shopify_products';
  }

  // Shopify Customers
  if (hasAny('total_spent', 'orders_count') && hasAny('email')) {
    return 'shopify_customers';
  }

  // Meta Ads — Ad level
  if (hasAny('ad_name', 'ad_id') && hasAny('spend', 'amount_spent') && hasAny('impressions')) {
    return 'meta_ads';
  }

  // Meta Ads — Ad Set level
  if (hasAny('adset_name', 'ad_set_name') && hasAny('spend', 'amount_spent')) {
    return 'meta_adsets';
  }

  // Meta Ads — Campaign level
  if (hasAny('campaign_name') && hasAny('spend', 'amount_spent') && !hasAny('adset_name', 'ad_set_name')) {
    return 'meta_campaigns';
  }

  // Fallback: any Meta-like data
  if (hasAny('spend', 'amount_spent') && hasAny('impressions', 'clicks', 'ctr')) {
    return 'meta_campaigns';
  }

  return 'unknown';
}

module.exports = { detectFileType };
