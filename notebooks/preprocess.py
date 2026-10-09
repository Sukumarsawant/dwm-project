import pandas as pd
import numpy as np

def run_preprocessing_pipeline(file_path):
    print("Loading dataset...")
    df = pd.read_excel(file_path)
    
    initial_rows = df.shape[0]
    print(f"1. Initial rows: {initial_rows}")
    
    # 1. Duplicates
    df = df.drop_duplicates()
    after_dup = df.shape[0]
    print(f"2. After removing duplicates: {after_dup}")
    
    # 2. Cancelled invoices
    df = df[~df['InvoiceNo'].astype(str).str.startswith('C')]
    after_cancel = df.shape[0]
    print(f"3. After removing cancelled invoices: {after_cancel}")
    
    # 3. Invalid quantities
    df = df[df['Quantity'] > 0]
    after_qty = df.shape[0]
    print(f"4. After removing invalid quantities (Quantity <= 0): {after_qty}")
    
    # 4. Invalid prices
    df = df[df['UnitPrice'] > 0]
    after_price = df.shape[0]
    print(f"5. After removing invalid prices (UnitPrice <= 0): {after_price}")
    
    # 5. Missing CustomerIDs
    df = df.dropna(subset=['CustomerID'])
    after_cust = df.shape[0]
    print(f"6. After removing missing CustomerIDs: {after_cust}")
    
    # Datatype conversions & Feature Creation
    df['CustomerID'] = df['CustomerID'].astype(int)
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    df['TotalAmount'] = df['Quantity'] * df['UnitPrice']
    df['Description'] = df['Description'].str.strip().str.upper()
    
    return df

if __name__ == "__main__":
    cleaned_df = run_preprocessing_pipeline("online+retail/Online Retail.xlsx")
    cleaned_df.to_csv("data/cleaned_online_retail.csv", index=False)
    print("Cleaned dataset successfully saved to data/cleaned_online_retail.csv")

