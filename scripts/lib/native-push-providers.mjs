import {sign} from 'node:crypto';
import {connect} from 'node:http2';
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
export function signedJwt(header,claims,key){const body=`${encoded(header)}.${encoded(claims)}`;return `${body}.${sign(header.alg==='RS256'?'RSA-SHA256':'sha256',Buffer.from(body),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;}
export const notification={title:'UniPathway',body:'You have a new update. Open UniPathway to view it.'};
export function fcmPayload(token){return {message:{token,notification,android:{priority:'normal',ttl:'3600s'}}};}
export function apnsPayload(){return {aps:{alert:notification,sound:'default'}};}
export function providerResult(status,reason){if(status>=200&&status<300)return 'accepted';if(reason==='UNREGISTERED'||reason==='Unregistered'||reason==='BadDeviceToken')return 'invalid_token';return 'retry';}
export function createPushProviders({fcmAccount,apnsKey,apnsKeyId,apnsTeamId,apnsEnvironment='production',bundleId='pk.edu.unipathway.app'},fetcher=fetch){
 let fcmAuth=null,appleAuth=null;
 return async device=>{
  const now=Math.floor(Date.now()/1000);
  if(device.platform==='android'){
   if(!fcmAccount?.client_email||!fcmAccount?.private_key||!/^[-a-z0-9]+$/.test(fcmAccount.project_id||''))throw new Error('FCM configuration required');
   if(!fcmAuth||fcmAuth.expires<=now){
    const assertion=signedJwt({alg:'RS256',typ:'JWT'},{iss:fcmAccount.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},fcmAccount.private_key);
    const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new Error('FCM authentication failed');const data=await r.json();if(!data.access_token)throw new Error('FCM authentication failed');fcmAuth={token:data.access_token,expires:now+Math.min(Number(data.expires_in)||3600,3600)-60};
   }
   const r=await fetcher(`https://fcm.googleapis.com/v1/projects/${fcmAccount.project_id}/messages:send`,{method:'POST',headers:{Authorization:`Bearer ${fcmAuth.token}`,'Content-Type':'application/json'},body:JSON.stringify(fcmPayload(device.token)),signal:AbortSignal.timeout(15000)});
   const data=await r.json().catch(()=>({}));const reason=data.error?.details?.find(item=>item['@type']==='type.googleapis.com/google.firebase.fcm.v1.FcmError')?.errorCode;
   return providerResult(r.status,reason);
  }
  if(device.platform!=='ios'||!apnsKey||!apnsKeyId||!apnsTeamId||!['production','sandbox'].includes(apnsEnvironment))throw new Error('APNs configuration required');
  if(!/^[a-fA-F0-9]{32,512}$/.test(device.token))return 'invalid_token';
  if(!appleAuth||appleAuth.expires<=now)appleAuth={token:signedJwt({alg:'ES256',kid:apnsKeyId},{iss:apnsTeamId,iat:now},apnsKey),expires:now+3000};
  const origin=apnsEnvironment==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com';
  return await new Promise((resolve,reject)=>{
   const client=connect(origin);let settled=false;
   const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);client.destroy();if(error)reject(error);else resolve(result);};
   const timer=setTimeout(()=>done(new Error('APNs request timed out')),15000);
   client.on('error',()=>done(new Error('APNs connection failed')));
   const req=client.request({':method':'POST',':path':`/3/device/${device.token}`,authorization:`bearer ${appleAuth.token}`,'apns-topic':bundleId,'apns-push-type':'alert','apns-priority':'10','apns-expiration':String(now+3600),'apns-id':device.id});
   let status=0,body='';req.on('response',headers=>{status=Number(headers[':status']);});req.setEncoding('utf8');req.on('data',chunk=>{body+=chunk;if(body.length>10000)done(new Error('Unexpected APNs response'));});
   req.on('error',()=>done(new Error('APNs request failed')));req.on('end',()=>{let reason;try{reason=JSON.parse(body).reason;}catch{}done(null,providerResult(status,reason));});req.end(JSON.stringify(apnsPayload()));
  });
 };
}
