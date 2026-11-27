export const INSTITUTIONAL_AUTH_ENABLED=import.meta.env.VITE_UNIPATHWAY_INSTITUTIONAL_AUTH_ENABLED==='true';
export const INSTITUTIONAL_DOMAIN='unipathway.pk';
export function institutionalEmail(value:unknown):string|null{
 if(typeof value!=='string'||value.length>254)return null;
 const address=value.trim().toLowerCase();
 return /^[a-z0-9][a-z0-9._+-]{0,63}@unipathway\.pk$/.test(address)&&!address.split('@')[0].includes('..')?address:null;
}
export const INSTITUTIONAL_MIN_PASSWORD=12;
export function institutionalAssurance(email:unknown,confirmed:boolean,level:unknown){
 return !!institutionalEmail(email)&&confirmed&&level==='aal2';
}
