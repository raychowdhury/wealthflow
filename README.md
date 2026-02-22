# WealthFlow Forecast

AI-powered personal finance forecasting app. Enter your income, expenses, debts, and investments — get a month-by-month projection of your net worth, cash flow, and financial health, plus AI-driven advice on how to improve it.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Recharts · NextAuth · Prisma · OpenAI / Anthropic

---

## Features

| | |
|---|---|
| 📈 Net Worth Forecasting | Month-by-month projection up to 360 months |
| 💸 Cash Flow Analysis | Income vs expenses vs debt vs investments |
| 💳 Debt Paydown Tracker | Min / Aggressive / Instant payoff strategies |
| 📊 Investment Growth | Compound return modeling across all accounts |
| 🎯 Goal Tracking | Set savings, net worth, or investment targets |
| ✨ AI Advisor | Personalized insights via OpenAI, Anthropic, or heuristic fallback |
| 🔀 What-if Sliders | Instantly simulate income / expense / investment changes |
| 🌙 Dark Mode | System preference + manual toggle |
| 📤 Export | Download forecast as CSV or JSON |
| 🔐 Auth | Demo credentials + Google OAuth (NextAuth) |

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing / marketing page |
| `/login` | Sign in (demo or Google) |
| `/dashboard` | Full forecast app |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/raychowdhury/wealthflow.git
cd wealthflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Optional — leave as-is to run without a database
DATABASE_URL="postgresql://user:password@localhost:5432/wealthflow"

# AI Provider — leave blank to use built-in heuristic advisor
AI_PROVIDER="openai"          # openai | anthropic | mock
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
AI_MODEL="gpt-4o-mini"

# NextAuth — required for Google OAuth only
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

> **No database or API key required.** The app works fully with the built-in heuristic advisor and localStorage persistence.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** `demo@wealthflow.app` / `demo`

---

## Project Structure

```
app/
  page.tsx              # Landing page
  login/page.tsx        # Login
  dashboard/page.tsx    # Forecast app
  api/
    advisor/            # AI advisor endpoint
    auth/               # NextAuth
    scenarios/          # DB scenario CRUD
    preferences/        # User preferences

components/
  ScenarioForm.tsx      # 6-tab input form with auto-save
  ForecastChart.tsx     # Net worth chart
  CashFlowChart.tsx
  DebtPaydownChart.tsx
  SavingsRateChart.tsx
  ExpenseBreakdown.tsx
  KeyRatiosPanel.tsx
  GoalsPanel.tsx
  AdvisorPanel.tsx
  InsightsBanner.tsx
  QuickAdjustBar.tsx    # What-if sliders

lib/
  forecast.ts           # Core forecast engine
  advisor.ts            # AI / heuristic advisor runner
  heuristic-advisor.ts  # Rule-based fallback (no API key needed)
  types.ts
  db.ts                 # Prisma client (optional)
  auth.ts               # NextAuth config
  demo-data.ts          # Quick-start templates
```

---

## AI Advisor

Set `AI_PROVIDER` in `.env.local`:

| Value | Requires |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `mock` | Nothing — uses heuristic rules |

If no key is set, the app automatically falls back to the built-in heuristic advisor.

---

## Database (Optional)

The app runs fully without a database — scenarios auto-save to `localStorage`.

To enable DB persistence:

```bash
# Set a real DATABASE_URL in .env.local, then:
npx prisma db push
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Auth:** NextAuth v4
- **ORM:** Prisma (PostgreSQL)
- **AI:** OpenAI SDK · Anthropic SDK
- **Validation:** Zod
- **Tests:** Vitest

---

## License

MIT
