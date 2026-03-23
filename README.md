# AI Accounting Analytics Platform

AI Accounting Analytics Platform is a full-stack analytics workspace for tabular business and accounting data. It lets you upload a dataset, run guided analysis, review KPI cards and dynamic charts, apply dashboard controls, compare uploads, generate forecasting insights, and download consulting-style PDF reports.

## What this project does

- Upload CSV, TSV, TXT, Excel, and XML/Tally-style files.
- Detect schema automatically for numeric, date, categorical, and text columns.
- Run a staged analysis pipeline with live progress updates.
- Build KPI cards, charts, anomaly highlights, and narrative insights.
- Support interactive filtering, cleaning, drilldowns, chart building, and column renaming.
- Support compare, append, join, and benchmark-style multi-upload workflows.
- Generate prediction summaries and PDF consulting reports.
- Store processed analysis snapshots on disk for fast reloads.
- Persist dashboard workspace state in SQLite so saved views, scenarios, chart templates, notes, workflow items, alerts, and recent commands survive browser refreshes.
- Generate durable share links for dashboard views through backend share tokens.

## Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Zustand
- Framer Motion

### Backend

- FastAPI
- SQLite
- Pandas and NumPy
- scikit-learn
- ReportLab

## Repository layout

```text
ai-accounting-analytics-platform/
|-- backend/
|   |-- api/                FastAPI route modules
|   |-- agents/             Upload, forecasting, report, and workflow agents
|   |-- core/               Agent orchestration
|   |-- database/           SQLite models and DB manager
|   |-- services/           Realtime analysis and advanced dashboard logic
|   |-- utils/              File readers, helpers, logging, cleaning helpers
|   |-- visualization/      Chart and dashboard builder helpers
|   `-- main.py             FastAPI application entrypoint
|-- frontend/
|   |-- src/
|   |   |-- components/     Dashboard panels and reusable UI
|   |   |-- charts/         Legacy chart components and shared chart types
|   |   |-- hooks/          Frontend data hooks
|   |   |-- pages/          Upload, processing, dashboard, report, prediction pages
|   |   |-- services/       API client and analysis helpers
|   |   |-- store/          Zustand state
|   |   `-- styles/         Global styles
|   `-- package.json
|-- data/
|   |-- uploads/            Uploaded source files
|   `-- processed/          Saved analysis JSON payloads
|-- reports/
|   `-- pdf_reports/        Generated PDF reports
|-- models/                 Serialized ML artifacts used by the project
|-- tests/
|-- requirements.txt
|-- start.bat
|-- start.sh
`-- README.md
```

## Prerequisites

- Python 3.11 or compatible
- Node.js 18+ and npm

Optional but recommended:

- A virtual environment for Python dependencies

## Local setup

### 1. Install backend dependencies

Windows:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS or Linux:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Start the app

Run frontend and backend together:

```bash
cd frontend
npm run dev-full
```

This starts:

- Frontend at `http://localhost:3000`
- Backend API at `http://localhost:8000`

### 4. Or run services separately

Backend:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

## Start scripts

- `start.bat`: Starts the frontend workspace script on Windows.
- `start.sh`: Starts the frontend workspace script on macOS/Linux.

Note: these scripts do not install Python packages. Run `pip install -r requirements.txt` first.

## Frontend scripts

Run from `frontend/`:

```bash
npm run dev
npm run dev-full
npm run build
npm run lint
npm run preview
```

## Render deployment

This repository is now set up for Render with a root-level [render.yaml](/C:/Users/dp686/Desktop/ai-accounting-analytics-platform/render.yaml) blueprint and a pinned Python version in [.python-version](/C:/Users/dp686/Desktop/ai-accounting-analytics-platform/.python-version).

### Recommended Render setup

- Deploy the backend as a Render Web Service
- Deploy the frontend as a Render Static Site

The included `render.yaml` defines both services:

- `ai-accounting-analytics-platform-api`
- `ai-accounting-analytics-platform-ui`

