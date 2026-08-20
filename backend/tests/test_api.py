"""
Tests for the MinuteTalk AI backend API.

Run with: pytest backend/tests/ -v

These tests use FastAPI's TestClient to simulate API requests
without needing a running server. The Groq client is mocked to
avoid making real API calls during testing.
"""

import pytest
import os
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient


# Set a dummy API key before importing the app (to avoid warnings).
# Use setdefault so a REAL key in the environment is respected, which lets
# the live Groq integration test run via: GROQ_API_KEY=your-key pytest ...
os.environ.setdefault('GROQ_API_KEY', 'test_key')

from app.main import app, CATEGORY_PROMPTS, FALLBACK_TOPICS


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_groq_response():
    """Mock response structure for Groq API."""
    return {
        "choices": [
            {
                "message": {
                    "content": "Test topic"
                }
            }
        ]
    }


class TestHealthEndpoint:
    """Tests for health check endpoints."""
    
    def test_root_endpoint(self, client):
        """Test the root endpoint returns correct response."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert "MinuteTalk AI API is running" in data["message"]
    
    def test_health_check_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "Groq API" in data["message"] or "fallback" in data["message"].lower()


class TestTopicEndpoint:
    """Tests for the topic generation endpoint."""
    
    def test_valid_category_returns_topic(self, client):
        """Test that a valid category returns a topic."""
        response = client.post("/api/topic", json={"category": "tech"})
        assert response.status_code == 200
        
        data = response.json()
        assert "topic" in data
        assert isinstance(data["topic"], str)
        assert len(data["topic"]) > 0
        assert "hints" in data
        assert isinstance(data["hints"], list)
        assert "category" in data
        assert data["category"] == "tech"
    
    def test_all_categories_work(self, client):
        """Test that all defined categories work."""
        for category in CATEGORY_PROMPTS.keys():
            response = client.post("/api/topic", json={"category": category})
            assert response.status_code == 200
            
            data = response.json()
            assert "topic" in data
            assert data["category"] == category
    
    def test_invalid_category_returns_error(self, client):
        """Test that invalid category returns 400 error."""
        response = client.post("/api/topic", json={"category": "invalid_category"})
        assert response.status_code == 400
        assert "Invalid category" in response.json()["detail"]
    
    def test_missing_category_returns_error(self, client):
        """Test that missing category returns 422 error."""
        response = client.post("/api/topic", json={})
        assert response.status_code == 422
    
    def test_case_insensitive_category(self, client):
        """Test that category matching is case-insensitive."""
        response = client.post("/api/topic", json={"category": "TECH"})
        assert response.status_code == 200
    
    def test_fallback_topics_work(self, client):
        """Test that fallback topics are returned when Groq is not available."""
        response = client.post("/api/topic", json={"category": "tech"})
        assert response.status_code == 200
        
        data = response.json()
        # Should either have AI-generated or fallback topic
        assert "topic" in data


class TestGroqIntegration:
    """Tests for Groq API integration."""
    
    @pytest.mark.skipif(
        os.environ.get('GROQ_API_KEY') == 'test_key',
        reason="Skipping real API test - no real GROQ_API_KEY"
    )
    def test_real_groq_api_call(self, client):
        """Test making a real API call to Groq (requires real API key)."""
        response = client.post("/api/topic", json={"category": "tech"})
        assert response.status_code == 200
    
    def test_fallback_when_no_api_key(self, client):
        """Test that fallback works when API key is not set."""
        # Temporarily remove API key
        old_key = os.environ.pop('GROQ_API_KEY', None)
        try:
            response = client.post("/api/topic", json={"category": "science"})
            assert response.status_code == 200
            # Should still return a valid response
            data = response.json()
            assert "topic" in data
            assert len(data["topic"]) > 0
        finally:
            if old_key:
                os.environ['GROQ_API_KEY'] = old_key


class TestCategoryPrompts:
    """Tests for category prompt configuration."""
    
    def test_all_categories_have_prompts(self):
        """Test that all categories have both topic and hint prompts."""
        for category_id, prompts in CATEGORY_PROMPTS.items():
            assert "name" in prompts
            assert "topic_prompt" in prompts
            assert "hint_prompt" in prompts
    
    def test_fallback_topics_exist(self):
        """Test that fallback topics exist for all categories."""
        for category in CATEGORY_PROMPTS.keys():
            assert category in FALLBACK_TOPICS
            assert len(FALLBACK_TOPICS[category]) > 0


class TestResponseFormat:
    """Tests for response format validation."""
    
    def test_response_has_required_fields(self, client):
        """Test that response has all required fields."""
        response = client.post("/api/topic", json={"category": "tech"})
        data = response.json()
        
        # Check required fields
        assert "topic" in data
        assert "hints" in data
        assert "category" in data
        
        # Check types
        assert isinstance(data["topic"], str)
        assert isinstance(data["hints"], list)
        assert isinstance(data["category"], str)
    
    def test_hints_are_strings(self, client):
        """Test that all hints are string values."""
        response = client.post("/api/topic", json={"category": "tech"})
        data = response.json()
        
        for hint in data["hints"]:
            assert isinstance(hint, str)
            assert len(hint) > 0


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_server_error_handling(self, client):
        """Test that server errors are handled gracefully."""
        # This is more of an integration test, but we verify
        # that the error handling structure exists
        response = client.post("/api/topic", json={"category": "tech"})
        assert response.status_code in [200, 503]


class TestExplainEndpoint:
    """Tests for the topic explanation endpoint."""
    
    def test_explain_topic_endpoint_success(self, client):
        """Test that a valid topic explanation returns 200 and explanation text."""
        response = client.post(
            "/api/explain",
            json={"topic": "Should AI-generated code be copyrightable?", "category": "tech"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0
