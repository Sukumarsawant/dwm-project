# ==============================================================================
# DWM PROJECT: E-Commerce Customer Behavior Analysis & Recommendation System
# Google Colab Data Mining & Model Pipeline Script
# ==============================================================================

# STEP 1: INSTALL REQUIRED LIBRARIES
!pip install openpyxl scikit-learn mlxtend matplotlib seaborn pandas numpy joblib

# STEP 2: IMPORT DEPENDENCIES
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from mlxtend.frequent_patterns import apriori, association_rules
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

print("Libraries loaded successfully!")

# ==============================================================================
# STEP 3: LOAD & INSPECT DATASET
# ==============================================================================
# Note: Upload 'Online Retail.xlsx' to Colab or mount Google Drive
file_path = 'Online Retail.xlsx'

if not os.path.exists(file_path):
    print(f"Error: {file_path} not found. Please upload 'Online Retail.xlsx' into your Colab files panel.")
else:
    df_raw = pd.read_excel(file_path)
    print("Initial Dataset Shape:", df_raw.shape)
    print("\nDataset Info:")
    print(df_raw.info())
    print("\nHead Preview:")
    print(df_raw.head())

# ==============================================================================
# STEP 4: DATA CLEANING & PREPROCESSING PIPELINE
# ==============================================================================
df = df_raw.copy()

print("--- PREPROCESSING STEP LOG ---")
print("1. Initial rows:", df.shape[0])

# 1. Remove exact duplicate rows
df = df.drop_duplicates()
print("2. After removing duplicates:", df.shape[0])

# 2. Remove cancelled invoices (InvoiceNo starts with 'C')
df = df[~df['InvoiceNo'].astype(str).str.startswith('C')]
print("3. After removing cancellations:", df.shape[0])

# 3. Remove non-positive quantities
df = df[df['Quantity'] > 0]
print("4. After removing invalid quantities (Quantity <= 0):", df.shape[0])

# 4. Remove zero/negative unit prices
df = df[df['UnitPrice'] > 0]
print("5. After removing invalid prices (UnitPrice <= 0):", df.shape[0])

# 5. Remove missing CustomerIDs
df = df.dropna(subset=['CustomerID'])
print("6. After removing missing CustomerIDs (Clean Dataset):", df.shape[0])

# Feature creation & Type Conversion
df['CustomerID'] = df['CustomerID'].astype(int)
df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
df['TotalAmount'] = df['Quantity'] * df['UnitPrice']
df['Description'] = df['Description'].str.strip().str.upper()

print("\nFinal Cleaned Rows:", df.shape[0])

# Save Cleaned CSV
df.to_csv('cleaned_online_retail.csv', index=False)
print("Saved 'cleaned_online_retail.csv'!")

# ==============================================================================
# STEP 5: EXPLORATORY DATA ANALYSIS (EDA)
# ==============================================================================
print("\n--- EDA BUSINESS METRICS ---")
print("Unique Customers:", df['CustomerID'].nunique())
print("Unique Products:", df['StockCode'].nunique())
print("Total Transactions:", df['InvoiceNo'].nunique())
print("Total Revenue: £", round(df['TotalAmount'].sum(), 2))
print("Average Order Value (AOV): £", round(df.groupby('InvoiceNo')['TotalAmount'].sum().mean(), 2))

# EDA Visualization 1: Monthly Sales Trend
df['MonthYear'] = df['InvoiceDate'].dt.to_period('M').astype(str)
monthly_rev = df.groupby('MonthYear')['TotalAmount'].sum().reset_index()

plt.figure(figsize=(12, 5))
plt.plot(monthly_rev['MonthYear'], monthly_rev['TotalAmount'], marker='o', color='#3b82f6', linewidth=2.5)
plt.title('Monthly Sales Revenue Trend (2010 - 2011)', fontsize=14, fontweight='bold')
plt.xlabel('Month-Year')
plt.ylabel('Revenue (£)')
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.show()

# EDA Visualization 2: Top 10 Best Selling Products
top_prods = df.groupby('Description')['Quantity'].sum().sort_values(ascending=False).head(10)
plt.figure(figsize=(10, 5))
sns.barplot(x=top_prods.values, y=top_prods.index, palette='Blues_r')
plt.title('Top 10 Best Selling Products (Quantity)', fontsize=14, fontweight='bold')
plt.xlabel('Units Sold')
plt.tight_layout()
plt.show()

# ==============================================================================
# STEP 6: RFM FEATURE ENGINEERING FOR K-MEANS
# ==============================================================================
reference_date = df['InvoiceDate'].max() + pd.Timedelta(days=1)

rfm = df.groupby('CustomerID').agg({
    'InvoiceDate': lambda x: (reference_date - x.max()).days,
    'InvoiceNo': 'nunique',
    'TotalAmount': 'sum'
}).reset_index()

rfm.columns = ['CustomerID', 'Recency', 'Frequency', 'Monetary']

print("\n--- RFM SUMMARY ---")
print(rfm.describe())

