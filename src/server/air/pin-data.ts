// The PIN table shipped as server data, loaded and checked once on first use. It is never in the browser bundle.
// The parts are listed one by one so the deploy step traces every file; see data/pin/SOURCE.txt.
import { buildPinTables } from '../../features/air/pin.js';
import type { PinDirectory, PinTables } from '../../features/air/types.js';

async function loadParts(): Promise<PinTables> {
  const [centres, labels, prefixes] = await Promise.all([
    Promise.all([
      import('../data/pin/centres-1.json', { with: { type: 'json' } }),
      import('../data/pin/centres-2.json', { with: { type: 'json' } }),
      import('../data/pin/centres-3.json', { with: { type: 'json' } }),
      import('../data/pin/centres-4.json', { with: { type: 'json' } }),
      import('../data/pin/centres-5.json', { with: { type: 'json' } }),
      import('../data/pin/centres-6.json', { with: { type: 'json' } }),
    ]),
    Promise.all([
      import('../data/pin/labels-1.json', { with: { type: 'json' } }),
      import('../data/pin/labels-2.json', { with: { type: 'json' } }),
      import('../data/pin/labels-3.json', { with: { type: 'json' } }),
      import('../data/pin/labels-4.json', { with: { type: 'json' } }),
      import('../data/pin/labels-5.json', { with: { type: 'json' } }),
      import('../data/pin/labels-6.json', { with: { type: 'json' } }),
      import('../data/pin/labels-7.json', { with: { type: 'json' } }),
      import('../data/pin/labels-8.json', { with: { type: 'json' } }),
    ]),
    import('../data/pin/prefixes.json', { with: { type: 'json' } }),
  ]);
  return buildPinTables({
    centres: centres.map((part) => part.default),
    labels: labels.map((part) => part.default),
    prefixes: prefixes.default,
  });
}

/** Builds the PIN directory. The first load reads and checks every part; later loads reuse the result. */
export function createPinDirectory(load: () => Promise<PinTables> = loadParts): PinDirectory {
  let tables: Promise<PinTables> | null = null;
  return {
    load: () => {
      tables ??= load();
      return tables;
    },
  };
}
