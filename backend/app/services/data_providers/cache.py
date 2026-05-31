"""簡易執行緒安全的 TTL 記憶體快取。

財報/籌碼類資料更新頻率低(日/季),免費 API 又有額度限制,
因此在記憶體層快取一段時間即可大幅降低請求數。
正式環境可換成 Firestore / Redis,介面保持一致。
"""

from __future__ import annotations

import threading
import time
from typing import Any, Callable, Optional

_LOCK = threading.Lock()
_STORE: dict[str, tuple[float, Any]] = {}

# 各類資料的預設存活秒數。
DEFAULT_TTL = 60 * 60  # 1 小時


def get(key: str) -> Optional[Any]:
    """取出未過期的快取值,過期或不存在回傳 None。"""
    with _LOCK:
        entry = _STORE.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            _STORE.pop(key, None)
            return None
        return value


def set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    with _LOCK:
        _STORE[key] = (time.time() + ttl, value)


def get_or_set(key: str, producer: Callable[[], Any], ttl: int = DEFAULT_TTL) -> Any:
    """快取命中則直接回傳;否則執行 producer、寫入快取再回傳。

    producer 拋例外時不寫入快取,讓呼叫端決定如何處理。
    """
    cached = get(key)
    if cached is not None:
        return cached
    value = producer()
    if value is not None:
        set(key, value, ttl)
    return value


def clear() -> None:
    with _LOCK:
        _STORE.clear()
