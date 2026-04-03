import boto3
import os
import logging
from botocore.exceptions import NoCredentialsError, ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)

class S3Client:
    """GateGuard S3 업로드 클라이언트 (M2 Perfect)"""
    def __init__(self):
        self.bucket_name = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        
        # 실제 키가 있는지 확인하여 시뮬레이션 여부 결정
        self.is_configured = bool(self.access_key and self.access_key != "your-aws-access-key")
        
        if self.is_configured:
            try:
                self.client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
                logger.info(f"🚀 [S3] Connected to bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"⚠️ [S3] Connection failed: {str(e)}")
                self.is_configured = False
        else:
            logger.warning("🛡️ [S3] AWS Credentials not found. Running in MOCK/SIMULATION mode.")

    async def upload_file(self, local_file_path: str, s3_file_name: str) -> str:
        """파일을 S3에 업로드하고 접근 가능한 URL을 반환합니다."""
        if not self.is_configured:
            # 🐯 [코순이 Tip] 시뮬레이션 모드: 로컬 파일의 '가상 URL'을 반환
            logger.info(f"📸 [S3 SIMULATION] Mock uploading {local_file_path} to {s3_file_name}")
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/simulated/{s3_file_name}"

        try:
            # S3 업로드 실행 (Public Read 권한은 보안 정책에 따라 조절 가능)
            self.client.upload_file(
                local_file_path, 
                self.bucket_name, 
                s3_file_name,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_file_name}"
            logger.info(f"✅ [S3 SUCCESS] File uploaded: {url}")
            return url
            
        except FileNotFoundError:
            logger.error(f"❌ [S3 ERROR] Local file not found: {local_file_path}")
            return ""
        except NoCredentialsError:
            logger.error("❌ [S3 ERROR] Credentials not available")
            return ""
        except ClientError as e:
            logger.error(f"❌ [S3 ERROR] AWS Client Error: {str(e)}")
            return ""

    def get_presigned_url(self, s3_file_name: str, expires_in: int = 3600) -> str:
        """S3 객체에 접근할 수 있는 기간 한정 URL을 생성합니다."""
        if not self.is_configured:
            # 🐯 [코순이 Tip] 시뮬레이션 모드: 가상 URL 발급
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/simulated/{s3_file_name}"

        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_file_name},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"❌ [S3 ERROR] Failed to generate presigned URL: {str(e)}")
            return ""

# 싱글톤 인스턴스
s3_client = S3Client()
