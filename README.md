# E-Commerce Customer Analytics & Personalized Recommendation System

Complete full-stack implementation using **K-Means Clustering** (for RFM customer segmentation) and **Apriori Algorithm** (for market basket association rule recommendations).

---

## 📊 Dataset & Preprocessing Pipeline Summary

- **Raw Dataset**: UCI Online Retail (`541,909` rows)
- **Duplicates Removed**: `5,268`
- **Cancelled Invoices Removed**: `9,251`
- **Invalid Quantities Removed**: `1,336`
- **Invalid Prices Removed**: `1,176`
- **Missing Customer IDs Removed**: `132,186`
- **Cleaned Dataset**: **`392,692` records**
- **Unique Customers**: `4,338`
- **Unique Products**: `3,665`
- **Total Revenue**: `£8,887,208.89`

---

## 🧠 Data Mining Models

### 1. K-Means Customer Segmentation ($K=4$)
Features engineered via RFM (Recency, Frequency, Monetary) with `log1p` transformation & `StandardScaler`.
- **Cluster 0: VIP / High-Value Champions** — Recency: 12.2 days | Frequency: 13.8 orders | Spend: £8,088.02 | Count: 713
- **Cluster 1: Lost / Inactive Customers** — Recency: 181.5 days | Frequency: 1.3 orders | Spend: £341.00 | Count: 1,622
- **Cluster 2: New / Recent Customers** — Recency: 17.7 days | Frequency: 2.2 orders | Spend: £557.32 | Count: 837
- **Cluster 3: Loyal Regular Customers** — Recency: 71.6 days | Frequency: 4.1 orders | Spend: £1,801.78 | Count: 1,166

### 2. Apriori Association Rule Engine
- **Frequent Itemsets**: `442` itemsets generated ($min\_support = 0.015$)
- **Association Rules**: `190` rules derived ($lift \ge 1.2$)

---

## 🚀 How to Run the Application Locally

### 1. Backend Setup (Express + Python Bridge)
```bash
cd backend
npm install
node server.js
```
The Express backend will start on **`http://localhost:5000`**.

Available Endpoints:
- `GET /api/analytics` — Global dataset and cluster stats
- `GET /api/customers` — Customer RFM list with cluster labels
- `GET /api/customers/:id` — Detailed profile & purchase history
- `GET /api/customers/:id/recommendations` — Personalized top-5 Apriori recommendations
- `GET /api/rules` — Apriori association rules table

### 2. Frontend Setup (React Dashboard)
```bash
cd frontend
npm start
```
The React Analytics Dashboard will launch on **`http://localhost:3000`**.
