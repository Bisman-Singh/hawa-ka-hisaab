// Waiting states: skeleton lines in pencil grey, and the steps of a long piece of work as they finish.
import type { ReactElement } from 'react';
import { UI } from './words.js';

/** Sizes of a skeleton line, as a share of the width, or a big figure or a sum. */
export type SkeletonSize = 'w30' | 'w45' | 'w60' | 'w80' | 'big' | 'num';

/** One skeleton line, hidden from screen readers. The container says it is busy and names what is loading. */
export function Skeleton({
  size,
  tall = false,
}: {
  readonly size: SkeletonSize;
  readonly tall?: boolean;
}): ReactElement {
  return <span className={tall ? `skel ${size} tall` : `skel ${size}`} aria-hidden="true" />;
}

/** One step of the work. now marks the step under way; steps not started are not listed yet. */
export interface ProgressStep {
  readonly label: string;
  readonly state: 'done' | 'now';
}

/** The steps in order, read out politely as each one changes. */
export function ProgressSteps({ steps }: { readonly steps: readonly ProgressStep[] }): ReactElement {
  return (
    <ol className="steps" aria-live="polite">
      {steps.map((step) => (
        <li key={step.label} className={step.state === 'now' ? 'now' : undefined}>
          <span className="st">{step.state === 'now' ? UI.now : UI.done}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
