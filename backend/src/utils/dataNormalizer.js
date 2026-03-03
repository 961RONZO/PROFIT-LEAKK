/**
 * Normalize parsed rows into standardized data structures
 * based on detected file type.
 */

function safeNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[$,%]/g, ''));
  return isNaN(n) ? 0 : n;
}

function safeStr(val) {
  return val === null || val === undefined ? '' : String(val).trim();
}

function normalizeOrders(rows) {
  return rows.map(r => ({
    orderId: safeStr(r.name || r.order_id || r.id),
    date: safeStr(r.created_at || r.date || r.processed_at),
    email: safeStr(r.email),
    totalPrice: safeNum(r.total_price || r.subtotal_price || r.total),
    subtotal: safeNum(r.subtotal_price || r.subtotal || r.total_price),
    refundAmount: safeNum(r.refunded_amount || r.total_refunded || r.refund_amount),
    discountAmount: safeNum(r.total_discounts || r.discount_amount),
    productTitle: safeStr(r.lineitem_name || r.product_title || r.lineitem_sku || ''),
    quantity: safeNum(r.lineitem_quantity || r.quantity || 1),
    fulfillmentStatus: safeStr(r.fulfillment_status || r.status || ''),
    financialStatus: safeStr(r.financial_status || r.payment_status || ''),
    isNewCustomer: null,
  }));
}

function normalizeProducts(rows) {
  return rows.map(r => ({
    id: safeStr(r.id || r.product_id || r.variant_id),
    title: safeStr(r.title || r.product_title || r.name),
    sku: safeStr(r.sku || r.variant_sku || r.variant_barcode),
    price: safeNum(r.variant_price || r.price),
    cogs: safeNum(r.cost || r.cost_per_item || r.cogs || r.variant_cost),
    inventory: safeNum(r.inventory_quantity || r.stock || r.on_hand),
    vendor: safeStr(r.vendor || r.brand),
  }));
}

function normalizeCustomers(rows) {
  return rows.map(r => ({
    email: safeStr(r.email),
    totalSpent: safeNum(r.total_spent || r.lifetime_value || r.ltv),
    ordersCount: safeNum(r.orders_count || r.order_count || r.total_orders),
    firstOrderDate: safeStr(r.first_order_date || r.created_at),
    lastOrderDate: safeStr(r.last_order_date || r.last_purchase),
  }));
}

function normalizeMetaCampaigns(rows) {
  return rows.map(r => ({
    id: safeStr(r.campaign_id || r.id),
    name: safeStr(r.campaign_name || r.name),
    spend: safeNum(r.amount_spent || r.spend || r.cost),
    impressions: safeNum(r.impressions),
    clicks: safeNum(r.link_clicks || r.clicks),
    ctr: safeNum(r.ctr || r.link_click_through_rate),
    cpm: safeNum(r.cpm),
    cpc: safeNum(r.cpc || r.cost_per_link_click),
    purchases: safeNum(r.purchases || r.results || r.conversions),
    roas: safeNum(r.purchase_roas || r.roas || r.website_purchase_roas),
    purchaseValue: safeNum(r.purchase_conversion_value || r.conversion_value || r.revenue),
    addToCarts: safeNum(r.add_to_cart || r.adds_to_cart),
    initiateCheckouts: safeNum(r.initiate_checkout || r.checkouts_initiated),
    costPerPurchase: safeNum(r.cost_per_result || r.cost_per_purchase || r.cpp),
    frequency: safeNum(r.frequency),
    reach: safeNum(r.reach),
    level: 'campaign',
  }));
}

function normalizeMetaAdsets(rows) {
  return rows.map(r => ({
    id: safeStr(r.adset_id || r.ad_set_id || r.id),
    name: safeStr(r.adset_name || r.ad_set_name || r.name),
    campaignName: safeStr(r.campaign_name || ''),
    spend: safeNum(r.amount_spent || r.spend || r.cost),
    impressions: safeNum(r.impressions),
    clicks: safeNum(r.link_clicks || r.clicks),
    ctr: safeNum(r.ctr || r.link_click_through_rate),
    cpm: safeNum(r.cpm),
    cpc: safeNum(r.cpc || r.cost_per_link_click),
    purchases: safeNum(r.purchases || r.results || r.conversions),
    roas: safeNum(r.purchase_roas || r.roas || r.website_purchase_roas),
    purchaseValue: safeNum(r.purchase_conversion_value || r.conversion_value || r.revenue),
    addToCarts: safeNum(r.add_to_cart || r.adds_to_cart),
    initiateCheckouts: safeNum(r.initiate_checkout || r.checkouts_initiated),
    costPerPurchase: safeNum(r.cost_per_result || r.cost_per_purchase || r.cpp),
    frequency: safeNum(r.frequency),
    reach: safeNum(r.reach),
    targeting: safeStr(r.targeting || r.audience || ''),
    level: 'adset',
  }));
}

function normalizeMetaAds(rows) {
  return normalizeMetaAdsets(rows).map(r => ({
    ...r,
    adName: r.name,
    adsetName: safeStr(rows[0]?.adset_name || ''),
    level: 'ad',
  }));
}

module.exports = {
  normalizeOrders,
  normalizeProducts,
  normalizeCustomers,
  normalizeMetaCampaigns,
  normalizeMetaAdsets,
  normalizeMetaAds,
  safeNum,
};
