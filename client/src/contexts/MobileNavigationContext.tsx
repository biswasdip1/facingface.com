import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import {
  advanceMobileNavigationScroll,
  createMobileNavigationScrollState,
} from "@/lib/mobileNavigationPolicy";
import "@/components/mobile-navigation.css";

const MobileNavigationContext = createContext({
  hidden: false,
  setNavigationPinned: (_pinned: boolean) => {},
});

// Both site bars share one direction/threshold state. Only page scrolling is
// observed: chat histories, dialogs, carousels and flyout scrolling are separate.
export function MobileNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [location] = useLocation();
  const search = useSearch();
  const [hidden, setHidden] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pinnedRef = useRef(false);
  const scrollState = useRef(createMobileNavigationScrollState());
  const resetVisible = useCallback(() => {
    scrollState.current = createMobileNavigationScrollState(window.scrollY);
    setHidden(false);
  }, []);
  const setNavigationPinned = useCallback(
    (pinned: boolean) => {
      pinnedRef.current = pinned;
      resetVisible();
    },
    [resetVisible]
  );

  useEffect(() => {
    resetVisible();
  }, [location, search, resetVisible]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    let frame = 0;
    let focusTimer = 0;
    let previousWidth = window.innerWidth;
    let previousMobile = media.matches;
    const hasProtectedFocus = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        (active.matches("input, textarea, select, [contenteditable='true']") ||
          (!!active.closest(".ff-scroll-navigation") &&
            active.matches(":focus-visible")))
      );
    };
    const update = () => {
      frame = 0;
      if (
        !media.matches ||
        pinnedRef.current ||
        hasProtectedFocus() ||
        document.body.style.overflow === "hidden"
      ) {
        resetVisible();
        return;
      }
      const root = document.scrollingElement ?? document.documentElement;
      const maxPosition = Math.max(0, root.scrollHeight - root.clientHeight);
      scrollState.current = advanceMobileNavigationScroll(
        scrollState.current,
        window.scrollY,
        maxPosition
      );
      setHidden(scrollState.current.hidden);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      setMobile(media.matches);
      // Mobile browser toolbars change height during an ordinary swipe.
      // Only rotation/breakpoint changes or protected focus should reset it.
      if (
        previousWidth !== window.innerWidth ||
        previousMobile !== media.matches ||
        !media.matches ||
        hasProtectedFocus()
      )
        resetVisible();
      previousWidth = window.innerWidth;
      previousMobile = media.matches;
    };
    const onFocus = () => {
      if (hasProtectedFocus()) resetVisible();
    };
    const onBlur = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(resetVisible, 0);
    };
    onResize();
    resetVisible();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    media.addEventListener("change", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, [resetVisible]);

  return (
    <MobileNavigationContext.Provider
      value={{ hidden: mobile && hidden, setNavigationPinned }}
    >
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  return useContext(MobileNavigationContext);
}
