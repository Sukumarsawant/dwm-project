# BasketIQ

BasketIQ is a retail analytics product built around the UCI Online Retail dataset. It combines an executive dashboard, product-pair discovery, and RFM customer segmentation in one responsive application.

## Data mining methods

- **Apriori** mines frequent itemsets level by level and powers the saved association-rule catalogue.
- **FP-Growth** mines frequent patterns through an FP-tree and can generate basket recommendations from the cleaned invoice data.
- **K-Means** segments customers using recency, purchase frequency, and monetary value (RFM).

Apriori and FP-Growth address association discovery; K-Means addresses customer segmentation. Their outputs answer different questions and are not direct substitutes.

## Run locally

Use two terminals from the project directory.

### Terminal 1: backend

```powershell
cd backend
npm install
python -m pip install -r requirements.txt
node server.js
```

The API starts at `http://localhost:5000`. If `python` is not the command for your installation, set `PYTHON_PATH` to the Python executable before starting Node:

```powershell
$env:PYTHON_PATH = 'C:\path\to\python.exe'
node server.js
```

### Terminal 2: dashboard

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:3000`.

## Dataset and artifacts

The app reads the cleaned transactions from `data/cleaned_online_retail.csv` and trained/catalog artifacts from `models/`. The original input workbook is under `online+retail/`. Customer cluster labels and association rules are precomputed so the dashboard does not retrain K-Means on every page load. FP-Growth recommendation requests mine the transaction matrix at request time.

## Main API routes

- `GET /api/analytics` — sales, product, and customer metrics for the dashboard
- `GET /api/customers` — customer RFM values and K-Means segment labels
- `GET /api/rules` — precomputed Apriori association rules
- `GET /api/products?query=...` — product search
- `POST /api/recommend` — basket recommendations; set `algorithm` to `apriori` or `fpgrowth`

Example request body:

```json
{
  "products": ["WHITE HANGING HEART T-LIGHT HOLDER"],
  "algorithm": "fpgrowth",
  "min_support": 0.003,
  "min_confidence": 0.15,
  "top_n": 10
}
```

Association rules describe co-purchases in the historical dataset. They do not establish that one product causes the purchase of another.
