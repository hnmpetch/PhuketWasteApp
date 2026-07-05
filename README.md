# Phuket Waste Analytics Dashboard

This project is a Flask-based web application for uploading, cleaning, storing, and visualizing waste data for Phuket. It provides a dashboard for exploring waste quantities by district, waste type, disposal method, tourist zone, and collection site.

## Features

- Upload CSV files containing waste-related records
- Clean and normalize data automatically
- Store uploads and cleaned records in SQLite
- Load a built-in sample dataset
- View dashboard summaries and charts
- Explore raw records in a paginated table
- Manage uploaded datasets from the UI

## Project Structure

- app.py: Flask application routes and API endpoints
- cleaner.py: Data cleaning and normalization logic
- database.py: SQLite database helpers and queries
- templates/: HTML templates for the dashboard UI
- static/: JavaScript and CSS assets
- example/: Sample input CSV file
- data/: Runtime storage for raw files, cleaned files, and the SQLite database
- test_app.py: End-to-end browser test for the app

## Requirements

The application uses Python 3 and the following packages:

- Flask
- pandas
- numpy
- gunicorn

Install dependencies with:

```bash
uv sync # recommand
# or
pip install -r requirements.txt
```

## Running the Application

### Local development

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

### Docker

This project includes a Docker Compose setup:

```bash
docker compose up --build
```

The app will be served through Nginx on port 80.

## Environment Variables

The app supports the following optional environment variables:

- DATABASE_PATH: location of the SQLite database file
- RAW_DIR: directory for uploaded raw CSV files
- CLEAN_DIR: directory for cleaned CSV outputs
- LATEST_CLEAN_PATH: path for the latest cleaned CSV export

## Testing

The repository includes an end-to-end browser test that starts the app and exercises the main UI flows.

Run it with:

```bash
python test_app.py
```

## Notes

- The app expects CSV files with columns such as date, district, area, waste_type, quantity_kg, collection_site, disposal_method, and is_tourist_zone.
- Missing or inconsistent values are handled during the cleaning step.
- Sample data can be loaded directly from the UI for quick testing.
