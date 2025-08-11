import requests
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone
# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
API_BASE_URL = "https://api.open5e.com/v2/"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_INITDB_DATABASE", "dedchar")

# List of endpoints to fetch from the Open5E API
# The script will create a MongoDB collection for each of these
ENDPOINTS_TO_CACHE = [
    "species",  # Races
    "classes",
    "backgrounds",
    "spells",
    "weapons",
    "armor",
    "items",
    "feats",
    "alignments",
    "conditions",
    "languages",
    "skills",
]

def fetch_all_from_endpoint(endpoint_url):
    """
    Fetches all pages of data from a given paginated API endpoint.
    """
    all_results = []
    url = endpoint_url
    while url:
        try:
            response = requests.get(url)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            all_results.extend(data.get("results", []))
            url = data.get("next")  # Get the URL for the next page
            if url:
                print(f"  Fetching next page: {url}")
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {url}: {e}")
            break
    return all_results

async def main():
    """
    Main function to connect to MongoDB, fetch data from the API,
    and cache it in the database.
    """
    print("Starting Open5E data caching process...")

    # Establish connection to MongoDB
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DB_NAME]
        print(f"Connected to MongoDB at {MONGODB_URL}, database: {DB_NAME}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    # Check if data has already been cached today
    cache_log_collection = db["cache_log"]
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_entry = await cache_log_collection.find_one({"date": today_str, "status": "success"})

    if log_entry:
        print(f"Open5E data has already been successfully cached today ({today_str}). Skipping.")
        client.close()
        return

    for endpoint in ENDPOINTS_TO_CACHE:
        collection_name = f"open5e_{endpoint}"
        print(f"\nProcessing endpoint: '{endpoint}' -> Collection: '{collection_name}'")

        # 1. Fetch data from the API
        api_url = f"{API_BASE_URL}{endpoint}/"
        print(f"Fetching all data from {api_url}...")
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, fetch_all_from_endpoint, api_url)

        if not data:
            print(f"No data found for endpoint '{endpoint}'. Skipping.")
            continue

        print(f"Fetched {len(data)} documents for '{endpoint}'.")

        # 2. Get the MongoDB collection
        collection = db[collection_name]

        # 3. Clear the existing collection
        print(f"Clearing old data from collection '{collection_name}'...")
        await collection.delete_many({})

        # 4. Insert the new data
        print(f"Inserting {len(data)} new documents into '{collection_name}'...")
        await collection.insert_many(data)
        print(f"Successfully cached data for '{endpoint}'.")

    # Log the successful cache event
    await cache_log_collection.insert_one({
        "date": today_str,
        "status": "success",
        "cached_at": datetime.now(timezone.utc)
    })
    print(f"\nData caching process complete. Logged success for {today_str}.")

    # Close the database connection
    client.close()

if __name__ == "__main__":
    # This allows running the script directly
    # In a real-world scenario, you might have a dedicated task runner
    # or a command-line interface to trigger this.
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
