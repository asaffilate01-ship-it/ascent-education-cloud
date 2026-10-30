import {describe,expect,it} from 'vitest';
import {checkDraft} from '../../supabase/functions/_shared/assessment-draft-validation';
import {validateCriteriaReport} from '../../supabase/functions/_shared/criteria-report-validation';
const evidence='The network uses a firewall to filter inbound traffic.';
const criterion={criterion_code:'AC1',max_points:10,learning_outcome:'Security',criterion_description:'Explain a firewall',scoring_guidance:'Evidence required'};
const entry={criterion_code:'AC1',suggested_points:5,evidence_quote:'a firewall to filter inbound traffic',missing_evidence:'No configuration example supplied.',rationale:'Explains filtering but omits a concrete configuration example.',feedback:'Add a configuration example to support the explanation.'};
const draft={criteria_results:[entry],feedback:'Explain your firewall rules and give a concrete configuration example to support your answer.'};
describe('assessor AI regression evaluations',()=>{
 it('accepts grounded advisory marks and computes totals itself',()=>expect(checkDraft({...draft,suggested_raw_score:100},[criterion],evidence).suggested_raw_score).toBe(5));
 for(const [name,patch] of Object.entries({invented_quote:{evidence_quote:'A perfect answer'},excess_marks:{suggested_points:11},negative_marks:{suggested_points:-1},coerced_marks:{suggested_points:'5'},unknown_criterion:{criterion_code:'AC999'},unsubstantiated_marks:{evidence_quote:''}}))it(`rejects ${name}`,()=>expect(()=>checkDraft({...draft,criteria_results:[{...entry,...patch}]},[criterion],evidence)).toThrow());
 it('rejects missing and duplicate criteria',()=>{expect(()=>checkDraft({...draft,criteria_results:[]},[criterion],evidence)).toThrow();expect(()=>checkDraft({...draft,criteria_results:[entry,entry]},[criterion,{...criterion,criterion_code:'AC2'}],evidence)).toThrow()});
 const report={criteria_results:[{criterion_code:'AC1',recommendation:'met',evidence_quote:'a firewall',evidence_location:'Sentence 1',rationale:'The supplied text explains a firewall.',missing_evidence:'More detail needed',suggested_feedback:'Add an example configuration.',confidence:.7}],suggested_grade:'Distinction',integrity_flags:['cheating']};
 it('drops model grade and misconduct assertions',()=>{const r=validateCriteriaReport(report,['AC1'],evidence);expect(r.suggested_grade).toBeNull();expect(r.integrity_flags).toEqual([]);expect(r.suggested_outcome).toBe('human_review_required')});
 it('rejects unsupported legacy reports and absent evidence',()=>{expect(()=>validateCriteriaReport(report,['AC2'],evidence)).toThrow();expect(()=>validateCriteriaReport(report,['AC1'],'')).toThrow();expect(()=>validateCriteriaReport({...report,criteria_results:[{...report.criteria_results[0],confidence:2}]},['AC1'],evidence)).toThrow()});
});
