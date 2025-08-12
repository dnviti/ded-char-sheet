from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://localhost:8000/")

        # 2. Switch to the registration form
        page.get_by_role("button", name="New to these lands? Register").click()
        expect(page.get_by_text("Forge Your Account")).to_be_visible(timeout=10000)

        # 3. Fill in registration details and submit
        page.get_by_label("Email").fill("test@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Register").click()

        # Wait for navigation to complete and the character selector to be visible
        expect(page.get_by_text("Character Keep")).to_be_visible(timeout=20000)

        # 4. Create a new character
        page.get_by_role("button", name="Create New Character").click()

        # Wait for the character sheet to load
        expect(page.get_by_placeholder("Character Name")).to_be_visible(timeout=10000)

        # 5. Verify that the "Class" and "Level" fields are present and have the correct default values
        expect(page.get_by_text("Fighter")).to_be_visible()
        expect(page.get_by_label("Level")).to_have_value("1")

        # 6. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
