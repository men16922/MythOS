import { useEffect, useRef } from "react";
import { getWebSocketUrl } from "../api";
import type { WebSocketMessage } from "../types";

type UseGameSocketArgs = {
  // Called with each parsed inbound frame; the caller owns the type switch.
  onMessage: (msg: WebSocketMessage) => void;
  // Fired after an *unexpected*-close auto-reconnect reopens the socket, so the
  // caller can re-send an in-flight request that was lost mid-stream (the choose
  // whose snapshot frame never arrived). Not called for the initial open or an
  // explicit reconnect via ensureOpenSocket.
  onReconnected?: (ws: WebSocket) => void;
  logToConsole: (line: string) => void;
};

const MAX_RECONNECT_ATTEMPTS = 5;
// Server/proxy idle timeouts drop the socket around ~45s of silence (long
// image turns, reading pauses). A 20s ping keeps well under that window.
const KEEPALIVE_INTERVAL_MS = 20_000;

/**
 * Owns the gameplay WebSocket lifecycle: connect, parse inbound frames (handing
 * each to `onMessage`), and exponential-backoff auto-reconnect on unexpected
 * close. Exposes the live `websocketRef` for sending plus `openSocket`/
 * `ensureOpenSocket`/`closeSocket`. Each open socket sends a `{"event":"ping"}`
 * keepalive every 20s (the server answers `{"type":"pong"}`, swallowed here —
 * transport-level, never reaches `onMessage`). `closeSocket` marks the close
 * explicit so the reconnect loop stays quiet.
 */
export function useGameSocket({ onMessage, onReconnected, logToConsole }: UseGameSocketArgs) {
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExplicitCloseRef = useRef(false);
  // Read the latest onReconnected via a ref so the reconnect closure captured in
  // an old socket's onclose still calls the current handler.
  const onReconnectedRef = useRef(onReconnected);
  useEffect(() => {
    onReconnectedRef.current = onReconnected;
  });

  const openSocket = (): Promise<WebSocket> => {
    isExplicitCloseRef.current = false;
    return new Promise((resolve, reject) => {
      const url = getWebSocketUrl();
      logToConsole("WS 소켓 연결 시도: " + url);
      const ws = new WebSocket(url);
      websocketRef.current = ws;
      let keepalive: ReturnType<typeof setInterval> | null = null;

      ws.onopen = () => {
        logToConsole("WS 소켓 연결 완료.");
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts on success
        keepalive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "ping" }));
          }
        }, KEEPALIVE_INTERVAL_MS);
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
          if (msg.type === "pong") return; // keepalive answer, transport-level
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
        if (keepalive) {
          clearInterval(keepalive);
          keepalive = null;
        }
        // A newer socket may already have superseded this one (explicit
        // reconnect via ensureOpenSocket) — don't null it out or re-reconnect.
        if (websocketRef.current !== ws) return;
        logToConsole("WS 연결 종료.");
        websocketRef.current = null;

        // Auto reconnect logic
        if (!isExplicitCloseRef.current) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(5000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            logToConsole(`WS 연결이 유실되었습니다. ${delay / 1000}초 후 재접속을 시도합니다. (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              openSocket()
                .then((sock) => onReconnectedRef.current?.(sock))
                .catch((err) => {
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

  // Resolve with an OPEN socket: the current one if live, otherwise cancel any
  // pending backoff timer and reconnect immediately (a click should not wait
  // out the backoff). The superseded socket is closed; its onclose is inert
  // thanks to the identity guard above.
  const ensureOpenSocket = (): Promise<WebSocket> => {
    const current = websocketRef.current;
    if (current && current.readyState === WebSocket.OPEN) {
      return Promise.resolve(current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (current) {
      websocketRef.current = null;
      try {
        current.close();
      } catch {
        /* already dead */
      }
    }
    return openSocket();
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

  return { websocketRef, openSocket, ensureOpenSocket, closeSocket };
}
