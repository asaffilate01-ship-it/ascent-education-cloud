import {canUseActiveRole} from '@/lib/roleMembership';
import type {UserRole} from '@/types/platform';

/** Legacy invoice/payment INSERT policies require finance or director membership, even for a platform owner. */
export function canWriteFinanceRecords(user: {role: UserRole; roles: readonly UserRole[]} | null | undefined): boolean {
  return !!user && canUseActiveRole(user, ['finance_officer', 'centre_director', 'superadmin'])
    && user.roles.some(role => role === 'finance_officer' || role === 'centre_director');
}
