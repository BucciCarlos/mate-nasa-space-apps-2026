import { useSyncExternalStore } from 'react';
import { fd30Theme } from './fd30Theme';

export function useFd30Theme() {
  const snapshot = useSyncExternalStore(fd30Theme.subscribe, fd30Theme.getSnapshot, fd30Theme.getSnapshot);
  return { ...snapshot, setPreference: fd30Theme.set, toggle: fd30Theme.toggle };
}
