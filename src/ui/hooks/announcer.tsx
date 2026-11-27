// The page's one polite live region. Views announce results and plan updates through it without moving focus, each
// announcement marked with its language so Hindi is read as Hindi.
import { createContext, type ReactElement, type ReactNode, useCallback, useContext, useState } from 'react';
import type { Language } from '../../lib/types.js';

type Announce = (text: string, language?: Language) => void;

const AnnounceContext = createContext<Announce>(() => undefined);

/** Provides announce() to everything inside and renders the live region after it. */
export function Announcer({ children }: { readonly children?: ReactNode }): ReactElement {
  const [message, setMessage] = useState<{ id: number; text: string; language: Language }>({
    id: 0,
    text: '',
    language: 'en',
  });
  const announce = useCallback<Announce>((text, language = 'en') => {
    setMessage((current) => ({ id: current.id + 1, text, language }));
  }, []);
  return (
    <AnnounceContext value={announce}>
      {children}
      <div className="vh" role="status">
        <p key={message.id} lang={message.language}>
          {message.text}
        </p>
      </div>
    </AnnounceContext>
  );
}

/** Returns announce(text, language). Each call is a new node, so saying the same words twice is read twice. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}
