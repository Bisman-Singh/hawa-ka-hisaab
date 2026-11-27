// Moves focus to an element by id after the next render, for content that appears after a click or a request.
import { useCallback, useEffect, useState } from 'react';

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
