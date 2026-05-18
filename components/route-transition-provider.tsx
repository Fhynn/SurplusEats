"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LoadingScreen } from "@/components/loading-screen";

type RouteTransitionContextValue = {
  isRouteLoading: boolean;
  startRouteLoading: (href?: string) => void;
};

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

const minVisibleMs = 900;
const maxVisibleMs = 5000;

function createPathKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function getCurrentPathKey() {
  return createPathKey(
    window.location.pathname,
    window.location.search.replace(/^\?/, ""),
  );
}

function getTargetPathKey(href: string) {
  const targetUrl = new URL(href, window.location.href);

  if (targetUrl.origin !== window.location.origin) {
    return null;
  }

  return createPathKey(targetUrl.pathname, targetUrl.searchParams.toString());
}

function shouldStartForAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) {
    return false;
  }

  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  return true;
}

export function RouteTransitionProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const isRouteLoadingRef = useRef(false);
  const currentPathKeyRef = useRef(pathname);
  const startedFromPathKeyRef = useRef(pathname);
  const visibleSinceRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    if (deferredTimeoutRef.current) {
      clearTimeout(deferredTimeoutRef.current);
      deferredTimeoutRef.current = null;
    }
  }, []);

  const stopRouteLoading = useCallback(() => {
    const elapsed = Date.now() - visibleSinceRef.current;
    const remainingMs = Math.max(minVisibleMs - elapsed, 0);

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      clearTimers();
      isRouteLoadingRef.current = false;
      setIsRouteLoading(false);
    }, remainingMs);
  }, [clearTimers]);

  const beginRouteLoading = useCallback(
    (fromPathKey: string) => {
      clearTimers();
      startedFromPathKeyRef.current = fromPathKey;
      visibleSinceRef.current = Date.now();
      isRouteLoadingRef.current = true;
      setIsRouteLoading(true);
      safetyTimeoutRef.current = setTimeout(() => {
        isRouteLoadingRef.current = false;
        setIsRouteLoading(false);
      }, maxVisibleMs);
    },
    [clearTimers],
  );

  const startRouteLoading = useCallback(
    (href?: string) => {
      const currentPathKey = getCurrentPathKey();
      currentPathKeyRef.current = currentPathKey;

      if (href) {
        const targetPathKey = getTargetPathKey(href);

        if (!targetPathKey || targetPathKey === currentPathKey) {
          return;
        }
      }

      beginRouteLoading(currentPathKey);
    },
    [beginRouteLoading],
  );

  const settleRouteLoading = useCallback(() => {
    const currentPathKey = getCurrentPathKey();
    currentPathKeyRef.current = currentPathKey;

    if (
      isRouteLoadingRef.current &&
      currentPathKey !== startedFromPathKeyRef.current
    ) {
      stopRouteLoading();
    }
  }, [stopRouteLoading]);

  useEffect(() => {
    settleRouteLoading();
  }, [pathname, settleRouteLoading]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!shouldStartForAnchor(anchor)) {
        return;
      }

      startRouteLoading(anchor.href);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [startRouteLoading]);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(data, unused, url) {
      const fromPathKey = getCurrentPathKey();
      const targetPathKey = url ? getTargetPathKey(String(url)) : null;

      const result = originalPushState(data, unused, url);

      if (targetPathKey && targetPathKey !== fromPathKey) {
        deferredTimeoutRef.current = setTimeout(() => {
          if (!isRouteLoadingRef.current) {
            beginRouteLoading(fromPathKey);
          }

          settleRouteLoading();
        }, 0);
      } else {
        deferredTimeoutRef.current = setTimeout(settleRouteLoading, 0);
      }

      return result;
    };

    window.history.replaceState = function replaceState(data, unused, url) {
      const result = originalReplaceState(data, unused, url);

      deferredTimeoutRef.current = setTimeout(settleRouteLoading, 0);

      return result;
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [beginRouteLoading, settleRouteLoading]);

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(
    () => ({
      isRouteLoading,
      startRouteLoading,
    }),
    [isRouteLoading, startRouteLoading],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      {isRouteLoading ? (
        <LoadingScreen
          title="Memuat halaman..."
          description="Sebentar, ResQFood sedang membuka halaman berikutnya."
        />
      ) : null}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    return {
      isRouteLoading: false,
      startRouteLoading: () => {},
    };
  }

  return context;
}
