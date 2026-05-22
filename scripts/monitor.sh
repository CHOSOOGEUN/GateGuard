#!/bin/bash

WEBHOOK_URL="여기에_복사한_URL_입력"
THRESHOLD=80

CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
CPU_USAGE=${CPU_USAGE%.*}
MEM_USAGE=$(free -m | awk 'NR==2{printf "%.0f", $3*100/$2 }')

MESSAGE=""

if [ "$CPU_USAGE" -ge "$THRESHOLD" ]; then
    MESSAGE="🔥 **[긴급]** CPU 사용량이 ${CPU_USAGE}%입니다! 서버 확인이 필요합니다."
fi

if [ "$MEM_USAGE" -ge "$THRESHOLD" ]; then
    [ -n "$MESSAGE" ] && MESSAGE="${MESSAGE}\n"
    MESSAGE="${MESSAGE}⚠️ **[경고]** 메모리 사용량이 ${MEM_USAGE}%에 도달했습니다!"
fi

if [ -n "$MESSAGE" ]; then
    curl -H "Content-Type: application/json" -X POST -d "{\"content\": \"$MESSAGE\"}" $WEBHOOK_URL
fi
