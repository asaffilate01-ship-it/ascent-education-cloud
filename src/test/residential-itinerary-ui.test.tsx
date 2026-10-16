import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ResidentialItinerary from '@/components/residential/ResidentialItinerary';
import { initialCalendarDraft } from '@/lib/residentialCalendar';
import { downloadText } from '@/lib/downloadText';
vi.mock('@/lib/downloadText', () => ({ downloadText: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('requires closure review and valid learner selection before a draft download', () => {
  const { rerender } = render(<ResidentialItinerary calendar={initialCalendarDraft} operations={{}} />);
  expect(screen.getByRole('button', { name: 'Export learner draft itinerary' })).toBeDisabled();
  rerender(<ResidentialItinerary calendar={{ ...initialCalendarDraft, closuresReviewed: true }} operations={{}} />);
  fireEvent.change(screen.getByLabelText('Itinerary learner number'), { target: { value: '51' } });
  expect(screen.getByText(/Group B · 72/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Export learner draft itinerary' }));
  expect(downloadText).toHaveBeenCalledWith('draft-cohort-1-learner-51.csv', expect.stringContaining('DRAFT ONLY'), 'text/csv;charset=utf-8');
  fireEvent.change(screen.getByLabelText('Itinerary learner number'), { target: { value: '' } });
  expect(screen.queryByRole('button', { name: 'Export learner draft itinerary' })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Select a valid cohort');
});
