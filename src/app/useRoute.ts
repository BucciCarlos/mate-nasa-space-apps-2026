import { useLayoutEffect, useState } from 'react';
import type { Route } from '../state/types';
import { publicHash, publicRoute } from './publicRoutes';

function current(): Route {
  return publicRoute(window.location.hash);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current);
  useLayoutEffect(() => {
    const onChange = () => {
      const next = current();
      const canonical = publicHash(window.location.hash);
      // Replace this history entry: Back never re-enters an alias or paints the M1 shell.
      if (window.location.hash !== canonical) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${canonical}`);
      setRoute(next);
    };
    onChange();
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
