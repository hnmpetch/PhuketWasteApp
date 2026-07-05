import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.on("console", lambda msg: print(f"Browser console: {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))
    page.goto("http://localhost")
    
    # Click dashboard
    page.click("text=Dashboard")
    page.click("#btnEmptyLoadSample")
    time.sleep(5)
    
    print("Test complete.")
    browser.close()
