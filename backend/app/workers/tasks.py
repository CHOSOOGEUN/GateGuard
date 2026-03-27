from app.workers.celery_app import celery_app


@celery_app.task(name="process_event")
def process_event_task(event_id: str):
    """
    무임승차 이벤트 감지 후 비동기 후처리:
    1. S3에 영상 클립 업로드 (추후 구현)
    2. Notification 테이블에 알림 레코드 생성
    3. WebSocket으로 대시보드에 실시간 알림 브로드캐스트
    """
    print(f"[Celery] 이벤트 처리 시작: {event_id}")

    # TODO: S3 클립 업로드 구현
    # clip_url = upload_clip_to_s3(event_id)

    # TODO: Notification 생성 (동기 DB 세션 별도 구성 필요)
    # create_notification(event_id)

    # TODO: WebSocket 브로드캐스트
    # asyncio.run(broadcast_event({...}))

    print(f"[Celery] 이벤트 처리 완료: {event_id}")
    return {"status": "done", "event_id": event_id}
