import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), queries: [] as { table: string; filters: unknown[][] }[], fail: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-1', tenantId: 'tenant-1', role: 'student', roles: ['student'] } }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const query = { table, filters: [] as unknown[][] }; mocks.queries.push(query);
  const chain = {
    select: () => chain, eq: (...args: unknown[]) => { query.filters.push(args); return chain; }, order: () => chain,
    insert: (payload: unknown) => mocks.insert(payload),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: mocks.fail ? { message: 'offline' } : null, data: table === 'residential_weeks' ? [{ id: 'visit-1', tenant_id: 'tenant-1', title: 'Visit One', start_date: '2027-10-15', end_date: '2027-10-28', status: 'upcoming', max_capacity: 200 }] : [] }).then(resolve),
  }; return chain;
} } }));
import ResidentialWeeks from '@/pages/residential/ResidentialWeeks';
beforeEach(() => { mocks.queries.length=0; mocks.fail=false; mocks.insert.mockReset(); mocks.insert.mockResolvedValue({error:null}); });
afterEach(cleanup);
it('uses the authenticated tenant for reads and booking, never the visit ID', async () => {
  render(<MemoryRouter><ResidentialWeeks /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Book My Place' }));
  fireEvent.click(screen.getByRole('button', { name: 'Record booking' }));
  await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: 'tenant-1', residential_week_id: 'visit-1', student_id: 'student-1' })));
  for (const query of mocks.queries.filter(q => q.filters.length)) expect(query.filters).toContainEqual(['tenant_id','tenant-1']);
});
it('shows load failure rather than an empty schedule or booking action', async () => {
  mocks.fail=true;
  render(<MemoryRouter><ResidentialWeeks /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByRole('button', { name: 'Book My Place' })).not.toBeInTheDocument();
});
