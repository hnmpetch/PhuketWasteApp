FROM python:3.12-slim

WORKDIR /app

# Install system utilities if needed for numpy/pandas compilation, though binary wheels are available
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code files
COPY app.py .
COPY cleaner.py .
COPY database.py .
COPY example/ ./example/
COPY templates/ ./templates/
COPY static/ ./static/

# Create data directories
RUN mkdir -p raw clean

# Expose server port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Start Flask application using gunicorn for production stability, fallback to python app.py if needed
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "app:app"]
