import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self._connections.remove(ws)

    async def broadcast(self, data: dict[str, Any]):
        """
        [최적화 v1] 모든 활성 클라이언트에게 광속으로 데이터를 방송하고, 끊긴 소켓은 안전하게 정리합니다.
        """
        message = json.dumps(data, ensure_ascii=False, default=str)
        # 리스트 복사본을 순회하여 안전한 삭제 보장
        for ws in list(self._connections):
            try:
                await ws.send_text(message)
            except (WebSocketDisconnect, Exception):
                if ws in self._connections:
                    self._connections.remove(ws)


manager = ConnectionManager()


@router.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive ping 수신
    except WebSocketDisconnect:
        manager.disconnect(ws)
