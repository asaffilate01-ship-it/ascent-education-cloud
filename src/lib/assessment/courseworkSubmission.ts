/** The submission RPC returns the committed attempt UUID, never an empty success body. */
export function courseworkReceipt(value: unknown): string | null {
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:null;
}

/** These PostgreSQL errors reject the transaction; transport errors remain uncertain. */
export function definiteCourseworkRejection(error: unknown): boolean {
 const code=error&&typeof error==='object'&&'code' in error?(error as {code?:unknown}).code:null;
 return typeof code==='string'&&['P0001','42501','23502','23503','23514','22023','22P02'].includes(code);
}

export type ReviewedCoursework = {
 briefId: string;
 title: string;
 rawDraft: string;
 evidence: string;
 uploadIds: string[];
 requestId: string;
 attemptNo: number;
};
