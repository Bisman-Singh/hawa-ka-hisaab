// Tests for the result parts: printing opens the browser's print dialog, and the facts carry their working.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoticeResult, printPage } from '../../../src/ui/community/NoticeResult.js';
import { fakeDialog } from '../helpers.js';
import { noticeResponse } from '../plan/fixtures.js';

describe('NoticeResult', () => {
  it('prints through the browser and shows each fact with its working and sources', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    printPage();
    expect(print).toHaveBeenCalledTimes(1);
    fakeDialog();
    const response = noticeResponse(1);
    render(<NoticeResult response={response} kind="school" />);
    expect(screen.getAllByText('Show the working')).toHaveLength(response.facts.length);
    expect(screen.getByText(response.facts[0]?.label ?? '')).toBeInTheDocument();
  });
});
