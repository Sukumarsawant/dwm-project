import os
import sys
import json
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'cleaned_online_retail.csv')
RULES_PATH = os.path.join(BASE_DIR, 'models', 'association_rules.csv')
CUST_PATH = os.path.join(BASE_DIR, 'models', 'customer_segments.csv')
PROD_PATH = os.path.join(BASE_DIR, 'models', 'product_catalog.csv')

df = pd.read_csv(DATA_PATH)
apriori_rules = pd.read_csv(RULES_PATH)
customers = pd.read_csv(CUST_PATH)
products_df = pd.read_csv(PROD_PATH)

CLUSTER_NAMES = {
    0: "VIP / High-Value Champions",
    1: "Lost / Inactive Customers",
    2: "New / Recent Customers",
    3: "Loyal Regular Customers"
}
customers['Segment_Name'] = customers['Cluster'].map(CLUSTER_NAMES)

def format_product_list(prods):
    prods = list(prods)
    if len(prods) == 1:
        return prods[0]
    if len(prods) == 2:
        return f"{prods[0]} and {prods[1]}"
    return ", ".join(prods[:-1]) + f", and {prods[-1]}"

def build_explanation(antecedents, recommended_products, confidence, lift):
    ant_text = format_product_list(antecedents)
    rec_text = format_product_list(recommended_products)
    conf_pct = confidence * 100
    rec_phrase = f"{rec_text}" if len(recommended_products) == 1 else f"{rec_text} together"

    return (
        f"Customers who purchased {ant_text} frequently also bought {rec_phrase}. "
        f"Confidence of {conf_pct:.1f}% indicates strong transaction pairing, "
        f"and a Lift of {lift:.2f}x proves this item combination occurs significantly "
        f"more often than random chance."
    )

def recommend_products_apriori(selected_products, min_support=0.0, min_confidence=0.0, min_lift=0.0, top_n=10):
    selected_set = set(selected_products)
    recommendations = []
    
    for _, row in apriori_rules.iterrows():
        ants_list = [p.strip() for p in str(row["antecedents"]).split(",") if p.strip()]
        cons_list = [p.strip() for p in str(row["consequents"]).split(",") if p.strip()]

        ants_set = set(ants_list)
        cons_set = set(cons_list)

        if not ants_set.issubset(selected_set):
            continue

        if cons_set.intersection(selected_set):
            continue

        support = float(row["support"])
        confidence = float(row["confidence"])
        lift = float(row["lift"])

        if confidence < min_confidence or lift < min_lift or support < min_support:
            continue

        rec_text = " + ".join(cons_list)
        matched_rule = " + ".join(ants_list) + " -> " + rec_text

        recommendations.append({
            "recommended_product": rec_text,
            "recommended_products": cons_list,
            "matched_rule": matched_rule,
            "support": round(support, 4),
            "confidence": round(confidence, 4),
            "lift": round(lift, 4),
            "explanation": build_explanation(ants_list, cons_list, confidence, lift)
        })

    if not recommendations:
        return []

    res_df = pd.DataFrame(recommendations)
    res_df = res_df.drop_duplicates(subset=["recommended_product"])
    res_df = res_df.sort_values(by=["lift", "confidence", "support"], ascending=False)
    return res_df.head(top_n).to_dict(orient="records")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""

    if action == "products_search":
        q = sys.argv[2].lower() if len(sys.argv) > 2 else ""
        matches = products_df[products_df['description'].str.lower().str.contains(q, na=False)]
        print(matches.head(15)['description'].to_json(orient='values'))

    elif action == "recommend_basket":
        payload = json.loads(sys.argv[2])
        selected_prods = payload.get("products", [])
        min_supp = float(payload.get("min_support", 0.0))
        min_conf = float(payload.get("min_confidence", 0.0))
        min_lift = float(payload.get("min_lift", 0.0))
        top_n = int(payload.get("top_n", 10))

        recs = recommend_products_apriori(
            selected_products=selected_prods,
            min_support=min_supp,
            min_confidence=min_conf,
            min_lift=min_lift,
            top_n=top_n
        )
        print(json.dumps(recs))

    elif action == "analytics":
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
        df['MonthYear'] = df['InvoiceDate'].dt.to_period('M').astype(str)
        df['Hour'] = df['InvoiceDate'].dt.hour
        df['DayOfWeek'] = df['InvoiceDate'].dt.day_name()

        monthly = df.groupby('MonthYear').agg(
            revenue=('TotalAmount', 'sum'),
            transactions=('InvoiceNo', 'nunique')
        ).reset_index().to_dict(orient='records')

        countries = df.groupby('Country').agg(
            revenue=('TotalAmount', 'sum'),
            customers=('CustomerID', 'nunique')
        ).sort_values(by='revenue', ascending=False).head(8).reset_index().to_dict(orient='records')

        top_products = df.groupby('Description').agg(
            quantity=('Quantity', 'sum'),
            revenue=('TotalAmount', 'sum')
        ).sort_values(by='quantity', ascending=False).head(8).reset_index().to_dict(orient='records')

        # PowerBI-style Hourly & Day-of-Week Distributions
        hourly = df.groupby('Hour')['InvoiceNo'].nunique().reset_index()
        hourly.columns = ['hour', 'transactions']
        hourly_list = hourly.to_dict(orient='records')

        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday']
        day_dist = df.groupby('DayOfWeek')['InvoiceNo'].nunique().reindex(day_order).reset_index()
        day_dist.columns = ['day', 'transactions']
        day_list = day_dist.to_dict(orient='records')

        # Order Basket Size Distribution
        basket_sizes = df.groupby('InvoiceNo')['Quantity'].sum()
        basket_dist = {
            "Small (1-10 items)": int((basket_sizes <= 10).sum()),
            "Medium (11-50 items)": int(((basket_sizes > 10) & (basket_sizes <= 50)).sum()),
            "Large (51-200 items)": int(((basket_sizes > 50) & (basket_sizes <= 200)).sum()),
            "Wholesale (200+ items)": int((basket_sizes > 200).sum())
        }

        # RFM Averages per Cluster
        rfm_cluster_means = customers.groupby('Segment_Name').agg({
            'Recency': 'mean',
            'Frequency': 'mean',
            'Monetary': 'mean',
            'CustomerID': 'count'
        }).reset_index().to_dict(orient='records')

        metrics = {
            "total_customers": int(customers['CustomerID'].nunique()),
            "total_products": int(products_df['stock_code'].nunique()),
            "total_transactions": int(df['InvoiceNo'].nunique()),
            "total_revenue": round(float(df['TotalAmount'].sum()), 2),
            "avg_order_value": round(float(df.groupby('InvoiceNo')['TotalAmount'].sum().mean()), 2),
            "cluster_distribution": customers['Segment_Name'].value_counts().to_dict(),
            "rfm_cluster_means": rfm_cluster_means,
            "monthly_trend": monthly,
            "country_distribution": countries,
            "top_products": top_products,
            "hourly_distribution": hourly_list,
            "day_distribution": day_list,
            "basket_size_distribution": basket_dist
        }
        print(json.dumps(metrics))

    elif action == "customers":
        print(customers.to_json(orient='records'))

    elif action == "rules":
        print(apriori_rules.head(100).to_json(orient='records'))
