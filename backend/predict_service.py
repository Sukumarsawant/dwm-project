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
# Precompute product popularity metrics (orders_count and total_quantity)
pop_stats = df.groupby('Description').agg(
    orders_count=('InvoiceNo', 'nunique'),
    total_quantity=('Quantity', 'sum')
).reset_index()
products_df = products_df.merge(pop_stats, left_on='description', right_on='Description', how='left')
products_df['orders_count'] = products_df['orders_count'].fillna(1).astype(int)
products_df['total_quantity'] = products_df['total_quantity'].fillna(1).astype(int)

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

def build_explanation(antecedents, recommended_products, confidence, support):
    ant_text = format_product_list(antecedents)
    rec_text = format_product_list(recommended_products)
    conf_pct = confidence * 100
    supp_pct = support * 100
    rec_phrase = f"{rec_text}" if len(recommended_products) == 1 else f"{rec_text} together"

    return (
        f"Customers who purchased {ant_text} frequently also bought {rec_phrase}. "
        f"Confidence of {conf_pct:.1f}% and Support of {supp_pct:.2f}% indicate strong transaction co-occurrence."
    )

def recommend_products_apriori(selected_products, min_support=0.0, min_confidence=0.0, top_n=10):
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

        if confidence < min_confidence or support < min_support:
            continue

        rec_text = " + ".join(cons_list)
        matched_rule = " + ".join(ants_list) + " -> " + rec_text

        recommendations.append({
            "recommended_product": rec_text,
            "recommended_products": cons_list,
            "matched_rule": matched_rule,
            "support": round(support, 4),
            "confidence": round(confidence, 4),
            "explanation": build_explanation(ants_list, cons_list, confidence, support)
        })

    if not recommendations:
        return []

    res_df = pd.DataFrame(recommendations)
    res_df = res_df.drop_duplicates(subset=["recommended_product"])
    res_df = res_df.sort_values(by=["confidence", "support"], ascending=False)
    return res_df.head(top_n).to_dict(orient="records")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""

    if action == "products_search":
        q = sys.argv[2].lower() if len(sys.argv) > 2 else ""
        matches = products_df[products_df['description'].str.lower().str.contains(q, na=False)]
        print(matches.head(15)['description'].to_json(orient='values'))

    elif action == "marketplace_catalog":
        # Returns catalog items with price, category, sales popularity, and pagination
        cat_filter = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "All" else ""
        q = sys.argv[3].lower() if len(sys.argv) > 3 else ""
        sort_by = sys.argv[4] if len(sys.argv) > 4 else "popular"
        page = int(sys.argv[5]) if len(sys.argv) > 5 else 1
        limit = int(sys.argv[6]) if len(sys.argv) > 6 else 20

        def quick_cat(desc):
            if not isinstance(desc, str): return 'Stationery & Accessories'
            d = desc.upper()
            if any(k in d for k in ['HEART', 'LIGHT', 'DECOR', 'FRAME', 'SIGN', 'CLOCK', 'CANDLE', 'LANTERN', 'MIRROR']): return 'Home & Decor'
            elif any(k in d for k in ['BAG', 'LUNCH', 'BOX', 'TOTE', 'CASE', 'STORAGE', 'BASKET']): return 'Bags & Storage'
            elif any(k in d for k in ['MUG', 'CUP', 'TEA', 'COFFEE', 'BOWL', 'PLATE', 'JAR', 'BOTTLE']): return 'Kitchen & Dining'
            elif any(k in d for k in ['TOY', 'GAME', 'PLUSH', 'CHILD', 'DOLL', 'PUZZLE']): return 'Toys & Novelty'
            elif any(k in d for k in ['CHRISTMAS', 'XMAS', 'BIRTHDAY', 'GIFT', 'WRAP', 'CARD']): return 'Seasonal & Gifts'
            return 'Stationery & Accessories'

        cat_df = products_df.copy()
        cat_df['category'] = cat_df['description'].apply(quick_cat)

        if cat_filter:
            cat_df = cat_df[cat_df['category'] == cat_filter]
        if q:
            cat_df = cat_df[cat_df['description'].str.lower().str.contains(q, na=False)]

        # Sorting: most popular (highest order frequency), price low-to-high, price high-to-low
        if sort_by == "popular":
            cat_df = cat_df.sort_values(by="orders_count", ascending=False)
        elif sort_by == "price_asc":
            cat_df = cat_df.sort_values(by="unit_price", ascending=True)
        elif sort_by == "price_desc":
            cat_df = cat_df.sort_values(by="unit_price", ascending=False)
        elif sort_by == "name":
            cat_df = cat_df.sort_values(by="description", ascending=True)

        total_count = len(cat_df)
        total_pages = max(1, int(np.ceil(total_count / limit)))
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = cat_df.iloc[start_idx:end_idx].to_dict(orient='records')

        result = {
            "total_count": total_count,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit,
            "products": paginated_items
        }
        print(json.dumps(result))

    elif action == "recommend_basket":
        payload = json.loads(sys.argv[2])
        selected_prods = payload.get("products", [])
        min_supp = float(payload.get("min_support", 0.0))
        min_conf = float(payload.get("min_confidence", 0.0))
        top_n = int(payload.get("top_n", 10))

        recs = recommend_products_apriori(
            selected_products=selected_prods,
            min_support=min_supp,
            min_confidence=min_conf,
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

        # Quarterly Revenue Trend
        df['Quarter'] = df['InvoiceDate'].dt.to_period('Q').astype(str)
        quarterly = df.groupby('Quarter').agg(
            revenue=('TotalAmount', 'sum'),
            orders=('InvoiceNo', 'nunique')
        ).reset_index().to_dict(orient='records')

        # Price Range Breakdown
        price_bins = [0, 1, 2, 5, 10, 50, 100000]
        price_labels = ['£0 - £1', '£1 - £2', '£2 - £5', '£5 - £10', '£10 - £50', '£50+']
        df['PriceRange'] = pd.cut(df['UnitPrice'], bins=price_bins, labels=price_labels)
        price_dist = df.groupby('PriceRange', observed=False)['InvoiceNo'].count().to_dict()

        # Regional Breakdown: UK vs International
        uk_rev = float(df[df['Country'] == 'United Kingdom']['TotalAmount'].sum())
        intl_rev = float(df[df['Country'] != 'United Kingdom']['TotalAmount'].sum())
        regional_distribution = {
            "United Kingdom": round(uk_rev, 2),
            "International": round(intl_rev, 2)
        }

        # Top 5 Customers by Revenue
        top_customers = customers.sort_values(by='Monetary', ascending=False).head(5).to_dict(orient='records')

        # Scatter Plot Data (Representative sample of 300 customers for K-Means Recency vs Monetary)
        scatter_sample = customers.sample(n=min(300, len(customers)), random_state=42)[
            ['CustomerID', 'Recency', 'Frequency', 'Monetary', 'Cluster', 'Segment_Name']
        ].copy()
        scatter_sample['Monetary'] = scatter_sample['Monetary'].round(2)
        scatter_sample['Recency'] = scatter_sample['Recency'].astype(int)
        scatter_sample['Frequency'] = scatter_sample['Frequency'].astype(int)
        scatter_data = scatter_sample.to_dict(orient='records')

        # Product Categorization for Treemap & Stacked Column
        def assign_category(desc):
            if not isinstance(desc, str):
                return 'Stationery & Accessories'
            d = desc.upper()
            if any(k in d for k in ['HEART', 'LIGHT', 'DECOR', 'FRAME', 'SIGN', 'CLOCK', 'CANDLE', 'LANTERN', 'MIRROR', 'WALL', 'WOOD']):
                return 'Home & Decor'
            elif any(k in d for k in ['BAG', 'LUNCH', 'BOX', 'TOTE', 'CASE', 'STORAGE', 'BASKET', 'CONTAINER']):
                return 'Bags & Storage'
            elif any(k in d for k in ['MUG', 'CUP', 'TEA', 'COFFEE', 'BOWL', 'PLATE', 'JAR', 'BOTTLE', 'CUTLERY', 'BAKING']):
                return 'Kitchen & Dining'
            elif any(k in d for k in ['TOY', 'GAME', 'PLUSH', 'CHILD', 'DOLL', 'PUZZLE', 'PLAYING']):
                return 'Toys & Novelty'
            elif any(k in d for k in ['CHRISTMAS', 'XMAS', 'BIRTHDAY', 'GIFT', 'WRAP', 'CARD', 'RIBBON', 'EASTER']):
                return 'Seasonal & Gifts'
            return 'Stationery & Accessories'

        df['Category'] = df['Description'].apply(assign_category)

        # Treemap / Category Contribution
        cat_agg = df.groupby('Category').agg(
            revenue=('TotalAmount', 'sum'),
            items_sold=('Quantity', 'sum')
        ).reset_index()
        cat_agg['revenue'] = cat_agg['revenue'].round(2)
        category_contributions = cat_agg.to_dict(orient='records')

        # Stacked Column: Monthly Sales by Category
        df['Month'] = df['InvoiceDate'].dt.to_period('M').astype(str)
        pivot_monthly = df.pivot_table(index='Month', columns='Category', values='TotalAmount', aggfunc='sum', fill_value=0).round(2).reset_index()
        stacked_category_monthly = pivot_monthly.to_dict(orient='records')

        # Detailed Country Matrix (Orders, Customers, Revenue, Avg Order Value, Items Sold)
        country_matrix = df.groupby('Country').agg(
            revenue=('TotalAmount', 'sum'),
            orders=('InvoiceNo', 'nunique'),
            customers=('CustomerID', 'nunique'),
            items_sold=('Quantity', 'sum')
        ).reset_index()
        country_matrix['revenue'] = country_matrix['revenue'].round(2)
        country_matrix['aov'] = (country_matrix['revenue'] / country_matrix['orders']).round(2)
        country_matrix = country_matrix.sort_values(by='revenue', ascending=False).to_dict(orient='records')

        metrics = {
            "total_customers": int(customers['CustomerID'].nunique()),
            "total_products": int(products_df['stock_code'].nunique()),
            "total_transactions": int(df['InvoiceNo'].nunique()),
            "total_revenue": round(float(df['TotalAmount'].sum()), 2),
            "avg_order_value": round(float(df.groupby('InvoiceNo')['TotalAmount'].sum().mean()), 2),
            "cluster_distribution": customers['Segment_Name'].value_counts().to_dict(),
            "rfm_cluster_means": rfm_cluster_means,
            "monthly_trend": monthly,
            "quarterly_trend": quarterly,
            "price_distribution": price_dist,
            "regional_distribution": regional_distribution,
            "country_distribution": countries,
            "top_products": top_products,
            "top_customers": top_customers,
            "hourly_distribution": hourly_list,
            "day_distribution": day_list,
            "basket_size_distribution": basket_dist,
            "scatter_data": scatter_data,
            "category_contributions": category_contributions,
            "stacked_category_monthly": stacked_category_monthly,
            "country_matrix": country_matrix
        }
        print(json.dumps(metrics))

    elif action == "customers":
        print(customers.to_json(orient='records'))

    elif action == "rules":
        print(apriori_rules.to_json(orient='records'))
