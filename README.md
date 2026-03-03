# Profit Leak Auditor

An internal agency tool that analyzes ecommerce brand data from **Shopify** and **Meta Ads** to identify where profit is leaking and what to fix.

---

## Features

- **Drag-and-drop file upload** — CSV or Excel exports from Shopify and Meta Ads
- **Auto file detection** — Automatically identifies file type from column headers
- **Dashboard** — Revenue, ROAS, AOV, Refund Rate, CTR, CPP, and more
- **Charts** — Top products, Ad set ROAS comparison, Purchase funnel, Spend vs Revenue
- **Profit Leak Engine** — Automatically flags 5 categories of leaks with severity ratings
- **AI Deep Audit** — Claude-powered chat that asks smart follow-up questions and generates a full written report
- **Export** — Download the AI audit report as a Markdown file

### Leak Categories Detected

| Category | Examples |
|----------|---------|
| Ad Spend | Low ROAS ad sets, high CPM + low CTR, zero-purchase campaigns |
| Funnel | Checkout abandonment, clicks with no ATCs, cart-to-checkout drop |
| Product | High refund rate products, heavy discounting, low AOV |
| Retention | Low repeat rate, no VIP segment, high new-customer dependency |
| Creative/Audience | Ad fatigue (high frequency + low CTR), high CPC, performance gaps |

---

## Tech Stack

- **Frontend**: React 18 + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + Multer
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Parsing**: PapaParse (CSV) + SheetJS/xlsx (Excel)

---

## Setup

### Prerequisites

- Node.js 18+ and npm
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd profit-leak-auditor

# Install all dependencies (root + backend + frontend)
npm install
npm run install:all
```

### 2. Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Start the app

```bash
# Run both backend and frontend together
npm run dev
```

This starts:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:3000`

Open `http://localhost:3000` in your browser.

---

## How to Use

### Step 1: Export your data

**Shopify:**
- Orders: `Admin → Orders → Export (all orders, CSV)`
- Products: `Admin → Products → Export (CSV)` *(for margin analysis)*
- Customers: `Admin → Customers → Export (CSV)` *(for retention analysis)*

**Meta Ads Manager:**
- Go to the `Campaigns`, `Ad Sets`, or `Ads` tab
- Click `Export → Export Table Data (CSV)`
- Make sure to include columns like: Spend, Impressions, Clicks, CTR, CPM, Purchases, ROAS, Add to Cart, Initiate Checkout

### Step 2: Upload files

Drag and drop all your files at once (mix of Shopify + Meta is fine). The app auto-detects each file type.

### Step 3: Review the dashboard

- Check key metrics at the top
- Review the charts
- Scroll down to see detected profit leaks, sorted by severity

### Step 4: Run the AI Deep Audit (optional, requires API key)

Click `🤖 AI Deep Audit` in the top right. Claude will:
1. Ask 3–5 smart follow-up questions about your margins, goals, and context
2. After you answer, generate a full written audit report
3. Export the report as a `.md` file

---

## Project Structure

```
profit-leak-auditor/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app entry point
│   │   ├── routes/
│   │   │   ├── upload.js          # File upload + parsing endpoint
│   │   │   └── audit.js           # Claude AI audit endpoint
│   │   ├── services/
│   │   │   ├── leakDetector.js    # Modular profit leak engine
│   │   │   └── metricsCalculator.js # Dashboard metrics calculation
│   │   └── utils/
│   │       ├── fileParser.js      # CSV/Excel parsing
│   │       ├── fileDetector.js    # Auto file type detection
│   │       └── dataNormalizer.js  # Normalize to standard schema
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── UploadScreen.js    # Landing + file drop zone
│   │   │   ├── ProcessingScreen.js # Loading state
│   │   │   └── Dashboard.js       # Main dashboard
│   │   └── components/
│   │       ├── MetricCard.js      # Individual metric display
│   │       ├── LeakCard.js        # Profit leak display card
│   │       ├── ChartsPanel.js     # All charts (Recharts)
│   │       ├── AuditPanel.js      # AI chat + report panel
│   │       └── FilesSummary.js    # Uploaded files status
│   ├── tailwind.config.js
│   └── package.json
├── package.json                   # Root scripts (concurrently)
└── README.md
```

---

## Adding New Leak Detectors

The leak engine is modular. To add a new detector:

1. Open `backend/src/services/leakDetector.js`
2. Write a function that receives `data` and returns an array of leak objects:

```js
function detectMyNewLeaks(data) {
  const leaks = [];
  // Your detection logic here
  leaks.push({
    category: 'My Category',       // Display category
    severity: 'high',              // 'high' | 'medium' | 'low'
    title: 'Short title',
    description: 'What the leak is in plain English.',
    dataPoint: 'The specific number that triggered this.',
    estimatedImpact: 'Dollar or % impact estimate.',
    recommendation: 'What to do about it.',
  });
  return leaks;
}
```

3. Add it to the `LEAK_DETECTORS` array at the bottom of the file:

```js
const LEAK_DETECTORS = [
  detectAdSpendLeaks,
  detectFunnelLeaks,
  // ...
  detectMyNewLeaks,  // ← Add here
];
```

---

## Notes

- All data is processed in memory and never stored to disk
- No authentication — internal use only
- The AI audit feature requires a valid `ANTHROPIC_API_KEY`
- If COGS data isn't in your product export, gross profit calculations are skipped and noted
