import {renderHook, waitFor, act, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({range: vi.fn(), user: {id: 'a', tenantId: 'centre-a', roles: ['student']}}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mocks.user})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {from: () => {const q: any = {select: () => q, filter: () => q, order: () => q, range: (...args: unknown[]) => mocks.range(...args)}; return q;}}}));
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.user = {id: 'a', tenantId: 'centre-a', roles: ['student']};});
it('loads complete paginated results', async () => {
  const rows = Array.from({length: 501}, (_, id) => ({id: String(id)}));mocks.range.mockImplementation(async (from, to) => ({data: rows.slice(from, to + 1), error: null}));
  const {result} = renderHook(() => useSupabaseQuery('invoices'));await waitFor(() => expect(result.current.loading).toBe(false));expect(result.current.data).toHaveLength(501);expect(mocks.range).toHaveBeenCalledTimes(3);
});
it('rejects partial snapshots when a later page fails', async () => {
  mocks.range.mockResolvedValueOnce({data: Array.from({length: 250}, (_, id) => ({id})), error: null}).mockResolvedValueOnce({data: null, error: {message: 'denied'}});
  const {result} = renderHook(() => useSupabaseQuery('invoices'));await waitFor(() => expect(result.current.error).toBeTruthy());expect(result.current.data).toEqual([]);
});
it('disabled queries clear loading without requesting data', async () => {
  const {result} = renderHook(() => useSupabaseQuery('invoices', {enabled: false}));expect(result.current.loading).toBe(false);expect(mocks.range).not.toHaveBeenCalled();
});
it('discards an old account response after switching scope', async () => {
  let resolveOld: (value: unknown) => void = () => {};
  mocks.range.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;})).mockResolvedValue({data: [{id: 'new'}], error: null});
  const {result, rerender} = renderHook(() => useSupabaseQuery('invoices'));
  mocks.user = {...mocks.user, id: 'b', tenantId: 'centre-b'};rerender();await waitFor(() => expect(result.current.data[0]?.id).toBe('new'));
  await act(async () => {resolveOld({data: [{id: 'old'}], error: null});});expect(result.current.data[0]?.id).toBe('new');
});
