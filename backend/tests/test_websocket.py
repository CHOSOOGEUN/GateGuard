import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.api.websocket import ConnectionManager, manager as global_manager

@pytest.fixture(autouse=True)
def cleanup_manager():
    global_manager._connections = []
    yield

def test_websocket_endpoint_flow():
    # Use TestClient (Sync) for testing the route itself (39-44 in websocket.py)
    client = TestClient(app)
    # Patch manager to prevent side effects in tests
    with patch("app.api.websocket.manager.connect", new_callable=AsyncMock) as mock_connect, \
         patch("app.api.websocket.manager.disconnect") as mock_disconnect:
        
        with client.websocket_connect("/ws/events") as websocket:
            # Connect method should be called (39)
            mock_connect.assert_called_once()
            
            # Since while True (41) waits for message, we send one to trigger it
            websocket.send_text("ping")
        
        # Disconnect should be called (44)
        mock_disconnect.assert_called_once()

def test_manager_connect_disconnect():
    async def run_test():
        mock_ws = AsyncMock()
        custom_manager = ConnectionManager()
        await custom_manager.connect(mock_ws)
        assert mock_ws in custom_manager._connections
        
        custom_manager.disconnect(mock_ws) # (18)
        assert mock_ws not in custom_manager._connections
        return True
    assert asyncio.run(run_test())

def test_manager_broadcast_error_path():
    async def run_test():
        mock_ws = AsyncMock()
        mock_ws.send_text.side_effect = Exception("failed")
        custom_manager = ConnectionManager()
        await custom_manager.connect(mock_ws)
        await custom_manager.broadcast({"test": "data"}) # (29-31)
        assert mock_ws not in custom_manager._connections
        return True
    assert asyncio.run(run_test())
