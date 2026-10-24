// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import {apnsPayload,fcmPayload,providerResult,createPushProviders,signedJwt} from '../../scripts/lib/native-push-providers.mjs';
it('sends generic lock-screen content without student names, marks or private URLs',()=>{
 const body=JSON.stringify([apnsPayload(),fcmPayload('device-token')]);expect(body).toContain('Open UniPathway');expect(body).not.toContain('student');expect(body).not.toContain('https://');
 expect(providerResult(200,undefined)).toBe('accepted');expect(providerResult(404,'UNREGISTERED')).toBe('invalid_token');expect(providerResult(410,'Unregistered')).toBe('invalid_token');expect(providerResult(429,undefined)).toBe('retry');
});
it('authorises FCM and classifies invalid registrations without leaking server errors',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({access_token:'server-access',expires_in:3600})}).mockResolvedValueOnce({status:404,json:async()=>({error:{details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'UNREGISTERED'}]}})});
 const send=createPushProviders({fcmAccount:{client_email:'test@example.invalid',project_id:'test-project',private_key:privateKey.export({type:'pkcs8',format:'pem'})}},fetcher);
 await expect(send({platform:'android',token:'device-token'})).resolves.toBe('invalid_token');expect(fetcher.mock.calls[1][0]).toBe('https://fcm.googleapis.com/v1/projects/test-project/messages:send');
 expect(JSON.parse(fetcher.mock.calls[1][1].body).message.notification.title).toBe('UniPathway');
});
it('fails closed when provider credentials are absent',async()=>{await expect(createPushProviders({})({platform:'android',token:'token'})).rejects.toThrow('configuration');});

it('uses the 64-byte ES256 signature format required for APNs JWTs',()=>{
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const token=signedJwt({alg:'ES256',kid:'TESTKEY123'},{iss:'TESTTEAM12',iat:100},privateKey);
 expect(Buffer.from(token.split('.')[2],'base64url')).toHaveLength(64);
});
