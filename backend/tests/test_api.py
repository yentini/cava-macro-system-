"""Integration Tests for FastAPI Endpoints."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    # Act
    response = client.get("/api/health")

    # Assert
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_api_status():
    # Act
    response = client.get("/api/status")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "decision" in data
    assert "gauges" in data
    assert "indicators" in data
    assert len(data["gauges"]) == 13
    gauge_ids = [g["id"] for g in data["gauges"]]
    assert "fed_net_liquidity" in gauge_ids
    assert "hyg_ema" in gauge_ids
    assert "btc_structural" in gauge_ids
    assert "nominal_illusion" in gauge_ids
    assert data["decision"]["score_conviction"] > 0
    assert "confluence_index" in data["decision"]
    assert "cross_rules" in data["decision"]
    assert len(data["decision"]["cross_rules"]) == 8

def test_api_chart_history():
    # Act: Request chart history for SPY 6mo 1d
    response = client.get("/api/chart-history?ticker=SPY&period=6mo&interval=1d")

    # Assert
    assert response.status_code == 200
    points = response.json()
    assert isinstance(points, list)
    assert len(points) > 10
    first_pt = points[0]
    assert "date" in first_pt
    assert "price" in first_pt
    assert "ema" in first_pt
    assert "open" in first_pt
    assert "high" in first_pt
    assert "low" in first_pt


def test_api_cors_raspberry_pi_lan():
    # Arrange
    origin = "http://192.168.1.45:3000"

    # Act
    response = client.options(
        "/api/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    # Assert
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin

