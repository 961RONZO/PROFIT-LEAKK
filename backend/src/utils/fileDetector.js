/**
 * Auto-detect the type of uploaded file based on column headers.
 * Returns one of: 'shopify_orders' | 'shopify_products' | 'shopify_customers' |
 *                 'meta_campaigns' | 'meta_adsets' | 'meta_ads' | 'unknown'
 */
function detectFileType(columns) {
  const cols = columns.map(c => c.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  const has = (...keys) => keys.every(k => cols.some(c => c.includes(k)));
  const hasAny = (...keys) => keys.some(k => cols.some(c => c.includes(k)));

  // Shopify Orders — standard transactional export
  if (hasAny('financial_status', 'fulfillment_status') && hasAny('total_price', 'subtotal', 'total')) {
    return 'shopify_orders';
  }
  // Shopify Orders — Analytics report (order_ prefixed columns)
  if (hasAny('order_fulfillment_status', 'order_financial_status') && hasAny('order_id', 'order_name')) {
    return 'shopify_orders';
  }
  // Shopify Orders — alternative column names
  if (hasAny('lineitem_name', 'lineitem_price', 'lineitem_quantity') && hasAny('email', 'name')) {
    return 'shopify_orders';
  }

  // Shopify Products — standard export (has variant/price columns)
  if (hasAny('variant_price', 'product_price') || (hasAny('variant') && hasAny('price') && hasAny('inventory'))) {
    return 'shopify_products';
  }
  if (has('title') && hasAny('price') && hasAny('inventory_quantity', 'stock')) {
    return 'shopify_products';
  }
  // Shopify Products — Analytics report (gross_sales / net_sales per product)
  if (hasAny('gross_sales', 'net_sales') && hasAny('product', 'product_title')) {
    return 'shopify_products';
  }
  if (hasAny('net_quantity') && hasAny('product', 'product_title', 'title')) {
    return 'shopify_products';
  }

  // Shopify Customers — standard export
  if (hasAny('total_spent', 'amount_spent') && hasAny('email', 'customer_email')) {
    return 'shopify_customers';
  }
  if (hasAny('orders_count', 'total_orders', 'order_count', 'customer_number_of_orders', 'total_number_of_orders') && hasAny('email', 'customer_email')) {
    return 'shopify_customers';
  }
  // Shopify Customers — Analytics report (customer_ prefixed columns)
  if (hasAny('customer_email', 'customer_name') && hasAny('customer_first_order_date', 'customer_last_order_date', 'customer_city', 'customer_country')) {
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
