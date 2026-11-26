// Gate step: fails when the build in dist is over the size budget.
import { BUDGET, describeSizes, measureBundle, overBudget } from './bundle-size.js';

const sizes = measureBundle('dist');
const problems = overBudget(sizes, BUDGET);
console.log(`Bundle: ${describeSizes(sizes)}`);
for (const problem of problems) {
  console.error(`Over budget: ${problem}`);
}
process.exitCode = problems.length > 0 ? 1 : 0;
