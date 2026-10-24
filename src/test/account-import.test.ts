import {expect,it} from 'vitest';
import {parseAccountCsv} from '@/lib/accountImport';
it('parses quoted names and normalises emails',()=>{
 expect(parseAccountCsv('\uFEFFemail,full_name,role\r\nUSER@example.com,"Saleem, Amer",student')).toEqual([{email:'user@example.com',fullName:'Saleem, Amer',role:'student'}]);
});
it('rejects privilege escalation, duplicates and invalid batches before invitations',()=>{
 for(const text of ['email,full_name,role\na@b.com,Admin,superadmin','email,full_name,role\na@b.com,Admin,centre_director','email,full_name,role\na@b.com,Person,student\nA@B.COM,Again,student','email,full_name,role\na@b.com,"Person,student','email,full_name,role','email,name,role\na@b.com,Person,student'])expect(()=>parseAccountCsv(text)).toThrow();
 expect(()=>parseAccountCsv('email,full_name,role\n'+Array.from({length:51},(_,i)=>`a${i}@b.com,Person,student`).join('\n'))).toThrow();
});
