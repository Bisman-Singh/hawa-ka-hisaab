// What the model returns when it answers a follow-up question. The calculator calls are recorded in the trace.
import { z } from 'zod';
import { boundedText } from '../../lib/schemas/common.js';

/** The model's answer. Every numeral in text must match a fact sent or a calculator result. */
export const askReplySchema = z.strictObject({
  text: boundedText(2000),
});
