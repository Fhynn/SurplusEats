"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PollReason = "interval" | "focus" | "online" | "visibility" | "manual";

type UseRealtimePollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
  leading?: boolean;
  minIntervalMs?: number;
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
  minIntervalMs = 2500,
  onPoll,
}: UseRealtimePollingOptions) {
  const onPollRef = useRef(onPoll);
  const isPollingRef = useRef(false);
  const lastPollStartedAtRef = useRef(0);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  const poll = useCallback(
    (reason: PollReason) => {
      if (!enabled || isPollingRef.current || !canPollNow()) {
        return;
      }

      const now = Date.now();

      if (
        reason !== "manual" &&
        lastPollStartedAtRef.current &&
        now - lastPollStartedAtRef.current < minIntervalMs
      ) {
        return;
      }

      lastPollStartedAtRef.current = now;
      isPollingRef.current = true;
      setIsPolling(true);

      Promise.resolve(onPollRef.current(reason))
        .catch(() => undefined)
        .finally(() => {
          setLastSyncedAt(new Date());
          isPollingRef.current = false;
          setIsPolling(false);
        });
    },
    [enabled, minIntervalMs],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const leadingTimeoutId = leading
      ? window.setTimeout(() => poll("interval"), 0)
      : null;

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
      if (leadingTimeoutId !== null) {
        window.clearTimeout(leadingTimeoutId);
      }

      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, leading, poll]);

  return {
    isPolling,
    lastSyncedAt,
    pollNow: () => poll("manual"),
  };
}
