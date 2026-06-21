import { useRef } from "react";
import { getWebSocketUrl } from "../api";
import type { WebSocketMessage } from "../types";

type UseGameSocketArgs = {
  // Called with each parsed inbound frame; the caller owns the type switch.
  onMessage: (msg: WebSocketMessage) => void;
  logToConsole: (line: string) => void;
};

const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Owns the gameplay WebSocket lifecycle: connect, parse inbound frames (handing
 * each to `onMessage`), and exponential-backoff auto-reconnect on unexpected
 * close. Exposes the live `websocketRef` for sending plus `openSocket`/
 * `closeSocket`. `closeSocket` marks the close explicit so the reconnect loop
 * stays quiet.
 */
export function useGameSocket({ onMessage, logToConsole }: UseGameSocketArgs) {
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExplicitCloseRef = useRef(false);

  const openSocket = (): Promise<WebSocket> => {
    isExplicitCloseRef.current = false;
    return new Promise((resolve, reject) => {
      const url = getWebSocketUrl();
      logToConsole("WS 소켓 연결 시도: " + url);
      const ws = new WebSocket(url);
      websocketRef.current = ws;

      ws.onopen = () => {
        logToConsole("WS 소켓 연결 완료.");
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts on success
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
          onMessage(msg);
        } catch (e) {
          logToConsole("WS 수신 패킷 파싱 실패: " + (e as Error).message);
        }
      };

      ws.onerror = (err) => {
        logToConsole("WS 소켓 오류 발생.");
        reject(err);
      };

      ws.onclose = () => {
        logToConsole("WS 연결 종료.");
        websocketRef.current = null;

        // Auto reconnect logic
        if (!isExplicitCloseRef.current) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(5000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            logToConsole(`WS 연결이 유실되었습니다. ${delay / 1000}초 후 재접속을 시도합니다. (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              openSocket().catch((err) => {
                logToConsole("WS 재접속 실패: " + (err as Error).message);
              });
            }, delay);
          } else {
            logToConsole("WS 최대 재접속 시도 횟수를 초과했습니다. 새로고침이 필요할 수 있습니다.");
          }
        }
      };
    });
  };

  const closeSocket = () => {
    isExplicitCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch {
        logToConsole("WS 종료 중 오류가 발생했습니다.");
      }
      websocketRef.current = null;
    }
  };

  return { websocketRef, openSocket, closeSocket };
}
