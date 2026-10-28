import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_create_and_fetch_assessment():
    # Register/login user
    email = "tester@deploymate.internal"
    password = "SecurePassword123!"

    client.post("/auth/register", json={"email": email, "password": password})
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create assessment with pass data
    payload = {
        "project_name": "demo-chat-app",
        "commit_hash": "a1b2c3d",
        "branch": "main",
        "environment": "staging",
        "build_status": "SUCCESS",
        "test_status": "PASS",
        "security_findings": {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        },
        "infrastructure_metrics": {
            "cpu_usage_percent": 42.5,
            "memory_usage_percent": 55.0
        },
        "recent_failures": 0
    }

    create_res = client.post("/assessments", json=payload, headers=headers)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["decision"] == "APPROVE"
    assert data["risk_score"] == 0
    assert "ai_status" in data
    assert "ai_summary" in data

    # Verify listing
    list_res = client.get("/assessments", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert items[0]["commit_hash"] == "a1b2c3d"

    # Verify fetching by ID
    get_res = client.get(f"/assessments/{data['id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == data["id"]