If you use the Render dashboard manually instead of the blueprint:

### Backend web service

- Root Directory: leave blank
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`

Environment variables:

- `PYTHON_VERSION=3.11.11`
- `APP_ENV=production`
- `ALLOWED_ORIGINS=https://<your-frontend-service>.onrender.com`

### Frontend static site

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

Redirect / rewrite rules:

- `/api/*` -> `https://<your-backend-service>.onrender.com/api/*` as a rewrite
- `/*` -> `/index.html` as a rewrite

### Important Render note about Python

If Render defaults to Python `3.14.x`, the build can fail while compiling `pandas==2.1.4`.

This repository pins Python `3.11.11` to avoid that problem. If you deploy manually in the dashboard, make sure Render uses Python `3.11.x`.

### Persistent storage note

This app stores uploads, processed analysis files, reports, and SQLite data on disk. On Render, persistent disks are available on paid web services. On the free plan, these files can be lost after redeploys or restarts.

If you attach a persistent disk, set environment variables like:

```env
DATABASE_URL=sqlite:////opt/render/project/src/render-data/analytics.db
UPLOAD_DIR=/opt/render/project/src/render-data/uploads
PROCESSED_DIR=/opt/render/project/src/render-data/processed
REPORTS_DIR=/opt/render/project/src/render-data/reports
PDF_REPORTS_DIR=/opt/render/project/src/render-data/reports/pdf_reports
PPT_REPORTS_DIR=/opt/render/project/src/render-data/reports/ppt_reports
```

## Backend behavior

The backend:

- stores upload metadata in `backend/database/analytics.db`
- saves raw uploads in `data/uploads`
- saves processed analysis snapshots in `data/processed`
- generates PDF reports in `reports/pdf_reports`
- auto-creates required directories from `backend/config.py`

## Main product flow

1. Upload a supported tabular file from the landing page.
2. The processing page runs a staged analysis pipeline:
   - reading dataset
   - detecting columns
   - cleaning values
   - building KPIs
   - building charts
   - finalizing dashboard
3. The dashboard opens with:
   - KPI cards
   - schema-aware charts
   - insight cards and executive narrative
   - anomaly and quality alerts
   - drilldowns and data previews
4. Users can then:
   - change metrics, aggregation, date ranges, and categories
   - compare against another uploaded file
   - append or join another upload
   - benchmark against another upload
   - build custom charts
   - run scenario and target-tracking views
   - rename columns inside the workspace
   - save views, chart templates, scenarios, notes, alert rules, workflow items, and recent command history to backend-backed workspace state
   - share dashboard views through durable backend share links
5. Users can open prediction insights or download a consulting PDF report.

## Supported input formats

### Analysis pipeline

- `.csv`
- `.tsv`
- `.txt`
- `.xlsx`
- `.xls`
- `.xml`

### Notes

- XML uploads are treated as Tally-style inputs through `pandas.read_xml`.
- Forecasting endpoints currently load CSV and Excel files directly. If prediction routes are important for your workflow, prefer CSV or Excel uploads.

## What kind of data this project can analyze

This project works best with structured, tabular business datasets where each row represents a transaction, event, record, or periodic summary and each column has a clear header.

### Business data categories it can handle well

- Sales and revenue data
  Examples: `Sales`, `Revenue`, `Orders`, `Invoices`, `Transactions`, `Amount`
- Accounting and finance data
  Examples: `Cash`, `Balance`, `Credit`, `Debit`, `Income`, `Payment`, `Ledger`
- Expense and budget data
  Examples: `Expense`, `Cost`, `Spend`, `Budget`, `Bills`
- Operations data
  Examples: `Region`, `Branch`, `Location`, `Department`, `Team`
- Inventory and product data
  Examples: `Inventory`, `Stock`, `SKU`, `Product`, `Quantity`
- Customer and account data
  Examples: `Customer`, `Client`, `Segment`, `Subscription`, `Account`

### Column types it can detect automatically

- Date columns
  Examples: `Date`, `Month`, `Year`, `Invoice Date`
