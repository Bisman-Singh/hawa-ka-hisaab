// Every hour of the forecast strip and its value as a real table, for screen readers.
import type { ReactElement } from 'react';
import { clockOf } from '../../lib/time.js';
import type { StripHour } from './StripChart.js';
import { STRIP } from './words.js';

/** The table, inside a box that is hidden for sight, since a hidden table still takes its full width. */
export function HourTable({ hours }: { readonly hours: readonly StripHour[] }): ReactElement {
  return (
    <div className="vh">
      <table>
        <caption>{STRIP.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{STRIP.hour}</th>
            <th scope="col">{STRIP.pm25}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour.hour}>
              <td>{clockOf(hour.hour * 60)}</td>
              <td>{hour.pm25}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
