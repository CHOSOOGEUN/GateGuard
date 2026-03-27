import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set

router = APIRouter()

# 연결된 WebSocket 클라이언트 목록
active_connections: Set[WebSocket] = set()


@router.websocket("/alerts")
async def websocket_endpoint(websocket: WebSocket):
    """역무원 대시보드와의 실시간 알림 연결"""
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # 클라이언트로부터의 메시지 수신 (ping/pong 등)
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.discard(websocket)


async def broadcast_event(message: dict):
    """감지 이벤트를 모든 연결된 클라이언트에 브로드캐스트"""
    disconnected = set()
    for connection in active_connections:
        try:
            await connection.send_text(json.dumps(message, ensure_ascii=False))
        except Exception:
            disconnected.add(connection)
    # 끊어진 연결 제거
    active_connections.difference_update(disconnected)
