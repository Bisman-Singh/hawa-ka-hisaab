// Types for the planner feature, inferred from its schemas.
import type { z } from 'zod';
import type { airBasisSchema, planRequestSchema, planResponseSchema } from './contract.js';
import type { actionKindSchema, actionTextSchema, alternativeSchema } from './schemas.js';
import type { candidateActionSchema, indoorStepSchema, planItemSchema } from './schemas.js';
import type { planSchema, slotSchema, whatIfSchema } from './schemas.js';
import type { planWordingSchema } from './wording.js';

/** A part of the day. */
export type Slot = z.infer<typeof slotSchema>;

/** What an action does. */
export type ActionKind = z.infer<typeof actionKindSchema>;

/** A what-if toggle. */
export type WhatIf = z.infer<typeof whatIfSchema>;

/** Template text for an action. */
export type ActionText = z.infer<typeof actionTextSchema>;

/** An action computed by code. */
export type CandidateAction = z.infer<typeof candidateActionSchema>;

/** A plan item as shown. */
export type PlanItem = z.infer<typeof planItemSchema>;

/** One indoor air step. */
export type IndoorStep = z.infer<typeof indoorStepSchema>;

/** An "instead of X, do Y" pair. */
export type Alternative = z.infer<typeof alternativeSchema>;

/** The plan for one day. */
export type Plan = z.infer<typeof planSchema>;

/** The air a plan was built on. */
export type AirBasis = z.infer<typeof airBasisSchema>;

/** Body of POST /api/plan. */
export type PlanRequest = z.infer<typeof planRequestSchema>;

/** Body of the plan response. */
export type PlanResponse = z.infer<typeof planResponseSchema>;

/** The model's wording reply for a plan. */
export type PlanWording = z.infer<typeof planWordingSchema>;
