import os
import time
import threading
import shutil
import sqlite3
from playwright.sync_api import sync_playwright

# Override the database file path in our database module before starting the app
import database
database.DB_PATH = 'test_phuket_waste.db'

# Import the flask app
from app import app

def run_server():
    """Run Flask server on port 5001 for testing"""
    app.run(port=5001, debug=False, use_reloader=False)

def clean_test_environment():
    """Removes test database and any test files created during the run"""
    print("\n🧹 Cleaning up test environment...")
    
    # 1. Delete test database file
    if os.path.exists('test_phuket_waste.db'):
        try:
            os.remove('test_phuket_waste.db')
            print(" - Deleted test_phuket_waste.db")
        except Exception as e:
            print(f" - Error deleting test database: {e}")
            
    # 2. Delete test CSV files in raw and clean directories
    raw_dir = os.path.join(app.root_path, 'raw')
    clean_dir = os.path.join(app.root_path, 'clean')
    
    # We look for files created in raw/ and clean/ and remove them
    for folder in [raw_dir, clean_dir]:
        if os.path.exists(folder):
            for file in os.listdir(folder):
                # Sample files will have "phuket_waste_raw.csv" in their name
                if 'phuket_waste_raw.csv' in file:
                    try:
                        os.remove(os.path.join(folder, file))
                        print(f" - Deleted test file: {folder}/{file}")
                    except Exception as e:
                        print(f" - Error deleting {file}: {e}")
                        
    # 3. Delete latest_clean.csv if it was created for test
    latest_clean_path = os.path.join(app.root_path, 'latest_clean.csv')
    if os.path.exists(latest_clean_path):
        try:
            os.remove(latest_clean_path)
            print(" - Deleted latest_clean.csv")
        except Exception as e:
            pass
            
    print("✨ Clean up completed!\n")

