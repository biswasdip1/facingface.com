import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref to attach to a DOM element and a boolean indicating
 * whether the element has entered the viewport (with optional rootMargin).
 *
 * Once the element has been seen, `hasBeenVisible` stays true permanently
 * so images don't unload when scrolled away.
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
): [React.RefObject<Element | null>, boolean] {
  const ref = useRef<Element>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0, ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBeenVisible, options]);

  return [ref, hasBeenVisible];
}
