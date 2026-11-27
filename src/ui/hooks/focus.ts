// Moves focus to an element by id after the next render, for content that appears after a click or a request.
import { useCallback, useEffect, useRef, useState } from 'react';

/** The id of each view's h1, where focus goes when a change leaves it nowhere. */
export const VIEW_TITLE = 'view-title';

/** Returns focusLater(id). The element with that id takes focus once the page has rendered the change. */
export function useFocusLater(): (id: string) => void {
  const [target, setTarget] = useState<{ readonly id: string; readonly turn: number } | null>(null);
  useEffect(() => {
    if (target !== null) {
      document.getElementById(target.id)?.focus();
    }
  }, [target]);
  return useCallback((id: string) => {
    setTarget((current) => ({ id, turn: (current?.turn ?? 0) + 1 }));
  }, []);
}

/**
 * Puts focus on a view's heading when key changes and the control that had focus is gone, as when a choice or a
 * retry replaces the button that was pressed. Focus that sits on a live control is left alone. target names
 * another element to take focus instead of the heading.
 */
export function useRescueFocus(key: string, target: string = VIEW_TITLE): void {
  const seen = useRef(key);
  useEffect(() => {
    if (seen.current !== key) {
      seen.current = key;
      if (document.activeElement === document.body) {
        document.getElementById(target)?.focus();
      }
    }
  }, [key, target]);
}
