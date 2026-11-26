// Ledger primitives: a slot of the day, an entry with its time and sums, leader rows and a double-ruled total.
// They only lay out what they are given; every figure and word comes in through props.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Language } from '../../lib/types.js';

/** Props of a slot: its heading, the hours it covers, a short air line and its entries. */
export interface LedgerSlotProps {
  readonly title: string;
  readonly hours: string;
  readonly children: ReactNode;
  readonly air?: ReactNode;
}

/** A section of the day with an h2 and an ordered list of entries. */
export function LedgerSlot({ title, hours, children, air }: LedgerSlotProps): ReactElement {
  const headingId = useId();
  return (
    <section className="slot" aria-labelledby={headingId}>
      <div className="slot-head">
        <h2 id={headingId}>{title}</h2>
        <span className="hours fig">{hours}</span>
        {air === undefined ? null : <span className="air">{air}</span>}
      </div>
      <ol className="ledger">{children}</ol>
    </section>
  );
}

/** One sum beside an entry: a figure with its range, or none with the reason there is no figure. */
export interface SumRow {
  readonly label: ReactNode;
  readonly figure?: ReactNode;
  readonly range?: ReactNode;
  readonly none?: ReactNode;
}

/** Props of leader rows. calc draws a ruled column of sums; total sits last on a double rule. */
export interface LeaderRowsProps {
  readonly rows: readonly SumRow[];
  readonly kind?: 'sums' | 'calc';
  readonly total?: SumRow;
}

function SumCells({ row }: { readonly row: SumRow }): ReactElement {
  return (
    <>
      <dt>{row.label}</dt>
      <dd>
        {row.figure === undefined ? null : <span className="fig">{row.figure}</span>}
        {row.range === undefined ? null : <span className="range">{row.range}</span>}
        {row.none === undefined ? null : <span className="none">{row.none}</span>}
      </dd>
    </>
  );
}

/** Leader rows: label, dotted leader, sum. Beside an entry, or as a column of sums with a total. */
export function LeaderRows({ rows, kind = 'sums', total }: LeaderRowsProps): ReactElement {
  return (
    <dl className={`leaders ${kind}`}>
      {rows.map((row, index) => (
        <div key={index}>
          <SumCells row={row} />
        </div>
      ))}
      {total === undefined ? null : (
        <div className="total">
          <SumCells row={total} />
        </div>
      )}
    </dl>
  );
}

/** Props of an entry. moved carries the new time and strikes the old one through; lang marks Hindi text. */
export interface LedgerEntryProps {
  readonly time: ReactNode;
  readonly fixity: ReactNode;
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly who?: ReactNode;
  readonly moved?: ReactNode;
  readonly sums?: readonly SumRow[];
  readonly more?: ReactNode;
  readonly lang?: Language;
}

/** One line of the day: time column, what to do and why, the sums, then trade-offs and the working below. */
export function LedgerEntry(props: LedgerEntryProps): ReactElement {
  const { time, fixity, title, children, who, moved, sums, more, lang } = props;
  return (
    <li className={moved === undefined ? 'entry' : 'entry moved'} lang={lang}>
      <div className="when">
        <span className="t">{time}</span>
        <span className="fixity">{fixity}</span>
      </div>
      <div className="what">
        <h3>{title}</h3>
        {who === undefined ? null : <p className="who">{who}</p>}
        {moved === undefined ? null : <p className="carry">{moved}</p>}
        {children}
      </div>
      {sums === undefined ? null : <LeaderRows rows={sums} />}
      {more === undefined ? null : <div className="more">{more}</div>}
    </li>
  );
}

/** One row of a totals table. */
export interface TotalRow {
  readonly label: ReactNode;
  readonly value: ReactNode;
}

/** Props of a totals table: a caption, the rows and the total that sits on the double rule. */
export interface TotalTableProps {
  readonly caption: ReactNode;
  readonly rows: readonly TotalRow[];
  readonly total: TotalRow;
  readonly note?: ReactNode;
}

/** The reckoning: a real table whose last row is the total, double ruled as in an account book. */
export function TotalTable({ caption, rows, total, note }: TotalTableProps): ReactElement {
  return (
    <div className="reckon">
      <table>
        <caption>{caption}</caption>
        <tbody>
          {[...rows, total].map((row, index) => (
            <tr key={index} className={index === rows.length ? 'total' : undefined}>
              <th scope="row">{row.label}</th>
              <td className="num">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note === undefined ? null : <p className="note">{note}</p>}
    </div>
  );
}
