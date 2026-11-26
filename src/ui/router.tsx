// Views by address: ?view=<id> names the view, so links can be shared and reloaded and the back button works.
// The hash stays free for in-page links such as the skip link. Each move asks the new view to focus its heading.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

/** The id of the first screen, which has no view parameter. */
export const HOME = 'home';

/** The view an address names. A missing or empty parameter means the first screen. */
export function viewFromSearch(search: string): string {
  const view = new URLSearchParams(search).get('view') ?? '';
  return view === '' ? HOME : view;
}

/** The link address of a view, relative to the page. */
export function hrefFor(view: string): string {
  return view === HOME ? './' : `?${new URLSearchParams({ view }).toString()}`;
}

/** The current view and how to move. moves counts moves since load; zero means focus stays where it is. */
export interface Route {
  readonly view: string;
  readonly moves: number;
  readonly navigate: (view: string) => void;
}

const RouteContext = createContext<Route>({ view: HOME, moves: 0, navigate: () => undefined });

/** Reads the view from the address, follows the back and forward buttons and adds history entries on moves. */
export function RouterProvider({ children }: { readonly children?: ReactNode }): ReactElement {
  const [place, setPlace] = useState(() => ({ view: viewFromSearch(window.location.search), moves: 0 }));
  useEffect(() => {
    const onPop = (): void => {
      setPlace((current) => ({ view: viewFromSearch(window.location.search), moves: current.moves + 1 }));
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);
  const navigate = useCallback((view: string) => {
    window.history.pushState(null, '', hrefFor(view));
    setPlace((current) => ({ view, moves: current.moves + 1 }));
  }, []);
  const route = useMemo(() => ({ ...place, navigate }), [place, navigate]);
  return <RouteContext value={route}>{children}</RouteContext>;
}

/** The current view and navigate(). Outside the provider it reports the first screen and does nothing. */
export function useRoute(): Route {
  return useContext(RouteContext);
}
