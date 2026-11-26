// Plain names for the household schema's values, as the form shows them.
import type { Activity, ActivityKind, AgeGroup, Fuel, Home } from '../../features/household/types.js';
import type { IndoorSource, MemberFlag, Room, TravelMode } from '../../features/household/types.js';

/** Plain names for the schema's values. */
export const OPTIONS = {
  age: {
    infant: 'Under 1',
    child: '1 to 12',
    teen: '13 to 17',
    adult: '18 to 59',
    older_adult: '60 and over',
  },
  flag: {
    pregnant: 'Pregnant',
    asthma_or_lung: 'Asthma or other lung condition',
    heart_condition: 'Heart condition',
    outdoor_worker: 'Works outdoors',
  },
  kind: {
    commute: 'Commute to work',
    school_run: 'School run',
    outdoor_exercise: 'Exercise outdoors',
    outdoor_play: 'Play outdoors',
    outdoor_work: 'Work outdoors',
    errand: 'Errand or market',
    social: 'Visit or outing',
    other: 'Something else',
  },
  setting: { outdoor: 'Outdoors', indoor: 'Indoors', in_transit: 'On the way' },
  timing: { fixed: 'Fixed', flexible: 'Can move' },
  travel: {
    none: 'No travel',
    walk: 'Walk',
    cycle: 'Cycle',
    bus: 'Bus',
    metro: 'Metro',
    suburban_rail: 'Local train',
    auto_rickshaw: 'Auto rickshaw',
    two_wheeler: 'Scooter or motorcycle',
    car: 'Car',
    taxi: 'Taxi or cab',
    school_bus: 'School bus',
  },
  fuel: { petrol: 'Petrol', diesel: 'Diesel', cng: 'CNG', electric: 'Electric', unknown: 'Not known' },
  cooking: {
    lpg: 'LPG',
    piped_gas: 'Piped gas',
    induction: 'Induction or electric',
    biomass: 'Wood, dung or crop waste',
    kerosene: 'Kerosene',
    coal: 'Coal',
    unknown: 'Not known',
  },
  source: {
    mosquito_coil: 'Mosquito coil',
    incense: 'Incense',
    smoking: 'Smoking',
    solid_fuel: 'Wood or coal fire',
  },
  room: {
    bedroom: 'Bedroom',
    living: 'Living room',
    kitchen: 'Kitchen',
    study: 'Study',
    other: 'Other room',
  },
} satisfies {
  age: Record<AgeGroup, string>;
  flag: Record<MemberFlag, string>;
  kind: Record<ActivityKind, string>;
  setting: Record<Activity['setting'], string>;
  timing: Record<Activity['timing'], string>;
  travel: Record<TravelMode | 'none', string>;
  fuel: Record<Fuel, string>;
  cooking: Record<Home['cookingFuel'], string>;
  source: Record<IndoorSource, string>;
  room: Record<Room['kind'], string>;
};
