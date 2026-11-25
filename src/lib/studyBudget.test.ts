import {describe,expect,it} from 'vitest';
import {calculateStudyBudget,initialStudyBudget} from './studyBudget';

const valid={tuition:'10000',living:'800',months:'12',other:'1000',funding:'5000',reserve:'10'};
describe('study budget',()=>{
 it('calculates full-period living costs, reserve and remaining gap',()=>expect(calculateStudyBudget(valid)).toEqual({livingTotal:9600,subtotal:20600,contingency:2060,total:22660,fundingGap:17660}));
 it('never produces a negative funding gap',()=>expect(calculateStudyBudget({...valid,funding:'30000'})?.fundingGap).toBe(0));
 it('rejects missing or malformed inputs, negative amounts and invalid periods',()=>{
  expect(calculateStudyBudget(initialStudyBudget)).toBeNull();
  for(const patch of [{living:'-1'},{other:'Infinity'},{tuition:'1e3'},{living:'1.234'},{months:'0'},{months:'121'},{months:'1.5'},{reserve:'101'},{funding:''}])expect(calculateStudyBudget({...valid,...patch})).toBeNull();
 });
 it('rounds fractional costs to two decimals',()=>expect(calculateStudyBudget({tuition:'100.01',living:'10.05',months:'3',other:'0',funding:'0',reserve:'10'})?.total).toBe(143.18));
});
