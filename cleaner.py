import pandas as pd
import numpy as np
import re
from datetime import datetime

def clean_waste_data(file_path):
    """
    Cleans the raw Phuket waste CSV data:
    1. Trims whitespaces from column names.
    2. Deletes completely null rows.
    3. Trims whitespaces from string values.
    4. Handles missing critical values (date, district, waste_type, quantity_kg).
    5. Standardizes and parses date formats (handles ISO and D/M/Y).
    6. Cleans quantity_kg (converts '379kg' or '250 kg' to float).
    7. Standardizes districts (e.g. Mueang, Kathu, Thalang) and waste types.
    8. Deletes duplicate rows.
    """
    try:
        # Load CSV
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV file: {str(e)}")

    # 1. Clean column headers
    df.columns = df.columns.str.strip()

    # Verify required columns exist (case-insensitive search if they are slightly off)
    expected_cols = ['date', 'district', 'area', 'waste_type', 'quantity_kg', 'collection_site', 'disposal_method', 'is_tourist_zone']
    found_cols = {}
    for exp in expected_cols:
        matched = [c for c in df.columns if c.lower().strip() == exp.lower()]
        if matched:
            found_cols[exp] = matched[0]
        else:
            # If a column is missing, create it with NaN
            df[exp] = np.nan
            found_cols[exp] = exp

    # Rename to standard lowercase names
    df = df.rename(columns={found_cols[k]: k for k in expected_cols})

    # 2. Remove rows that are entirely empty
    df = df.dropna(how='all')

    # 3. Clean string columns and strip whitespace
    string_cols = ['district', 'area', 'waste_type', 'collection_site', 'disposal_method', 'is_tourist_zone']
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            # Convert string versions of nan/null to actual NaN
            df[col] = df[col].replace(to_replace={r'^\s*$': np.nan, 'nan': np.nan, 'None': np.nan, 'nan ': np.nan}, regex=True)

    # 4. Clean and parse quantity_kg
    def parse_quantity(val):
        if pd.isna(val):
            return np.nan
        val_str = str(val).lower().replace(' ', '').replace('kg', '')
        try:
            return float(val_str)
        except ValueError:
            # Try to extract the first valid number
            nums = re.findall(r'[-+]?\d*\.\d+|\d+', val_str)
            if nums:
                return float(nums[0])
            return np.nan

    df['quantity_kg'] = df['quantity_kg'].apply(parse_quantity)

    # 5. Clean and parse dates
    def parse_date(val):
        if pd.isna(val):
            return None
        val_str = str(val).strip()
        # List of formats to attempt
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%d-%m-%Y',
            '%Y/%m/%d',
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(val_str, fmt)
                # Handle 2-digit years if any (assume 2000s)
                if dt.year < 100:
                    dt = dt.replace(year=dt.year + 2000)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        # Fallback to pandas datetime parsing
        try:
            dt = pd.to_datetime(val_str, errors='coerce')
            if pd.notna(dt):
                return dt.strftime('%Y-%m-%d')
        except:
            pass
        return None

    df['date'] = df['date'].apply(parse_date)

    # 6. Drop rows where critical fields are null
    # The prompt requests: "clean data (delete duplication. delete null row.)"
    # We remove rows missing critical columns like date, district, waste_type, or quantity
    df = df.dropna(subset=['date', 'district', 'waste_type', 'quantity_kg'])

    # 7. Standardize District Names
    # Phuket has 3 main districts: Mueang (sometimes spelled Muang), Kathu, Thalang
    def clean_district(val):
        if pd.isna(val):
            return None
        d = str(val).strip().capitalize()
        if d == 'Muang':
            d = 'Mueang'
        return d

    df['district'] = df['district'].apply(clean_district)
    df = df.dropna(subset=['district'])

    # 8. Standardize Waste Type Names
    df['waste_type'] = df['waste_type'].apply(lambda x: str(x).strip().capitalize() if pd.notna(x) else None)
    df = df.dropna(subset=['waste_type'])

    # 9. Standardize is_tourist_zone
    df['is_tourist_zone'] = df['is_tourist_zone'].apply(lambda x: str(x).strip().upper() if pd.notna(x) else 'N')
    df['is_tourist_zone'] = df['is_tourist_zone'].apply(lambda x: 'Y' if x in ['Y', 'YES', '1', 'TRUE'] else 'N')

    # 10. Clean default fields for optional values
    df['area'] = df['area'].fillna('Unknown')
    df['collection_site'] = df['collection_site'].fillna('Unknown')
    df['disposal_method'] = df['disposal_method'].fillna('Unknown')

    # 11. Delete duplicate rows
    df = df.drop_duplicates()

    return df
