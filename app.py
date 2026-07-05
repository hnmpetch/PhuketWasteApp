import os
import shutil
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
import pandas as pd

import cleaner
import database

app = Flask(__name__)
app.config['SECRET_KEY'] = 'phuket_waste_secret_key'

# Directories and paths for uploads
RAW_DIR = os.environ.get('RAW_DIR', os.path.join(app.root_path, 'raw'))
CLEAN_DIR = os.environ.get('CLEAN_DIR', os.path.join(app.root_path, 'clean'))
LATEST_CLEAN_PATH = os.environ.get('LATEST_CLEAN_PATH', os.path.join(app.root_path, 'latest_clean.csv'))

# Ensure directories exist
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(CLEAN_DIR, exist_ok=True)

# Initialize Database
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are supported'}), 400
    
    try:
        # 1. Save Raw File
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        raw_filename = f"raw_{timestamp}_{original_filename}"
        raw_path = os.path.join(RAW_DIR, raw_filename)
        file.save(raw_path)
        
        # 2. Clean the Data
        cleaned_df = cleaner.clean_waste_data(raw_path)
        
        # 3. Save Cleaned Files
        clean_filename = f"clean_{timestamp}_{original_filename}"
        clean_path = os.path.join(CLEAN_DIR, clean_filename)
        
        # Save to specific clean path
        cleaned_df.to_csv(clean_path, index=False)
        
        # Save copy to latest_clean_path
        latest_clean_path = LATEST_CLEAN_PATH
        shutil.copyfile(clean_path, latest_clean_path)
        
        # 4. Save to Database
        upload_id = database.save_upload_to_db(
            filename=original_filename,
            raw_filename=raw_filename,
            clean_filename=clean_filename,
            cleaned_df=cleaned_df
        )
        
        # Calculate stats for the response
        total_rows_cleaned = len(cleaned_df)
        total_weight = cleaned_df['quantity_kg'].sum()
        
        return jsonify({
            'success': True,
            'message': 'File uploaded, cleaned, and database populated successfully!',
            'upload_id': upload_id,
            'filename': original_filename,
            'row_count': total_rows_cleaned,
            'total_weight_kg': float(total_weight)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/load-sample', methods=['POST'])
def load_sample():
    """Automatically loads the sample file in example/phuket_waste_raw.csv"""
    sample_path = os.path.join(app.root_path, 'example', 'phuket_waste_raw.csv')
    if not os.path.exists(sample_path):
        return jsonify({'error': 'Sample file not found at example/phuket_waste_raw.csv'}), 404
    
    try:
        # Copy to raw directory as if uploaded
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        raw_filename = f"raw_{timestamp}_phuket_waste_raw.csv"
        raw_path = os.path.join(RAW_DIR, raw_filename)
        shutil.copyfile(sample_path, raw_path)
        
        # Clean
        cleaned_df = cleaner.clean_waste_data(raw_path)
        
        # Save Cleaned
        clean_filename = f"clean_{timestamp}_phuket_waste_raw.csv"
        clean_path = os.path.join(CLEAN_DIR, clean_filename)
        cleaned_df.to_csv(clean_path, index=False)
        
        # Copy to latest_clean_path
        latest_clean_path = LATEST_CLEAN_PATH
        shutil.copyfile(clean_path, latest_clean_path)
        
        # Save to DB
        upload_id = database.save_upload_to_db(
            filename='phuket_waste_raw.csv (Sample)',
            raw_filename=raw_filename,
            clean_filename=clean_filename,
            cleaned_df=cleaned_df
        )
        
        return jsonify({
            'success': True,
            'message': 'Sample data loaded successfully!',
            'upload_id': upload_id,
            'row_count': len(cleaned_df),
            'total_weight_kg': float(cleaned_df['quantity_kg'].sum())
        })
    except Exception as e:
        return jsonify({'error': f'Failed to load sample: {str(e)}'}), 500

@app.route('/api/data', methods=['GET'])
def get_data():
    # Parse filter query parameters
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'district': request.args.get('district'),
        'waste_type': request.args.get('waste_type'),
        'is_tourist_zone': request.args.get('is_tourist_zone'),
        'upload_id': request.args.get('upload_id')
    }
    
    # Clean filters (ignore empty strings)
    filters = {k: v for k, v in filters.items() if v}
    
    try:
        # Get filtered data as DataFrame
        df = database.query_dashboard_data(filters)
        
        # Get all uploads for filter selection
        uploads = database.get_uploads()
        
        if df.empty:
            return jsonify({
                'summary': {
                    'total_kg': 0,
                    'record_count': 0,
                    'avg_kg': 0,
                    'tourist_zone_kg': 0,
                    'non_tourist_zone_kg': 0,
                },
                'charts': {
                    'by_type': [],
                    'by_district': [],
                    'by_district_waste_type': [],
                    'over_time': [],
                    'by_disposal': [],
                    'by_collection_site': [],
                    'by_tourist': [],
                    'by_district_tourist': [],
                    'by_area': [],
                    'by_district_disposal': [],
                    'area_over_time': [],
                    'densest_area': '',
                    'area_count': 0
                },
                'uploads': uploads,
                'records': []
            })
            
        # Calculate summary statistics
        total_kg = float(df['quantity_kg'].sum())
        record_count = int(df.shape[0])
        avg_kg = float(df['quantity_kg'].mean()) if record_count > 0 else 0
        
        tourist_zone_kg = float(df[df['is_tourist_zone'] == 'Y']['quantity_kg'].sum())
        non_tourist_zone_kg = float(df[df['is_tourist_zone'] == 'N']['quantity_kg'].sum())
        
        # Calculate Chart Data
        # 1. By Waste Type
        by_type = df.groupby('waste_type')['quantity_kg'].sum().reset_index()
        by_type = by_type.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')
        
        # 2. By District
        by_district = df.groupby('district')['quantity_kg'].sum().reset_index()
        by_district = by_district.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')
        
        # 3. District and Waste Type Matrix
        by_district_waste_type = df.groupby(['district', 'waste_type'])['quantity_kg'].sum().reset_index()
        by_district_waste_type = by_district_waste_type.to_dict(orient='records')

        # 4. By Disposal Method
        by_disposal = df.groupby('disposal_method')['quantity_kg'].sum().reset_index()
        by_disposal = by_disposal.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')
        
        # 4. Over Time (Grouped by Date, sorted chronologically)
        over_time = df.groupby('date')['quantity_kg'].sum().reset_index()
        over_time = over_time.sort_values(by='date').to_dict(orient='records')

        # 5. By Collection Site (fill missing/empty values)
        df_site = df.copy()
        df_site['collection_site'] = df_site['collection_site'].fillna('Unspecified').replace('', 'Unspecified')
        by_collection_site = df_site.groupby('collection_site')['quantity_kg'].sum().reset_index()
        by_collection_site = by_collection_site.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')

        # 6. By Tourist Zone
        by_tourist = df.groupby('is_tourist_zone')['quantity_kg'].sum().reset_index()
        by_tourist = by_tourist.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')

        # 7. By District and Tourist Zone (for grouped bar chart)
        by_district_tourist = df.groupby(['district', 'is_tourist_zone'])['quantity_kg'].sum().reset_index()
        by_district_tourist = by_district_tourist.to_dict(orient='records')

        # 8. By Area (sub-district) — spatial density analysis
        by_area = df.groupby('area')['quantity_kg'].sum().reset_index()
        by_area = by_area.sort_values(by='quantity_kg', ascending=False).to_dict(orient='records')

        # 9. By District and Disposal Method (for stacked horizontal bar)
        by_district_disposal = df.groupby(['district', 'disposal_method'])['quantity_kg'].sum().reset_index()
        by_district_disposal = by_district_disposal.to_dict(orient='records')

        # 10. Area Over Time — waste trend grouped by district and date (for multi-line time series)
        area_over_time = df.groupby(['district', 'date'])['quantity_kg'].sum().reset_index()
        area_over_time = area_over_time.sort_values(by='date').to_dict(orient='records')

        # 11. Densest Area — the area name with the highest total waste
        area_totals = df.groupby('area')['quantity_kg'].sum()
        densest_area = area_totals.idxmax() if not area_totals.empty else ''

        # 12. Number of unique areas analyzed
        area_count = int(df['area'].nunique())
        
        # Send raw records for preview (limit to latest 150 for performance)
        preview_records = df.head(150).to_dict(orient='records')
        
        return jsonify({
            'summary': {
                'total_kg': total_kg,
                'record_count': record_count,
                'avg_kg': avg_kg,
                'tourist_zone_kg': tourist_zone_kg,
                'non_tourist_zone_kg': non_tourist_zone_kg
            },
            'charts': {
                'by_type': by_type,
                'by_district': by_district,
                'by_district_waste_type': by_district_waste_type,
                'over_time': over_time,
                'by_disposal': by_disposal,
                'by_collection_site': by_collection_site,
                'by_tourist': by_tourist,
                'by_district_tourist': by_district_tourist,
                'by_area': by_area,
                'by_district_disposal': by_district_disposal,
                'area_over_time': area_over_time,
                'densest_area': densest_area,
                'area_count': area_count
            },
            'uploads': uploads,
            'records': preview_records
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-upload/<int:upload_id>', methods=['POST'])
def delete_upload_data(upload_id):
    try:
        # Get upload record first to delete actual files if desired
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT raw_filename, clean_filename FROM uploads WHERE id = ?", (upload_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            raw_path = os.path.join(RAW_DIR, row['raw_filename'])
            clean_path = os.path.join(CLEAN_DIR, row['clean_filename'])
            
            # Remove files if they exist
            if os.path.exists(raw_path):
                os.remove(raw_path)
            if os.path.exists(clean_path):
                os.remove(clean_path)
                
        success = database.delete_upload(upload_id)
        
        # Also clean up latest_clean.csv if no uploads remain
        uploads = database.get_uploads()
        if not uploads:
            latest_clean_path = LATEST_CLEAN_PATH
            if os.path.exists(latest_clean_path):
                os.remove(latest_clean_path)
                
        return jsonify({'success': success, 'message': 'Upload deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# File download routes
@app.route('/download/latest')
def download_latest():
    latest_clean_path = LATEST_CLEAN_PATH
    if not os.path.exists(latest_clean_path):
        return "Latest clean file not found", 404
    return send_from_directory(os.path.dirname(LATEST_CLEAN_PATH), os.path.basename(LATEST_CLEAN_PATH), as_attachment=True)

@app.route('/download/clean/<filename>')
def download_clean(filename):
    clean_filename = secure_filename(filename)
    if not os.path.exists(os.path.join(CLEAN_DIR, clean_filename)):
        return "Cleaned file not found", 404
    return send_from_directory(CLEAN_DIR, clean_filename, as_attachment=True)

@app.route('/download/raw/<filename>')
def download_raw(filename):
    raw_filename = secure_filename(filename)
    if not os.path.exists(os.path.join(RAW_DIR, raw_filename)):
        return "Raw file not found", 404
    return send_from_directory(RAW_DIR, raw_filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
