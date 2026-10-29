import {renderHook, waitFor, act, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({range: vi.fn(), user: {id: 'a', tenantId: 'centre-a', role: 'student', roles: ['student', 'lecturer']}}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mocks.user})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {from: () => {const q: any = {select: () => q, filter: () => q, order: () => q, range: (...args: unknown[]) => mocks.range(...args)}; return q;}}}));
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.user = {id: 'a', tenantId: 'centre-a', role: 'student', roles: ['student', 'lecturer']};});
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

it('clears results and reloads when only the active role changes', async () => {
  mocks.range.mockResolvedValueOnce({data: [{id: 'student-row'}], error: null});
  let resolveRole: (value: unknown) => void = () => {};
  mocks.range.mockImplementationOnce(() => new Promise(resolve => {resolveRole = resolve;}));
  const {result, rerender} = renderHook(() => useSupabaseQuery('invoices'));
  await waitFor(() => expect(result.current.data[0]?.id).toBe('student-row'));
  mocks.user = {...mocks.user, role: 'lecturer'};rerender();
  expect(result.current.data).toEqual([]);expect(result.current.loading).toBe(true);
  await act(async () => {resolveRole({data: [{id: 'lecturer-row'}], error: null});});
  expect(result.current.data[0]?.id).toBe('lecturer-row');
});
it('ignores a retained retry callback without cancelling the new scope read', async () => {
  let resolveOld: (value: unknown) => void = () => {};
  let resolveNew: (value: unknown) => void = () => {};
  mocks.range.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;}))
    .mockImplementationOnce(() => new Promise(resolve => {resolveNew = resolve;}));
  const {result, rerender} = renderHook(() => useSupabaseQuery('invoices'));
  const staleRetry = result.current.refetch;
  mocks.user = {...mocks.user, role: 'lecturer'};rerender();
  await act(async () => {await staleRetry();});
  expect(mocks.range).toHaveBeenCalledTimes(2);
  await act(async () => {resolveNew({data: [{id: 'current'}], error: null});});
  expect(result.current.data[0]?.id).toBe('current');
  await act(async () => {resolveOld({data: [{id: 'obsolete'}], error: null});});
  expect(result.current.data[0]?.id).toBe('current');expect(result.current.loading).toBe(false);
});
