# GateGuard 인프라 설정 가이드

담당: 이동근 (인프라) | 최태양 (인프라)  
작성일: 2026.04.01

---

## 서버 환경

| 항목 | 내용 |
|------|------|
| 클라우드 | AWS EC2 (Ubuntu 24.04 LTS, t3.micro) |
| 리전 | 시드니 (ap-southeast-2) |
| 퍼블릭 IP | `15.135.92.86` |
| 도메인 | `https://gateguardsystems.com` |
| API 문서 | `http://15.135.92.86:8000/docs` |

---

## 보안 그룹 (인바운드)

| 포트 | 용도 |
|------|------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 8000 | FastAPI |

---

## Docker Log Rotation 설정

`/etc/docker/daemon.json` 에 아래 내용 적용 (파일 참고: `docker-daemon.json`)

```bash
sudo cp infra/docker-daemon.json /etc/docker/daemon.json
sudo systemctl restart docker
sudo docker compose down && sudo docker compose up -d
```

- 로그 파일 최대 크기: **10MB**
- 최대 파일 수: **3개** (총 30MB 한도)

---

## PostgreSQL S3 자동 백업

### 사전 준비
1. AWS IAM 유저 `gateguard-s3-backup` 생성 및 액세스 키 발급
2. S3 버킷 생성: `gateguard-db-backup-909133988515-ap-northeast-2-an`
3. EC2 서버에서 `aws configure` 로 키 등록

### 스크립트 설치
```bash
sudo cp infra/db-backup.sh /usr/local/bin/db-backup.sh
sudo chmod +x /usr/local/bin/db-backup.sh
sudo touch /var/log/db-backup.log
sudo chown ubuntu:ubuntu /var/log/db-backup.log
sudo usermod -aG docker ubuntu
```

### 크론잡 등록
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/db-backup.sh >> /var/log/db-backup.log 2>&1") | crontab -
```

### 수동 테스트
```bash
/usr/local/bin/db-backup.sh
aws s3 ls s3://gateguard-db-backup-909133988515-ap-northeast-2-an/daily/
```

---

## 크론탭 현황

```
# 매일 새벽 2시 — DB 백업 → S3 업로드
0 2 * * * /usr/local/bin/db-backup.sh >> /var/log/db-backup.log 2>&1

# 매일 새벽 3시 — Docker 불필요 리소스 자동 정리
0 3 * * * docker system prune -f >> /var/log/docker-prune.log 2>&1
```

---

## GitHub Actions CI/CD

`.github/workflows/deploy.yml` 참고

### GitHub Secrets 등록 필요
| Secret | 값 |
|--------|----|
| `EC2_HOST` | `15.135.92.86` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | `gateguard-key.pem` 파일 내용 전체 |
