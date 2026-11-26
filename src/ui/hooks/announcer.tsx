// The page's one polite live region. Views announce results and plan updates through it without moving focus.
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

type Announce = (text: string) => void;

const AnnounceContext = createContext<Announce>(() => undefined);

/** Provides announce() to everything inside and renders the live region after it. */
export function Announcer({ children }: { readonly children?: ReactNode }): ReactElement {
  const [message, setMessage] = useState({ id: 0, text: '' });
  const announce = useCallback((text: string) => {
    setMessage((current) => ({ id: current.id + 1, text }));
  }, []);
  return (
    <AnnounceContext value={announce}>
      {children}
      <div className="vh" role="status">
        <p key={message.id}>{message.text}</p>
      </div>
    </AnnounceContext>
  );
}

/** Returns announce(text). Each call is a new node, so saying the same words twice is read twice. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}
