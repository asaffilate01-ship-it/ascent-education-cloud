import {supabase} from '@/integrations/supabase/client';
export const CLASS_MEDIA_BUCKET='unipathway-class-media';
export async function classMediaUrl(path:string){
 const {data,error}=await supabase.storage.from(CLASS_MEDIA_BUCKET).createSignedUrl(path,120);
 if(error||!data?.signedUrl)throw Error('Recording access could not be verified. Refresh or contact your centre.');
 const url=new URL(data.signedUrl),origin=new URL(import.meta.env.VITE_SUPABASE_URL).origin;
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||!url.pathname.startsWith(`/storage/v1/object/sign/${CLASS_MEDIA_BUCKET}/`))throw Error('Unexpected media address. Contact your centre.');
 return url.href;
}
