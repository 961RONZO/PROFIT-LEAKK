const express = require('express');
const multer = require('multer');
const router = express.Router();
const { parseFile, normalizeColumns } = require('../utils/fileParser');
const { detectFileType } = require('../utils/fileDetector');
const {
  normalizeOrders,
  normalizeProducts,
  normalizeCustomers,
  normalizeMetaCampaigns,
  normalizeMetaAdsets,
  normalizeMetaAds,
} = require('../utils/dataNormalizer');
const { calculateMetrics } = require('../services/metricsCalculator');
const { runLeakDetection } = require('../services/leakDetector');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/octet-stream'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) return cb(null, true);
    cb(new Error('Only CSV and Excel files are supported'));
  },
});

router.post('/', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const parsedData = {
      orders: [],
      products: [],
      customers: [],
      metaCampaigns: [],
      metaAdsets: [],
      metaAds: [],
    };

    const fileResults = [];

    for (const file of req.files) {
      try {
        const rawRows = parseFile(file.buffer, file.mimetype, file.originalname);
        if (!rawRows || rawRows.length === 0) {
          fileResults.push({ filename: file.originalname, type: 'empty', rowCount: 0, error: 'No data found in file' });
          continue;
        }

        const rows = normalizeColumns(rawRows);
        const columns = Object.keys(rows[0] || {});
        const fileType = detectFileType(columns);

        let normalized = [];
        switch (fileType) {
          case 'shopify_orders':
            normalized = normalizeOrders(rows);
            parsedData.orders.push(...normalized);
            break;
          case 'shopify_products':
            normalized = normalizeProducts(rows);
            parsedData.products.push(...normalized);
            break;
          case 'shopify_customers':
            normalized = normalizeCustomers(rows);
            parsedData.customers.push(...normalized);
            break;
          case 'meta_campaigns':
            normalized = normalizeMetaCampaigns(rows);
            parsedData.metaCampaigns.push(...normalized);
            break;
          case 'meta_adsets':
            normalized = normalizeMetaAdsets(rows);
            parsedData.metaAdsets.push(...normalized);
            break;
          case 'meta_ads':
            normalized = normalizeMetaAds(rows);
            parsedData.metaAds.push(...normalized);
            break;
          default:
            fileResults.push({
              filename: file.originalname,
              type: 'unknown',
              rowCount: rows.length,
              error: 'Could not detect file type. Please check column headers match Shopify or Meta exports.',
              columns: columns.slice(0, 10),
            });
            continue;
        }

        fileResults.push({
          filename: file.originalname,
          type: fileType,
          rowCount: normalized.length,
          error: null,
        });
      } catch (err) {
        fileResults.push({ filename: file.originalname, type: 'error', rowCount: 0, error: err.message });
      }
    }

    // Calculate metrics and run leak detection
    const metrics = calculateMetrics(parsedData);
    const leaks = runLeakDetection(parsedData);

    // Build a data summary for AI audit (non-sensitive aggregated data only)
    const dataSummary = buildDataSummary(parsedData, metrics, leaks);

    return res.json({
      success: true,
      files: fileResults,
      metrics,
      leaks,
      dataSummary,
      recordCounts: {
        orders: parsedData.orders.length,
        products: parsedData.products.length,
        customers: parsedData.customers.length,
        metaCampaigns: parsedData.metaCampaigns.length,
        metaAdsets: parsedData.metaAdsets.length,
        metaAds: parsedData.metaAds.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

function buildDataSummary(data, metrics, leaks) {
  const s = metrics.shopify;
  const m = metrics.meta;
  const lines = [];

  if (metrics.combined.hasShopifyData) {
    lines.push('## Shopify Data Summary');
    lines.push(`- Total Revenue: $${s.totalRevenue.toFixed(2)}`);
    lines.push(`- Net Revenue (after refunds): $${s.netRevenue.toFixed(2)}`);
    lines.push(`- Total Orders: ${s.orderCount}`);
    lines.push(`- Average Order Value: $${s.aov.toFixed(2)}`);
    lines.push(`- Refund Rate: ${s.refundRate.toFixed(1)}%`);
    lines.push(`- Discount Rate: ${s.discountRate.toFixed(1)}%`);
    lines.push(`- Customer Repeat Rate: ${s.repeatRate.toFixed(1)}%`);
    if (s.estGrossProfit !== null) {
      lines.push(`- Estimated Gross Profit: $${s.estGrossProfit.toFixed(2)}`);
      lines.push(`- Gross Margin: ${s.grossMargin.toFixed(1)}%`);
    } else {
      lines.push('- Gross Profit: Not calculable (no COGS data available)');
    }
    if (s.topProducts.length > 0) {
      lines.push('\nTop Products by Revenue:');
      s.topProducts.slice(0, 5).forEach(p => lines.push(`  - ${p.name}: $${p.revenue.toFixed(2)}`));
    }
  }

  if (metrics.combined.hasMetaData) {
    lines.push('\n## Meta Ads Data Summary');
    lines.push(`- Total Ad Spend: $${m.totalAdSpend.toFixed(2)}`);
    lines.push(`- Blended ROAS: ${m.blendedROAS.toFixed(2)}x`);
    lines.push(`- Total Purchases: ${m.totalPurchases}`);
    lines.push(`- Cost Per Purchase: $${m.cpp.toFixed(2)}`);
    lines.push(`- Avg CTR: ${m.avgCTR.toFixed(2)}%`);
    lines.push(`- Avg CPM: $${m.avgCPM.toFixed(2)}`);
    lines.push(`- Add-to-Cart Rate: ${m.addToCartRate.toFixed(1)}%`);
    lines.push(`- Checkout Abandonment Rate: ${m.checkoutAbandonRate.toFixed(1)}%`);
  }

  if (leaks.length > 0) {
    lines.push('\n## Detected Profit Leaks');
    leaks.forEach((l, i) => {
      lines.push(`\n${i + 1}. [${l.severity.toUpperCase()}] ${l.category}: ${l.title}`);
      lines.push(`   ${l.description}`);
      lines.push(`   Data: ${l.dataPoint}`);
    });
  }

  return lines.join('\n');
}

module.exports = router;
