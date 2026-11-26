// The community form as typed text and the input it stands for: a sample filled into the form, and the form
// checked with the community schema, each problem tied to the field that caused it.
import { communityInputSchema } from '../../features/community/schemas.js';
import type { CommunityInput } from '../../features/community/types.js';

/** A generator choice, none meaning there is no generator. */
export type GeneratorChoice = 'none' | 'diesel' | 'gas' | 'unknown';

/** The form as typed. Numbers and times stay text until the form is sent. */
export interface CommunityForm {
  readonly kind: CommunityInput['kind'];
  readonly count: string;
  readonly children: string;
  readonly olderAdults: string;
  readonly outdoorStaff: string;
  readonly generator: GeneratorChoice;
  readonly hours: string;
  readonly kva: string;
  readonly wasteBurning: CommunityInput['wasteBurning'];
  readonly vehicles: string;
  readonly idleMinutes: string;
  readonly assembly: string;
  readonly periods: readonly { readonly start: string; readonly minutes: string }[];
}

/** A field of the form that can carry an error. */
export type FormKey =
  | 'count'
  | 'children'
  | 'olderAdults'
  | 'outdoorStaff'
  | 'hours'
  | 'kva'
  | 'vehicles'
  | 'idleMinutes'
  | 'assembly'
  | 'periods';

/** The empty form of a housing society. */
export const EMPTY_FORM: CommunityForm = {
  kind: 'housing_society',
  count: '',
  children: '',
  olderAdults: '',
  outdoorStaff: '',
  generator: 'none',
  hours: '',
  kva: '',
  wasteBurning: 'never',
  vehicles: '',
  idleMinutes: '',
  assembly: '',
  periods: [],
};

const text = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);
const number = (value: string): number | null => (value.trim() === '' ? null : Number(value));

function sourcesFrom({ generator, gateIdling }: CommunityInput): Partial<CommunityForm> {
  return {
    generator: generator?.fuel ?? 'none',
    hours: text(generator?.hoursPerDay),
    kva: text(generator?.kva),
    vehicles: text(gateIdling?.vehiclesPerDay),
    idleMinutes: text(gateIdling?.idleMinutes),
  };
}

/** A sample, or any input, as the form shows it. */
export function formFrom(input: CommunityInput): CommunityForm {
  return {
    ...EMPTY_FORM,
    ...sourcesFrom(input),
    kind: input.kind,
    count: text(input.kind === 'school' ? input.pupils : input.homes),
    children: text(input.children),
    olderAdults: text(input.olderAdults),
    outdoorStaff: text(input.outdoorStaff),
    wasteBurning: input.wasteBurning,
    assembly: input.assembly ?? '',
    periods: input.outdoorPeriods.map((period) => ({
      start: period.start,
      minutes: String(period.durationMinutes),
    })),
  };
}

function draft(form: CommunityForm): Record<string, unknown> {
  const school = form.kind === 'school';
  return {
    kind: form.kind,
    homes: school ? null : number(form.count),
    pupils: school ? number(form.count) : null,
    generator:
      form.generator === 'none'
        ? null
        : { hoursPerDay: number(form.hours), kva: number(form.kva), fuel: form.generator },
    wasteBurning: form.wasteBurning,
    gateIdling:
      form.vehicles.trim() === ''
        ? null
        : { vehiclesPerDay: number(form.vehicles), idleMinutes: number(form.idleMinutes) },
    assembly: school && form.assembly !== '' ? form.assembly : null,
    outdoorPeriods: form.periods.map((period) => ({
      start: period.start,
      durationMinutes: number(period.minutes),
    })),
    ...(school ? {} : { children: number(form.children), olderAdults: number(form.olderAdults) }),
    outdoorStaff: number(form.outdoorStaff),
  };
}

const KEY_OF: ReadonlyMap<string, FormKey> = new Map<string, FormKey>([
  ['homes', 'count'],
  ['pupils', 'count'],
  ['children', 'children'],
  ['olderAdults', 'olderAdults'],
  ['outdoorStaff', 'outdoorStaff'],
  ['hoursPerDay', 'hours'],
  ['kva', 'kva'],
  ['vehiclesPerDay', 'vehicles'],
  ['idleMinutes', 'idleMinutes'],
  ['assembly', 'assembly'],
  ['outdoorPeriods', 'periods'],
]);

/** The form field a schema problem belongs to: the last named part of its path, or the count for the whole form. */
function keyOf(path: readonly PropertyKey[]): FormKey {
  return path.reduce<FormKey>((found, part) => KEY_OF.get(String(part)) ?? found, 'count');
}

/** The input the form stands for, or the fields that need a look. A problem with the whole form is the count's. */
export function readForm(form: CommunityForm): { input: CommunityInput } | { problems: FormKey[] } {
  const parsed = communityInputSchema.safeParse(draft(form));
  return parsed.success
    ? { input: parsed.data }
    : { problems: [...new Set(parsed.error.issues.map((issue) => keyOf(issue.path)))] };
}
