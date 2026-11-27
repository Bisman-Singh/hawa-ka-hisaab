// Tests for the ask box: an empty question is refused in place, an answer shows its calculator calls, a medical
// question gets the fixed reply marked as not sent to the model, the rules reply says why, failure and loading.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AskBox } from '../../../src/ui/ask/AskBox.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { sample } from '../../support/plan-fixtures.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import {
  announced,
  askAnswer,
  askMedical,
  askRules,
  DELHI,
  json,
  stubApi,
  sentBody,
} from '../plan/fixtures.js';

const renderAsk = () =>
  renderInApp(
    <Announcer>
      <AskBox household={sample('family-car-asthma')} location={DELHI} language="en" />
    </Announcer>,
  );

async function ask(question: string): Promise<void> {
  await userEvent.type(screen.getByLabelText('Your question'), question);
  await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
}

beforeEach(() => {
  fakeDialog();
});

describe('AskBox', () => {
  it('refuses an empty question in place and moves focus to the box', async () => {
    const fetcher = stubApi({});
    renderAsk();
    await ask('   ');
    const box = screen.getByLabelText('Your question');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Type a question first.')).toBeInTheDocument();
    expect(document.activeElement).toBe(box);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('has the error in the description of the box at the moment focus lands on it', async () => {
    stubApi({});
    renderAsk();
    const box = screen.getByLabelText('Your question');
    const seen: string[] = [];
    box.addEventListener('focus', () => {
      const ids = (box.getAttribute('aria-describedby') ?? '').split(' ');
      seen.push(ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' | '));
    });
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/^Type a question first\./);
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(seen).toHaveLength(2);
  });

  it('shows the answer with every calculator call and announces it', async () => {
    const fetcher = stubApi({ '/api/ask': () => json(askAnswer()) });
    const { container } = renderAsk();
    await ask('  Can he play football at 6?  ');
    expect(await screen.findByText('Football at 15:00 is in cleaner air than at 18:00.')).toBeInTheDocument();
    expect(screen.getByText('The forecast is a model.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'You asked' })).toHaveTextContent(
      'You askedCan he play football at 6?',
    );
    expect(screen.getByText('Wording by Gemini')).toBeInTheDocument();
    expect(screen.getByText('Calculator calls, 2')).toBeInTheDocument();
    expect(screen.getByText('travel_co2({"mode":"car","km":14})')).toBeInTheDocument();
    expect(screen.getByText('The arguments were refused.')).toBeInTheDocument();
    expect(announced()).toBe('The answer is ready.');
    const body = sentBody(fetcher, 0);
    expect(body).toMatchObject({ question: 'Can he play football at 6?', language: 'en' });
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('marks the fixed reply to a medical question as written in advance and not sent to the model', async () => {
    stubApi({ '/api/ask': () => json(askMedical()) });
    const { container } = renderAsk();
    await ask('Should he take more puffs?');
    expect(await screen.findByText('Fixed reply, written in advance')).toBeInTheDocument();
    expect(screen.getByText('This question was not sent to the model.')).toBeInTheDocument();
    expect(screen.getByText(/Please see a doctor/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Health Advisory|advisory/i })).toHaveAttribute('href');
    expect(screen.getByText('no-such-fact, no source record on this page.')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('says why a reply is fixed text when the model did not answer', async () => {
    stubApi({ '/api/ask': () => json(askRules()) });
    renderAsk();
    await ask('Is the evening better?');
    expect(await screen.findByText(/did not answer, so this reply is fixed text/)).toBeInTheDocument();
    expect(screen.getByText(/used up its free quota/)).toBeInTheDocument();
    expect(screen.getByText('No calculator calls were made for this answer.')).toBeInTheDocument();
  });

  it('shows the waiting line and keeps the button off while the answer is worked out', async () => {
    const fetcher = stubApi({ '/api/ask': () => new Promise<Response>(() => undefined) });
    renderAsk();
    await ask('Is the evening better?');
    expect(screen.getByText('Working out the answer')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Ask' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Your question'), ' again');
    await userEvent.click(button);
    expect(button).toHaveFocus();
    expect(screen.getAllByText('Working out the answer')).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shows a failed request with a retry that asks again', async () => {
    let calls = 0;
    stubApi({
      '/api/ask': () => {
        calls += 1;
        return calls === 1 ? json({}, 500) : json(askAnswer());
      },
    });
    renderAsk();
    await ask('Is the evening better?');
    expect(
      await screen.findByRole('heading', { name: 'The server did not answer properly' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Football at 15:00 is in cleaner air than at 18:00.')).toBeInTheDocument();
  });
});
