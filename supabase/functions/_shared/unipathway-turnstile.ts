/**
 * Validate only the result of Cloudflare's SERVER-SIDE Turnstile siteverify.
 * A visitor-supplied "verified" field is never trusted. Keep this helper
 * independent of the network so the release CI can test the security contract.
 */
export type SiteverifyOutcome={
 success?:unknown;
 hostname?:unknown;
 action?:unknown;
 challenge_ts?:unknown;
};
export function acceptedTurnstileOutcome(
 outcome:unknown,allowedHostnames:readonly string[],expectedAction='unipathway-enquiry'
):boolean{
 if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return false;
 const v=outcome as SiteverifyOutcome;
 if(v.success!==true||typeof v.hostname!=='string'||typeof v.action!=='string')return false;
 const host=v.hostname.trim().toLowerCase();
 if(!host||v.action!==expectedAction||allowedHostnames.length===0)return false;
 return allowedHostnames.some(approved=>approved.trim().toLowerCase()===host);
}