def test_phuket_waste_app():
    # Make sure we start with a fresh environment
    clean_test_environment()
    
    # Re-initialize the test database since it was deleted by the cleanup
    database.init_db()
    
    # Start Flask server in background thread
    print("🚀 Starting Flask test server on http://127.0.0.1:5001...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for Flask to boot
    time.sleep(2)
    
    print("🎭 Initializing Playwright in UI mode (headless=False)...")
    with sync_playwright() as p:
        # Launch Chromium (configurable via HEADLESS env var for automated CLI runs)
        import os
        headless_mode = os.environ.get('HEADLESS', 'false').lower() == 'true'
        browser = p.chromium.launch(headless=headless_mode, slow_mo=None if headless_mode else 800)
        page = browser.new_page()
        
        # Navigate to application
        print("🔗 Navigating to http://127.0.0.1:5001...")
        page.goto("http://127.0.0.1:5001")
        
        # 1. Verify page title
        print("✅ Verifying page title...")
        assert "Phuket Waste Analytics Dashboard" in page.title()
        
        # Click Dashboard to switch from the Home landing page
        print("🖱️ Clicking Dashboard navigation tab...")
        page.click("text=Dashboard")
        time.sleep(1)
        
        # 2. Verify empty state is visible
        print("✅ Verifying initial Empty State card is visible...")
        empty_state = page.locator("#db-empty-state")
        assert empty_state.is_visible()
        
        # 3. Click Load Sample Data
        print("🖱️ Clicking 'Load Sample Data' button to populate database...")
        btn_load = page.locator("#btnEmptyLoadSample")
        btn_load.click()
        
        # Wait for data load notification toast and stats grid to appear
        print("⏳ Waiting for stats grid to load...")
        page.wait_for_selector("#db-stats-grid", state="visible", timeout=10000)
        
        # Verify stats cards contain data
        area_count = page.locator("#stat-area-count").text_content()
        total_waste_kg = page.locator("#stat-total-waste-kg").text_content()
        print(f"📈 Dashboard statistics loaded. Area count: {area_count}, Total Waste: {total_waste_kg}")
        assert int(total_waste_kg.replace("kg", "").replace(",", "").strip()) > 0
        
        # 4. Test Filters
        print("🔍 Testing filters...")
        
        # Open filter drawer first
        print("🖱️ Opening Filter Drawer...")
        page.click("#btnToggleFilters")
        time.sleep(1)

        # Filter by District: Kathu
        print(" - Selecting District: Kathu...")
        page.select_option("#filter-district", "Kathu")
        time.sleep(1) # wait for AJAX updates
        
        kathu_waste = page.locator("#stat-total-waste-kg").text_content()
        print(f" - Filtered Kathu waste: {kathu_waste}")
        assert int(kathu_waste.replace("kg", "").replace(",", "").strip()) < int(total_waste_kg.replace("kg", "").replace(",", "").strip())
        
        # Filter by Waste Type: Organic
        print(" - Selecting Waste Type: Organic...")
        page.select_option("#filter-waste-type", "Organic")
        time.sleep(1)
        
        organic_kathu_waste = page.locator("#stat-total-waste-kg").text_content()
        print(f" - Filtered Organic-Kathu waste: {organic_kathu_waste}")
        assert int(organic_kathu_waste.replace("kg", "").replace(",", "").strip()) < int(kathu_waste.replace("kg", "").replace(",", "").strip())
        
        # Reset Filters
        print("🖱️ Clicking 'Reset Filters'...")
        page.click("#btnResetFilters")
        time.sleep(1.5)
        
        reset_waste = page.locator("#stat-total-waste-kg").text_content()
        print(f" - Stats reset. Waste amount: {reset_waste}")
        assert reset_waste == total_waste_kg
        
        # 5. Test Data Explorer Tab
        print("🗺️ Navigating to Data Explorer Tab...")
        page.click("text=Data Explorer")
        
        # Verify table has data
        page.wait_for_selector("#raw-data-table tbody tr", state="visible")
        rows = page.locator("#raw-data-table tbody tr")
        print(f" - Table showing {rows.count()} rows on current page")
        assert rows.count() > 0
        
        # Click Next Page
        print("🖱️ Clicking 'Next' page button...")
        page.click("#btnNextPage")
        time.sleep(1)
        
        # Click Previous Page
        print("🖱️ Clicking 'Previous' page button...")
        page.click("#btnPrevPage")
        time.sleep(1)
        
        # 6. Test Upload Center Tab and Delete Dataset
        print("📥 Navigating to Upload Center Tab...")
        page.click("text=Upload Center")
        
        # Check upload history list contains the loaded dataset
        page.wait_for_selector(".history-item", state="visible")
        history_items = page.locator(".history-item")
        print(f" - History list contains {history_items.count()} uploaded datasets")
        assert history_items.count() > 0
        
        # Set up dialog listener to accept the delete confirmation box automatically
        print("🔊 Setting up dialog handler to confirm deletion...")
        page.on("dialog", lambda dialog: dialog.accept())
        
        # Click Delete button
        print("🗑️ Clicking 'Remove Dataset' button...")
        page.click(".btn-delete-upload")
        time.sleep(2) # wait for deletion to complete and update
        
        # Verify history is empty
        history_msg = page.locator(".history-list").text_content()
        print(f" - History list content after deletion: '{history_msg.strip()}'")
        assert "No datasets loaded" in history_msg or "No files uploaded" in history_msg
        
        # 7. Check Dashboard empty state again
        print("📊 Returning to Dashboard tab to verify clean reset...")
        page.click("text=Dashboard")
        time.sleep(1)
        
        assert empty_state.is_visible()
        print("✅ Dashboard successfully reset to empty state after dataset removal.")
        
        # Close Browser
        print("🚪 Closing browser window...")
        browser.close()
        
    print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    
    # Clean up test database and csv files
    clean_test_environment()

if __name__ == "__main__":
    test_phuket_waste_app()
