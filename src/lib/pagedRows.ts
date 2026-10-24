/** Read a complete RLS-filtered snapshot; never return a partial result on failure. */
export async function pagedRows<T>(query: () => {order: (column: string) => {range: (from: number, to: number) => PromiseLike<{data: unknown[] | null; error: unknown}>}}, current = () => true, key = 'id'): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; current(); offset += 250) {
    const result = await query().order(key).range(offset, offset + 249);
    if (!current()) throw Error('Request superseded');
    if (result.error || !Array.isArray(result.data)) throw Error('Records could not be verified');
    rows.push(...result.data as T[]);
    if (result.data.length < 250) return rows;
  }
  throw Error('Request superseded');
}
export async function rowsByIds<T>(ids: string[], query: (ids: string[]) => Parameters<typeof pagedRows<T>>[0], current = () => true, key = 'id') {
  const rows: T[] = [];
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 50) rows.push(...await pagedRows<T>(query(unique.slice(i, i + 50)), current, key));
  return rows;
}
