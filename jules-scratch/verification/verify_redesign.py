import asyncio
import os
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # Get the absolute path to the index.html file
            file_path = os.path.abspath("app/templates/index.html")

            # Navigate to the local HTML file
            await page.goto(f"file://{file_path}")

            # Wait for the login form to be visible
            await expect(page.get_by_text("Welcome, Adventurer")).to_be_visible(timeout=10000)

            # Take a screenshot of the redesigned login page
            await page.screenshot(path="jules-scratch/verification/verification.png")

            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