- Numeric columns
  Examples: `Sales`, `Expense`, `Profit`, `Cash`, `Balance`, `Amount`
- Categorical columns
  Examples: `Category`, `Region`, `Department`, `Customer Type`
- Text columns
  Examples: descriptions, labels, and comments inside a tabular dataset

### Data shapes that work best

- Transaction-level accounting exports
- Monthly or weekly summary reports
- Profit and loss style datasets
- Sales by category, region, product, or customer
- Expense tracking sheets
- Budget versus actual reports
- Inventory movement sheets
- Customer segment performance reports

### Best results when your data includes

- a header row with clear column names
- at least one numeric metric column
- optional date columns for trends and forecasting
- optional category columns for comparisons, rankings, pie charts, and drilldowns

### Large file support

- Large CSV files are read in chunked mode.
- Large uploads trigger large-file messaging in the frontend workspace.
- The system is designed for tabular uploads up to the configured backend upload limit.

### Data this project does not handle well

- PDF files
- scanned invoices or image-based files
- unstructured plain-text documents
- nested JSON payloads or API response dumps
- non-tabular documents without consistent columns

### Prediction-specific note

The prediction routes work best when the dataset includes:

- a usable date column such as `Date`
- historical numeric metrics such as `Sales`, `Revenue`, or `Expense`
- enough past rows to detect a trend

## API overview

All application routes are mounted under `/api` except the root welcome route.

### Health

- `GET /`
- `GET /api/health`

### Uploads

- `POST /api/upload-file`
- `GET /api/uploads`
- `POST /api/analyze-dataset/{upload_id}`

### Analysis lifecycle

- `GET /api/run-analysis/{upload_id}`
- `GET /api/analysis-status/{upload_id}`
- `GET /api/analysis-status-stream/{upload_id}`

### Dashboard data

- `GET /api/analytics/{upload_id}`
- `POST /api/analytics/{upload_id}/interactive`
- `GET /api/insights/{upload_id}`
- `GET /api/charts/{upload_id}`

### Command-driven interactions

- `POST /api/query`
- `POST /api/dashboard-command`

These routes interpret dashboard commands and return a response plus a dashboard action payload.

### Workspace persistence and sharing

- `GET /api/workspace/{upload_id}`
- `PUT /api/workspace/{upload_id}`
- `POST /api/workspace/{upload_id}/share`
- `GET /api/workspace-share/{share_token}`

These routes persist dashboard workspace state and create durable share links for dashboard requests.

### Predictions

- `GET /api/predictions/{upload_id}`
- `GET /api/prediction-insights/{upload_id}`

### Reports

- `GET /api/generate-consulting-report/{upload_id}`
- `GET /api/generate-report/{upload_id}` (redirects to the consulting report route)

## Environment variables

The backend supports these optional environment variables:

- `DATABASE_URL`
- `UPLOAD_DIR`
- `PROCESSED_DIR`
- `REPORTS_DIR`
- `PDF_REPORTS_DIR`
- `PPT_REPORTS_DIR`
- `ALLOWED_ORIGINS`
- `APP_ENV`
- `REDIS_URL`

Default local values are defined in `backend/config.py`.

## Validation commands

Useful project checks:

Backend:

```bash
python -m pytest test_backend.py -q
```

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Docker note

`backend/Dockerfile`, `frontend/Dockerfile`, and `docker-compose.yml` are present in the repository. The local dev workflow described above is currently the safest documented path for full frontend-backend interaction.

## Troubleshooting

- If the backend fails to start, confirm your Python environment has all dependencies from `requirements.txt`.
- If forecasting routes fail because of a missing explainability dependency, install `shap` in your Python environment.
- If the frontend cannot reach the API in development, make sure the backend is running on port `8000`.
- If you want to clear generated artifacts, review files under `data/uploads`, `data/processed`, and `reports/pdf_reports` before deleting anything manually.

## License

This project currently does not include a dedicated license file in the repository root. Add one if you plan to distribute the project publicly.
