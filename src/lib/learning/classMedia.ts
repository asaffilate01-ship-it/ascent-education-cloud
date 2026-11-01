import {supabase} from '@/integrations/supabase/client';
export const CLASS_MEDIA_BUCKET='unipathway-class-media';
const active=import.meta.env.VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED==='true';
/**
 * Both the server RPC and private Storage SELECT RLS must independently check
 * actual class end + 24 hours (12 only with audited urgent approval).
 * Never sign media locally for an unverified class or pre-release recording.
 */
export async function classMediaUrl(path:string){
 if(!active)throw Error('Post-class recording release has not been activated in UniPathway.');
 if(!path||path.length>1500)throw Error('Invalid class media reference.');
 const verification=await (supabase.rpc as any)('can_open_my_unipathway_class_media',{p_path:path});
 if(verification.error||verification.data!==true)throw Error('This class recording or revision file is not yet authorised for release.');
 const {data,error}=await supabase.storage.from(CLASS_MEDIA_BUCKET).createSignedUrl(path,120);
 if(error||!data?.signedUrl)throw Error('Recording access could not be verified. Refresh or contact your centre.');
 const url=new URL(data.signedUrl),origin=new URL(import.meta.env.VITE_SUPABASE_URL).origin;
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||
 !url.pathname.startsWith(`/storage/v1/object/sign/${CLASS_MEDIA_BUCKET}/`))
  throw Error('Unexpected media address. Contact your centre.');
 return url.href;
}
