import {cleanup,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner',tenantId:'centre',roles:['student']}})}));
vi.mock('@/integrations/supabase/client',async()=>{
 const {createClient}=await vi.importActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
 return {supabase:createClient('https://query-fixture.invalid','sb_publishable_synthetic_test_only',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(...args:Parameters<typeof fetch>)=>state.fetch(...args)}})};
});
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
beforeEach(()=>state.fetch.mockReset().mockResolvedValue(new Response('[]',{status:200,headers:{'content-type':'application/json'}})));afterEach(cleanup);
it('encodes array membership with the actual Supabase client while preserving other filters',async()=>{
 const {result}=renderHook(()=>useSupabaseQuery('programmes',{filters:[{column:'id',operator:'in',value:['p1','p2']},{column:'tenant_id',operator:'eq',value:'centre'}]}));
 await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.error).toBeNull();expect(state.fetch).toHaveBeenCalledTimes(1);
 const url=new URL(String(state.fetch.mock.calls[0][0]));expect(url.searchParams.get('id')).toBe('in.(p1,p2)');expect(url.searchParams.get('tenant_id')).toBe('eq.centre');
});
it('treats an empty membership list as no matching rows without querying a broader table',async()=>{
 const {result}=renderHook(()=>useSupabaseQuery('programmes',{filters:[{column:'id',operator:'in',value:[]}]}));await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.data).toEqual([]);expect(state.fetch).not.toHaveBeenCalled();
});
it('fails closed on a malformed membership filter instead of sending raw filter syntax',async()=>{
 const {result}=renderHook(()=>useSupabaseQuery('programmes',{filters:[{column:'id',operator:'in',value:'(p1,p2)'}]}));await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.error).toContain('array');expect(result.current.data).toEqual([]);expect(state.fetch).not.toHaveBeenCalled();
});
