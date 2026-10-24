import {expect,it,vi} from 'vitest';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
it('rejects partial snapshots if a later page fails',async()=>{
 const range=vi.fn().mockResolvedValueOnce({data:Array.from({length:250},(_,id)=>({id})),error:null}).mockResolvedValueOnce({data:null,error:{message:'failure'}});
 await expect(pagedRows(()=>({order:()=>({range})}))).rejects.toThrow('could not be verified');expect(range).toHaveBeenLastCalledWith(250,499);
});
it('stops on account changes and bounds chunked ID filters',async()=>{
 const query=vi.fn();await expect(pagedRows(query,()=>false)).rejects.toThrow('superseded');expect(query).not.toHaveBeenCalled();
 const sizes:number[]=[];await rowsByIds(Array.from({length:123},(_,i)=>String(i)),ids=>{sizes.push(ids.length);return ()=>({order:()=>({range:async()=>({data:[],error:null})})});});expect(sizes).toEqual([50,50,23]);
});
