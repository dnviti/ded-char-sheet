import pytest
from fastapi.testclient import TestClient

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

    # Check if the list is not empty
    # Note: This assumes the test database has data for these collections.
    # If a collection is empty, this test will need adjustment.
    if data:
        # Check the structure of the first item
        item = data[0]
        assert "_id" in item
        assert "name" in item
