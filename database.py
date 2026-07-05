import sqlite3
import os
import pandas as pd

DB_PATH = os.environ.get('DATABASE_PATH', 'phuket_waste.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema if tables don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Create uploads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            raw_filename TEXT NOT NULL,
            clean_filename TEXT NOT NULL,
            row_count INTEGER NOT NULL
        )
    """)
    
    # Create waste_records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS waste_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER,
            date TEXT NOT NULL,
            district TEXT NOT NULL,
            area TEXT,
            waste_type TEXT NOT NULL,
            quantity_kg REAL NOT NULL,
            collection_site TEXT,
            disposal_method TEXT,
            is_tourist_zone TEXT DEFAULT 'N',
            FOREIGN KEY (upload_id) REFERENCES uploads (id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

def save_upload_to_db(filename, raw_filename, clean_filename, cleaned_df):
    """Saves upload metadata and bulk inserts cleaned waste records."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Insert upload metadata
        cursor.execute("""
            INSERT INTO uploads (filename, raw_filename, clean_filename, row_count)
            VALUES (?, ?, ?, ?)
        """, (filename, raw_filename, clean_filename, len(cleaned_df)))
        
        upload_id = cursor.lastrowid
        
        # 2. Insert records in bulk
        records = []
        for _, row in cleaned_df.iterrows():
            records.append((
                upload_id,
                row['date'],
                row['district'],
                row['area'],
                row['waste_type'],
                float(row['quantity_kg']),
                row['collection_site'],
                row['disposal_method'],
                row['is_tourist_zone']
            ))
            
        cursor.executemany("""
            INSERT INTO waste_records (upload_id, date, district, area, waste_type, quantity_kg, collection_site, disposal_method, is_tourist_zone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, records)
        
        conn.commit()
        return upload_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_uploads():
    """Returns a list of all uploads ordered by upload date."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM uploads ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_upload(upload_id):
    """Deletes an upload and all associated records via ON DELETE CASCADE."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM uploads WHERE id = ?", (upload_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def query_dashboard_data(filters=None):
    """Queries waste records from the database applying optional filters."""
    if filters is None:
        filters = {}
        
    conn = get_db_connection()
    
    query = """
        SELECT r.*, u.filename as upload_filename 
        FROM waste_records r
        JOIN uploads u ON r.upload_id = u.id
        WHERE 1=1
    """
    params = []
    
    if filters.get('start_date'):
        query += " AND r.date >= ?"
        params.append(filters['start_date'])
    if filters.get('end_date'):
        query += " AND r.date <= ?"
        params.append(filters['end_date'])
    if filters.get('district'):
        query += " AND r.district = ?"
        params.append(filters['district'])
    if filters.get('waste_type'):
        query += " AND r.waste_type = ?"
        params.append(filters['waste_type'])
    if filters.get('is_tourist_zone'):
        query += " AND r.is_tourist_zone = ?"
        params.append(filters['is_tourist_zone'])
    if filters.get('upload_id'):
        query += " AND r.upload_id = ?"
        params.append(int(filters['upload_id']))
        
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    
    return df
