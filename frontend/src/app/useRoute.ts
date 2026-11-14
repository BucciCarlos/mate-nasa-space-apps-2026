import { useEffect, useState } from 'react';
import type { Route } from '../state/types';
import { parseRoute } from './routes';

function current(): Route {
  return parseRoute(window.location.hash) ?? { view: 'notfound' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
