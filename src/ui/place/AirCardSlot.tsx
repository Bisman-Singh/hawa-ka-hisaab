// Where the air card goes: the card loads on demand, so the facts it cites stay out of the first screen's bundle,
// and the waiting card stands in until its code arrives.
import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import type { AirCardProps } from './AirCard.js';
import { AirSkeleton } from './AirSkeleton.js';

const AirCard = lazy(() => import('./AirCard.js').then((module) => ({ default: module.AirCard })));

/** The air card for a place, loaded on demand, with the waiting card meanwhile. */
export function AirCardSlot(props: AirCardProps): ReactElement {
  return (
    <Suspense fallback={<AirSkeleton where={props.where} />}>
      <AirCard {...props} />
    </Suspense>
  );
}
