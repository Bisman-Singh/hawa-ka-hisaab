// Plain names for the household schema's values, as the form shows them, from options.json. Only the form loads it.
import type {
  Activity,
  ActivityKind,
  AgeGroup,
  Fuel,
  Home,
  IndoorSource,
  MemberFlag,
  Room,
  TravelMode,
} from '../../features/household/types.js';
import NAMES from './options.json' with { type: 'json' };

type Names<K extends string> = Readonly<Record<K, string>>;

/** Plain names for the schema's values, one table per field. */
export const OPTIONS: {
  readonly age: Names<AgeGroup>;
  readonly flag: Names<MemberFlag>;
  readonly kind: Names<ActivityKind>;
  readonly setting: Names<Activity['setting']>;
  readonly timing: Names<Activity['timing']>;
  readonly travel: Names<TravelMode | 'none'>;
  readonly fuel: Names<Fuel>;
  readonly cooking: Names<Home['cookingFuel']>;
  readonly source: Names<IndoorSource>;
  readonly room: Names<Room['kind']>;
} = NAMES;
