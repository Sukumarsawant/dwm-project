import sys
import json
import pandas as pd
import numpy as np
import joblib

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'cleaned_online_retail.csv')
RULES_PATH = os.path.join(BASE_DIR, 'models', 'association_rules.csv')
CUST_PATH = os.path.join(BASE_DIR, 'models', 'customer_segments.csv')
PROD_PATH = os.path.join(BASE_DIR, 'models', 'product_catalog.csv')

# Load datasets and models once into memory
df = pd.read_csv(DATA_PATH)
rules = pd.read_csv(RULES_PATH)
customers = pd.read_csv(CUST_PATH)
products = pd.read_csv(PROD_PATH)

# Cluster Naming Mapping
CLUSTER_NAMES = {
    0: "VIP / High-Value Champions",
    1: "Lost / Inactive Customers",
    2: "New / Recent Customers",
    3: "Loyal Regular Customers"
}

customers['Segment_Name'] = customers['Cluster'].map(CLUSTER_NAMES)

def get_recommendations(customer_id, top_n=5):
    cust_purchases = set(df[df['CustomerID'] == customer_id]['Description'].unique())
    if len(cust_purchases) == 0:
        # Fallback to top products if no history
        top_prods = df['Description'].value_counts().head(top_n).index.tolist()
        return [{"product": p, "score": 1.0, "reason": "Popular choice"} for p in top_prods]
    
    recommendations = {}
    for idx, row in rules.iterrows():
        ants = [a.strip() for a in str(row['antecedents']).split(',')]
        cons = [c.strip() for c in str(row['consequents']).split(',')]
        
        if any(item in cust_purchases for item in ants):
            for target in cons:
                if target not in cust_purchases:
                    score = float(row['lift'] * row['confidence'])
                    if target not in recommendations or score > recommendations[target]['score']:
                        recommendations[target] = {
                            "product": target,
                            "score": round(score, 2),
                            "confidence": round(float(row['confidence']), 4),
                            "lift": round(float(row['lift']), 4),
                            "reason": f"Bought related product: {ants[0]}"
                        }
    
    sorted_recs = sorted(recommendations.values(), key=lambda x: x['score'], reverse=True)
    return sorted_recs[:top_n]

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    
    if action == "customers":
        print(customers.to_json(orient='records'))
    elif action == "customer_detail":
        cid = int(sys.argv[2])
        cust_row = customers[customers['CustomerID'] == cid]
        if cust_row.empty:
            print(json.dumps({"error": "Customer not found"}))
        else:
            cust_dict = cust_row.to_dict(orient='records')[0]
            purchases = df[df['CustomerID'] == cid][['InvoiceNo', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'TotalAmount']].head(20).to_dict(orient='records')
            cust_dict['purchases'] = purchases
            print(json.dumps(cust_dict))
    elif action == "recommendations":
        cid = int(sys.argv[2])
        recs = get_recommendations(cid, top_n=5)
        print(json.dumps(recs))
    elif action == "rules":
        print(rules.head(50).to_json(orient='records'))
    elif action == "analytics":
        metrics = {
            "total_customers": int(customers['CustomerID'].nunique()),
            "total_products": int(products['stock_code'].nunique()),
            "total_transactions": int(df['InvoiceNo'].nunique()),
            "total_revenue": round(float(df['TotalAmount'].sum()), 2),
            "avg_order_value": round(float(df.groupby('InvoiceNo')['TotalAmount'].sum().mean()), 2),
            "cluster_distribution": customers['Segment_Name'].value_counts().to_dict()
        }
        print(json.dumps(metrics))
