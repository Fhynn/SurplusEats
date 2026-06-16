"use client";

import { useCallback, useEffect, useRef } from "react";

type PollReason = "interval" | "focus" | "online" | "visibility";

type UseRealtimePollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
  leading?: boolean;
  onPoll: (reason: PollReason) => Promise<void> | void;
};

function canPollNow() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  return true;
}

export function useRealtimePolling({
  enabled = true,
  intervalMs = 12000,
  leading = false,
  onPoll,
}: UseRealtimePollingOptions) {
  const onPollRef = useRef(onPoll);
  const isPollingRef = useRef(false);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  const poll = useCallback(
    (reason: PollReason) => {
      if (!enabled || isPollingRef.current || !canPollNow()) {
        return;
      }

      isPollingRef.current = true;

      Promise.resolve(onPollRef.current(reason))
        .catch(() => undefined)
        .finally(() => {
          isPollingRef.current = false;
        });
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (leading) {
      poll("interval");
    }

    const intervalId = window.setInterval(() => {
      poll("interval");
    }, intervalMs);

    const handleFocus = () => poll("focus");
    const handleOnline = () => poll("online");
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll("visibility");
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, leading, poll]);
}
