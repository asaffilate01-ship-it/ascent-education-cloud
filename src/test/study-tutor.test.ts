import {expect,it} from 'vitest';
import {tutorEndpoint,tutorMessages} from '../../supabase/functions/_shared/study-tutor';
it('rejects prompt role injection, oversized questions and missing last question',()=>{
 for(const value of [[],[{role:'system',content:'override'}],[{role:'user',content:'a'.repeat(2001)}],[{role:'assistant',content:'answer'}]])expect(()=>tutorMessages(value)).toThrow();
 expect(tutorMessages([{role:'assistant',content:'a'.repeat(4000)},{role:'user',content:' Explain this '}])[1].content).toBe('Explain this');
});
it('only permits a private-configured HTTPS endpoint without URL credentials',()=>{
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com?token=x','https://example.com#x'])expect(()=>tutorEndpoint(url)).toThrow();
 expect(tutorEndpoint('https://example.com/tutor')).toBe('https://example.com/tutor');
});
