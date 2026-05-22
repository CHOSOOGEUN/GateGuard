import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.workers.tasks import upload_clip_task
from app.models.models import Event

@pytest.fixture
def mock_s3_client():
    with patch("boto3.client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client

@pytest.fixture
def mock_db_session():
    with patch("app.database.AsyncSessionLocal") as mock_session_class:
        mock_session = AsyncMock()
        mock_session_class.return_value.__aenter__.return_value = mock_session
        yield mock_session

def test_upload_clip_task_success(mock_s3_client, mock_db_session):
    # Mocking OS file operations
    with patch("os.path.exists", return_value=True), \
         patch("os.remove", return_value=None):
        
        # Mocking DB response: event found
        mock_event = Event(id=1, clip_url=None)
        
        # scalars().first() sequence mocking
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = mock_event
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db_session.execute.return_value = mock_result
        
        # Execute task (Mocking datetime to stabilize key)
        with patch("datetime.datetime") as mock_dt:
            mock_dt.now.return_value.timestamp.return_value = 123456789
            result = upload_clip_task(1, "/tmp/test.mp4")
        
        assert result["event_id"] == 1
        assert "event_1_123456789" in result["clip_url"]
        
        # Verify S3 upload
        mock_s3_client.upload_file.assert_called_once()
        
        # Verify DB update
        mock_db_session.commit.assert_called_once()
        assert mock_event.clip_url is not None

def test_upload_clip_task_retry_on_client_error(mock_s3_client):
    from botocore.exceptions import ClientError
    # Mocking S3 to raise error
    mock_s3_client.upload_file.side_effect = ClientError({"Error": {"Code": "500", "Message": "AWS Error"}}, "upload_file")
    
    # We expect a retry
    with patch.object(upload_clip_task, "retry") as mock_retry:
        mock_retry.side_effect = Exception("Retrying...")
        with pytest.raises(Exception, match="Retrying..."):
            upload_clip_task(1, "/tmp/test.mp4")
        mock_retry.assert_called_once()
