import pytest
from unittest.mock import MagicMock, patch
from app.core.s3 import S3Client, s3_client
from botocore.exceptions import ClientError, NoCredentialsError

@pytest.fixture
def mock_boto3_client():
    with patch("app.core.s3.S3Client.__init__", return_value=None):
        with patch("boto3.client") as mock:
            client = MagicMock()
            mock.return_value = client
            s3 = S3Client()
            s3.bucket_name = "test-bucket"
            s3.region = "us-east-1"
            s3.is_configured = True
            s3.client = client
            yield s3, client

def test_s3_singleton_instance():
    from app.core.s3 import s3_client as c1
    from app.core.s3 import s3_client as c2
    assert c1 is c2

@pytest.mark.asyncio
async def test_upload_file_real_mode(mock_boto3_client):
    s3, mock_boto = mock_boto3_client
    mock_boto.upload_file.return_value = None
    url = await s3.upload_file("local.mp4", "s3.mp4")
    assert "s3.mp4" in url

@pytest.mark.asyncio
async def test_upload_file_file_not_found(mock_boto3_client):
    s3, mock_boto = mock_boto3_client
    mock_boto.upload_file.side_effect = FileNotFoundError()
    url = await s3.upload_file("missing.mp4", "s3.mp4")
    assert url == ""

@pytest.mark.asyncio
async def test_upload_file_no_credentials(mock_boto3_client):
    s3, mock_boto = mock_boto3_client
    mock_boto.upload_file.side_effect = NoCredentialsError()
    url = await s3.upload_file("local.mp4", "s3.mp4")
    assert url == ""

@pytest.mark.asyncio
async def test_upload_file_client_error(mock_boto3_client):
    s3, mock_boto = mock_boto3_client
    mock_boto.upload_file.side_effect = ClientError({"Error": {"Code": "500", "Message": "AWS Error"}}, "upload_file")
    url = await s3.upload_file("local.mp4", "s3.mp4")
    assert url == ""

def test_get_presigned_url_client_error(mock_boto3_client):
    s3, mock_boto = mock_boto3_client
    mock_boto.generate_presigned_url.side_effect = ClientError({"Error": {"Code": "500", "Message": "AWS Error"}}, "op")
    url = s3.get_presigned_url("test.mp4")
    assert url == ""

@pytest.mark.asyncio
async def test_s3_init_exception():
    # Test connection exception in __init__
    with patch("boto3.client", side_effect=Exception("Conn error")):
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.AWS_ACCESS_KEY_ID = "valid-key"
            s3 = S3Client()
            assert s3.is_configured is False
