import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

# List of resource types to test
RESOURCE_TYPES = [
    "alignments",
    "armor",
    "backgrounds",
    "classes",
    "conditions",
    "feats",
    "items",
    "languages",
    "skills",
    "species",
    "spells",
]

@pytest.mark.parametrize("resource_type", RESOURCE_TYPES)
def test_get_open5e_resource(client: TestClient, resource_type: str):
    """
    Test that the /api/open5e/{resource_type} endpoint returns a list of items
    for each resource type.
    """
    response = client.get(f"/api/open5e/{resource_type}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "_id" in item
        assert "name" in item

@pytest.mark.asyncio
async def test_get_open5e_equipment(client: TestClient, test_db: AsyncIOMotorDatabase):
    """
    Test the special 'equipment' endpoint, which should combine results from
    'armor', 'items', and 'weapons' collections.
    """
    # Mock data
    mock_armor = {"name": "Test Leather Armor", "category": "Light Armor"}
    mock_item = {"name": "Test Healing Potion", "category": "Potion"}
    mock_weapon = {"name": "Test Longsword", "category": "Martial Weapon"}

    # Collections to use
    armor_col = test_db["open5e_armor"]
    items_col = test_db["open5e_items"]
    weapons_col = test_db["open5e_weapons"]

    try:
        # Clean up any previous test data
        await armor_col.delete_many({"name": {"$regex": "Test "}})
        await items_col.delete_many({"name": {"$regex": "Test "}})
        await weapons_col.delete_many({"name": {"$regex": "Test "}})

        # Insert mock data
        await armor_col.insert_one(mock_armor)
        await items_col.insert_one(mock_item)
        await weapons_col.insert_one(mock_weapon)

        # 1. Test fetching all equipment
        response = client.get("/api/open5e/equipment?search=Test")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        names = {item["name"] for item in data}
        assert {"Test Leather Armor", "Test Healing Potion", "Test Longsword"} == names

        # 2. Test searching
        response = client.get("/api/open5e/equipment?search=Test Leather Armor")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Leather Armor"

        response = client.get("/api/open5e/equipment?search=Test Healing Potion")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Healing Potion"

        # 3. Test pagination
        # To make pagination test deterministic, we fetch only our test items
        response = client.get("/api/open5e/equipment?search=Test&limit=1&page=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        # The order is sorted by name: Test Healing Potion, Test Leather Armor, Test Longsword
        assert data[0]["name"] == "Test Leather Armor"

    finally:
        # Clean up mock data
        await armor_col.delete_many({"name": mock_armor["name"]})
        await items_col.delete_many({"name": mock_item["name"]})
        await weapons_col.delete_many({"name": mock_weapon["name"]})
