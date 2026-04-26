import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * useInfiniteScroll
 * @param items The full array of items to paginate
 * @param initialCount Number of items to show initially
 * @param step Number of items to add on each intersection
 */
export function useInfiniteScroll<T>(items: T[], initialCount: number = 10, step: number = 5) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count when items change significantly (e.g. filter change)
  // We use the length as a heuristic, but ideally we'd use a dependency from the caller
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items.length, initialCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + step, items.length));
        }
      },
      { 
        rootMargin: '100px', // Start loading before it's actually in view
        threshold: 0.1 
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [items.length, visibleCount, step]);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  return { 
    visibleItems, 
    visibleCount, 
    sentinelRef,
    hasMore: visibleCount < items.length
  };
}