# Log transformation to fix skewness
rfm_log = np.log1p(rfm[['Recency', 'Frequency', 'Monetary']])

# Scaling
scaler = StandardScaler()
rfm_scaled = scaler.fit_transform(rfm_log)

# ==============================================================================
# STEP 7: K-MEANS CLUSTERING (ELBOW & SILHOUETTE ANALYSIS)
# ==============================================================================
print("\n--- K-MEANS SELECTION EVALUATION ---")
silhouette_scores = []
k_range = range(2, 7)

for k in k_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(rfm_scaled)
    sil = silhouette_score(rfm_scaled, labels)
    silhouette_scores.append(sil)
    print(f"K={k} | Silhouette Score: {sil:.4f} | Inertia: {km.inertia_:.2f}")

# Plot Silhouette Scores
plt.figure(figsize=(8, 4))
plt.plot(k_range, silhouette_scores, marker='s', color='#10b981', linewidth=2)
plt.title('K-Means Silhouette Score for K (2 to 6)', fontsize=12, fontweight='bold')
plt.xlabel('Number of Clusters (K)')
plt.ylabel('Silhouette Score')
plt.grid(True)
plt.show()

# Final Model Training with K=4
k_best = 4
final_kmeans = KMeans(n_clusters=k_best, random_state=42, n_init=10)
rfm['Cluster'] = final_kmeans.fit_predict(rfm_scaled)

# Interpret Clusters
cluster_summary = rfm.groupby('Cluster').agg({
    'Recency': 'mean',
    'Frequency': 'mean',
    'Monetary': ['mean', 'count']
}).round(2)

print("\n--- CLUSTER SUMMARY (K=4) ---")
print(cluster_summary)

# Save K-Means Artifacts
joblib.dump(final_kmeans, 'kmeans_model.pkl')
joblib.dump(scaler, 'scaler.pkl')
rfm.to_csv('customer_segments.csv', index=False)
print("Saved 'kmeans_model.pkl', 'scaler.pkl', and 'customer_segments.csv'!")

# ==============================================================================
# STEP 8: APRIORI MARKET BASKET ANALYSIS
# ==============================================================================
print("\n--- APRIORI MARKET BASKET ANALYSIS ---")

# Transaction-Item Matrix
basket = (df.groupby(['InvoiceNo', 'Description'])['Quantity']
          .sum().unstack().reset_index().fillna(0)
          .set_index('InvoiceNo'))

# Binarize (True if bought, False otherwise)
basket_sets = (basket > 0).astype(bool)

# Mine Frequent Itemsets (min_support = 0.015)
frequent_itemsets = apriori(basket_sets, min_support=0.015, use_colnames=True)
print(f"Frequent Itemsets Generated: {len(frequent_itemsets)}")

# Generate Association Rules (min_lift = 1.2)
rules = association_rules(frequent_itemsets, metric='lift', min_threshold=1.2)
rules = rules.sort_values(by='lift', ascending=False)
print(f"Association Rules Mined: {len(rules)}")

# Format Rules for Export
rules_export = rules.copy()
rules_export['antecedents'] = rules_export['antecedents'].apply(lambda x: ', '.join(list(x)))
rules_export['consequents'] = rules_export['consequents'].apply(lambda x: ', '.join(list(x)))

print("\n--- TOP 5 ASSOCIATION RULES BY LIFT ---")
print(rules_export[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head())

# Save Rules CSV
rules_export.to_csv('association_rules.csv', index=False)
print("Saved 'association_rules.csv'!")

# ==============================================================================
# STEP 9: RECOMMENDATION ENGINE DEMO
# ==============================================================================
def recommend_basket(selected_items, min_support=0.015, min_confidence=0.15, min_lift=1.2, top_n=5):
    selected_set = set(selected_items)
    recs = []
    
    for idx, row in rules_export.iterrows():
        ants = set([a.strip() for a in row['antecedents'].split(',')])
        cons = set([c.strip() for c in row['consequents'].split(',')])
        
        if ants.issubset(selected_set) and not cons.intersection(selected_set):
            if row['confidence'] >= min_confidence and row['lift'] >= min_lift and row['support'] >= min_support:
                recs.append({
                    "Recommended Product": row['consequents'],
                    "Lift Ratio": round(row['lift'], 2),
                    "Confidence %": round(row['confidence'] * 100, 1),
                    "Support %": round(row['support'] * 100, 2),
                    "Triggered By": row['antecedents']
                })
    
    rec_df = pd.DataFrame(recs).drop_duplicates(subset=["Recommended Product"])
    return rec_df.sort_values(by="Lift Ratio", ascending=False).head(top_n)

# Test Recommendation Engine
test_basket = ["WHITE HANGING HEART T-LIGHT HOLDER"]
print(f"\n--- DEMO RECOMMENDATIONS FOR BASKET: {test_basket} ---")
demo_recs = recommend_basket(test_basket)
print(demo_recs)

print("\n✅ COLAB PIPELINE COMPLETE! All model artifacts generated and saved.")

