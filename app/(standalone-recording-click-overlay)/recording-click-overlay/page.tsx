"use client";

import { useEffect, useMemo, useState } from "react";
import { isTauri } from "@/lib/native/utils";

type ClickEventPayload = {
  x: number;
  y: number;
  timestamp?: number;
};

type Ripple = {
  id: string;
  x: number;
  y: number;
};

const RIPPLE_TTL_MS = 600;

export default function RecordingClickOverlayPage() {
  const [visible, setVisible] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;
    let unlistenClick: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event");

      unlistenShow = await listen("recording-click-highlight://show", () => {
        setVisible(true);
      });

      unlistenHide = await listen("recording-click-highlight://hide", () => {
        setVisible(false);
        setRipples([]);
      });

      unlistenClick = await listen<ClickEventPayload>(
        "recording-click-highlight://click",
        (event) => {
          const { x, y } = event.payload;
          const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const next = { id, x, y };
          setRipples((prev) => [...prev, next]);

          window.setTimeout(() => {
            setRipples((prev) => prev.filter((item) => item.id !== id));
          }, RIPPLE_TTL_MS);
        }
      );
    };

    setup();

    return () => {
      unlistenShow?.();
      unlistenHide?.();
      unlistenClick?.();
    };
  }, []);

  const containerStyle = useMemo(
    () => ({
      position: "fixed" as const,
      inset: 0,
      pointerEvents: "none" as const,
      opacity: visible ? 1 : 0,
      transition: "opacity 120ms ease-out",
      background: "transparent",
    }),
    [visible]
  );

  return (
    <div style={containerStyle}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: "fixed",
            left: ripple.x - 22,
            top: ripple.y - 22,
            width: 44,
            height: 44,
            borderRadius: 9999,
            border: "3px solid rgba(255, 87, 34, 0.92)",
            boxShadow: "0 0 0 2px rgba(255, 171, 145, 0.26)",
            animation: "recording-click-ripple 600ms ease-out forwards",
          }}
        />
      ))}

      <style jsx>{`
        @keyframes recording-click-ripple {
          0% {
            transform: scale(0.35);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.85);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
