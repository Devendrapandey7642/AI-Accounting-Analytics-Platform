import pandas as pd
from fastapi.testclient import TestClient
from sklearn.ensemble import RandomForestRegressor

from backend.agents import forecasting_agent
from backend.agents.forecasting_agent import ForecastingAgent
from backend.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_forecasting_agent_falls_back_when_shap_is_unavailable(monkeypatch):
    monkeypatch.setattr(forecasting_agent, "SHAP_AVAILABLE", False)
    monkeypatch.setattr(forecasting_agent, "shap", None)

    df = pd.DataFrame(
        {
            "Sales": [100, 120, 140, 160, 180],
            "Expense": [50, 60, 70, 80, 90],
            "Region": ["North", "South", "North", "South", "North"],
        }
    )
    agent = ForecastingAgent(df)
    X, y = agent.prepare_features("Sales")
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    model.fit(X, y)

    explanation = agent.explain_with_shap(model, X, X.columns.tolist())

    assert explanation["shap_plot"] is None
    assert explanation["shap_values"] == "SHAP not installed"
    assert "feature_importance" in explanation
    assert explanation["feature_importance"]
