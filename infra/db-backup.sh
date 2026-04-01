#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BUCKET="gateguard-db-backup-909133988515-ap-northeast-2-an"
BACKUP_FILE="/tmp/gateguard_backup_$DATE.sql"

# DB 덤프
docker exec gateguard-db-1 pg_dump -U gateguard gateguard > $BACKUP_FILE

# S3 업로드
/snap/bin/aws s3 cp $BACKUP_FILE s3://$BUCKET/daily/$DATE.sql

# 임시 파일 삭제
rm $BACKUP_FILE

echo "[$DATE] 백업 완료!" >> /var/log/db-backup.log