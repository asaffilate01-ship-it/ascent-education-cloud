import {canUseActiveRole} from '@/lib/roleMembership';
import type {UserRole} from '@/types/platform';

/** Separate from existing formative tuition and guardian learning-plan sharing. */
export function tuitionReportsEnabled() {
  return import.meta.env.VITE_UNIPATHWAY_TUITION_REPORTS_ENABLED === 'true';
}

// The RPC denies mixed verified memberships, rather than picking an audience from a role switch.
export function canUseTuitionReportsRole(user: {role: UserRole; roles: readonly UserRole[]}, role: UserRole) {
  return canUseActiveRole(user, [role]) && new Set(user.roles).size === 1;
}
