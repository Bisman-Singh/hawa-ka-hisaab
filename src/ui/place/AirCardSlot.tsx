// Where the air card goes: it loads on demand, with the waiting card meanwhile, and the slot takes focus when a
// retry replaces the button that was pressed.
import { lazy, type ReactElement, Suspense, useRef } from 'react';
import type { AirCardProps } from './AirCard.js';
import { AirSkeleton } from './AirSkeleton.js';
import { AIR } from './words.js';

const AirCard = lazy(() => import('./AirCard.js').then((module) => ({ default: module.AirCard })));

/** The air card for a place, loaded on demand, with the waiting card meanwhile. */
export function AirCardSlot(props: AirCardProps): ReactElement {
  const slot = useRef<HTMLDivElement>(null);
  const air = {
    ...props.air,
    retry: () => {
      props.air.retry();
      slot.current?.focus();
    },
  };
  return (
    <div ref={slot} tabIndex={-1} role="group" aria-label={AIR.heading}>
      <Suspense fallback={<AirSkeleton where={props.where} />}>
        <AirCard {...props} air={air} />
      </Suspense>
    </div>
  );
}
