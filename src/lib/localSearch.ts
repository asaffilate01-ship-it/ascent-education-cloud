/** Match every search word locally, regardless of word order. */
export function matchesLocalSearch(text: string, query: string): boolean {
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/u).filter(Boolean).slice(0, 12);
  const haystack = normalize(text);
  return terms.every(term => haystack.includes(term));
}
