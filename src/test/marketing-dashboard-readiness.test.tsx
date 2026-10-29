import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn(), retry: vi.fn()}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: () => mocks.query()}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children, actions}: {children: React.ReactNode; actions: React.ReactNode}) => <main>{actions}{children}</main>}));
vi.mock('recharts', () => ({
 ResponsiveContainer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
 BarChart: ({data}: {data: unknown}) => <pre data-testid="monthly-leads">{JSON.stringify(data)}</pre>,
 Bar: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null,
}));
import MarketingDashboard from '@/pages/marketing/MarketingDashboard';
beforeEach(() => {mocks.retry.mockReset(); mocks.query.mockReturnValue({data: [], loading: false, error: null, refetch: mocks.retry});});
afterEach(cleanup);
const show = () => render(<MemoryRouter><MarketingDashboard /></MemoryRouter>);
it('reports failed leads without presenting zero totals and retries the query', () => {
 mocks.query.mockReturnValue({data: [], loading: false, error: 'offline', refetch: mocks.retry});
 show();
 expect(screen.getByRole('alert')).toHaveTextContent('totals are unavailable');
 expect(screen.queryByText('Total Leads')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', {name: 'Retry marketing data'}));
 expect(mocks.retry).toHaveBeenCalledOnce();
});
it('links the campaign action to the existing email campaign workflow', () => {
 show();
 expect(screen.getByRole('link', {name: 'Email campaigns'})).toHaveAttribute('href', '/marketing/email-campaigns');
});
it('orders months chronologically and separates years while ignoring invalid dates', () => {
 mocks.query.mockReturnValue({loading: false, error: null, data: [
  {created_at: '2026-10-12T00:00:00Z'}, {created_at: '2025-10-12T00:00:00Z'},
  {created_at: '2026-09-12T00:00:00Z'}, {created_at: 'invalid'},
 ]});
 show();
 expect(JSON.parse(screen.getByTestId('monthly-leads').textContent!)).toEqual([
  {month: '2025-10', leads: 1}, {month: '2026-09', leads: 1}, {month: '2026-10', leads: 1},
 ]);
});
