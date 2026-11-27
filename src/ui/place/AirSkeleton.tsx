// The air card while the air is read, or while the card's own code loads: a sentence and grey bars in its shape.
import { useId } from 'react';
import type { ReactElement } from 'react';
import { Skeleton } from '../components/Progress.js';
import { AIR } from './strings.js';

/** The waiting card. Screen readers hear the sentence; the bars are hidden from them. */
export function AirSkeleton({ where }: { readonly where: string }): ReactElement {
  const id = useId();
  return (
    <article className="slip" aria-busy="true" aria-labelledby={id}>
      <p className="status" id={id}>
        {AIR.loading(where)}
      </p>
      <div aria-hidden="true">
        <Skeleton size="w80" tall />
        <Skeleton size="w60" />
        <div className="reading">
          <Skeleton size="big" />
          <div>
            <Skeleton size="w60" tall />
            <Skeleton size="w80" />
          </div>
        </div>
        <Skeleton size="w45" />
        <Skeleton size="w80" />
        <Skeleton size="w60" />
      </div>
    </article>
  );
}
