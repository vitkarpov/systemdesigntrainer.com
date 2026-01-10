import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function BeaconController() {
  const location = useLocation();

  useEffect(() => {
    const beaconContainer = document.querySelector('#beacon-container');

    if (!beaconContainer) return;

    if (location.pathname === '/') {
      (beaconContainer as HTMLElement).style.display = 'block';
    } else {
      (beaconContainer as HTMLElement).style.display = 'none';
    }
  }, [location.pathname]);

  return null;
}
