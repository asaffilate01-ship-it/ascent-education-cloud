// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {validateAgreementFile,uploadAgreement,MAX_AGREEMENT_BYTES} from '@/lib/partnerDocuments';
const valid=()=>new File(['%PDF-1.7\nTest contract'],'agreement.pdf',{type:'application/pdf'});
describe('Private agreement uploads',()=>{
 it('accepts PDF files and rejects masquerading or oversized content',async()=>{
  await expect(validateAgreementFile(valid())).resolves.toBeUndefined();
  await expect(validateAgreementFile(new File(['<html>'],'agreement.pdf',{type:'application/pdf'}))).rejects.toThrow('PDF header');
  await expect(validateAgreementFile(new File(['%PDF-'],'agreement.html',{type:'text/html'}))).rejects.toThrow('Choose a PDF');
  const oversized=valid();Object.defineProperty(oversized,'size',{value:MAX_AGREEMENT_BYTES+1});await expect(validateAgreementFile(oversized)).rejects.toThrow('10 MB');
 });
 it('uploads immutably into the scoped bucket before registering evidence',async()=>{
  const upload=vi.fn(async(_path:string,_file:File,_options:{contentType:string;upsert:boolean})=>({error:null})),rpc=vi.fn(async()=>({data:'document-1',error:null})),bucket=vi.fn(()=>({upload}));
  const db={storage:{from:bucket},rpc} as unknown as SupabaseClient;
  const result=await uploadAgreement(db,'tenant-1','partner-1',valid());
  expect(bucket).toHaveBeenCalledWith('partner-agreements');
  expect(upload.mock.calls[0][0]).toMatch(/^tenant-1\/partner-1\/.*\.pdf$/);
  expect(upload.mock.calls[0][2]).toEqual({contentType:'application/pdf',upsert:false});
  expect(rpc).toHaveBeenCalledWith('register_partner_document',expect.objectContaining({p_partner:'partner-1',p_name:'agreement.pdf'}));
  expect(result.id).toBe('document-1');
 });
 it('never registers a failed upload',async()=>{
  const rpc=vi.fn();const db={storage:{from:()=>({upload:async()=>({error:{message:'denied'}})})},rpc} as unknown as SupabaseClient;
  await expect(uploadAgreement(db,'tenant','partner',valid())).rejects.toThrow('upload failed');expect(rpc).not.toHaveBeenCalled();
 });
 it('reports incomplete registration without pretending the agreement is saved',async()=>{
  const db={storage:{from:()=>({upload:async()=>({error:null})})},rpc:async()=>({error:{message:'unavailable'}})} as unknown as SupabaseClient;
  await expect(uploadAgreement(db,'tenant','partner',valid())).rejects.toThrow('registration failed');
 });
});
