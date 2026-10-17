/**
 * Public navigation only. No student, centre or programme IDs or access
 * credentials travel in a STEMCoach link.
 */
const STEMCOACH_ORIGINS = new Set([
  "https://stemcoach.lovable.app",
  "https://stemcoach.app",
]);

export function stemcoachCentreJoinUrl(slug: string, configuredOrigin?: string | null): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) return null;
  // No default: operator must validate and configure an approved production host.
  if (!configuredOrigin?.trim()) return null;
  let url: URL;
  try {
    url = new URL(configuredOrigin.trim());
  } catch {
    return null;
  }
  if (!STEMCOACH_ORIGINS.has(url.origin) || url.protocol !== "https:" ||
      url.pathname !== "/" || url.search !== "" || url.hash !== "" ||
      url.username !== "" || url.password !== "") return null;
  const link = new URL("/join-institution", url.origin);
  link.searchParams.set("code", slug);
  return link.toString();
}
