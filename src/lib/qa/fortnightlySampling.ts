/**
 * Read-only, policy-driven second-line IQA audit sampling core.
 *
 * Never fetches learner records, issues marks, assigns reviewers, publishes results,
 * or chooses a percentage. Candidate retrieval, cryptographic randomness, role/RLS,
 * reviewer independence and approval belong to a trusted server workflow.
 */
export type AuditCandidate = Readonly<{
  attemptId:string;
  tenantId:string;
  awardingBody:string;
  qualificationCode:string;
  level:string;
  subject:string;
  assessorId:string;
  assessmentMethod:string;
  releasedAt:string;
  status:'released'|'not_released';
  highRisk:boolean;
}>;

export type AuditPolicy = Readonly<{
  tenantId:string;
  awardingBody:string;
  policyReference:string;
  /** UTC/offset-aware inclusive lower bound. */
  from:string;
  /** UTC/offset-aware exclusive upper bound. */
  to:string;
  /** Policy owner sets this per awarding body. There is no UniPathway universal rate. */
  samplePercent:number;
  minimumCount:number;
}>;

export type SampleReason='mandatory-risk'|'coverage'|'random';
export type SamplingCoverage={
  levels:{covered:string[];missing:string[]};
  subjects:{covered:string[];missing:string[]};
  assessors:{covered:string[];missing:string[]};
  methods:{covered:string[];missing:string[]};
};
export type AuditProposal=Readonly<{
  state:'proposal-needs-independent-approval';
  tenantId:string;
  awardingBody:string;
  policyReference:string;
  from:string;
  to:string;
  eligibleCount:number;
  targetCount:number;
  selected:Array<{attemptId:string;reason:SampleReason}>;
  coverage:SamplingCoverage;
}>;

const validInstant=(value:string):boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));
const nonempty=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0;
type Dimension='levels'|'subjects'|'assessors'|'methods';
const dimensions:ReadonlyArray<{key:Dimension;value:(item:AuditCandidate)=>string}>=[
  {key:'levels',value:item=>item.level},
  {key:'subjects',value:item=>item.subject},
  {key:'assessors',value:item=>item.assessorId},
  {key:'methods',value:item=>item.assessmentMethod},
];

/** A documented random draw is injected by the trusted server (crypto RNG), never Math.random in the browser. */
function randomIndex(length:number,draw:()=>number):number{
  const value=draw();
  if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Sampling requires a trusted random value in [0,1)');
  return Math.floor(value*length);
}
function sampleCoverage(population:readonly AuditCandidate[],selected:readonly AuditCandidate[]):SamplingCoverage{
  const result={} as SamplingCoverage;
  for(const dim of dimensions){
    const all=new Set(population.map(dim.value));
    const covered=new Set(selected.map(dim.value));
    result[dim.key]={
      covered:[...covered].sort(),
      missing:[...all].filter(value=>!covered.has(value)).sort(),
    };
  }
  return result;
}

/**
 * Produce a reproducible-in-records *proposal* from a previously authorised
 * population of released human/IQA-approved work. A downstream, separate human
 * reviewer must approve any resulting audit assignment.
 */
export function proposeFortnightlyIqaAudit(
  candidates:readonly AuditCandidate[],
  policy:AuditPolicy,
  draw:()=>number,
):AuditProposal{
  if(!nonempty(policy.tenantId)||!nonempty(policy.awardingBody)||!nonempty(policy.policyReference)||
    !validInstant(policy.from)||!validInstant(policy.to)||Date.parse(policy.from)>=Date.parse(policy.to)||
    !Number.isFinite(policy.samplePercent)||policy.samplePercent<=0||policy.samplePercent>100||
    !Number.isInteger(policy.minimumCount)||policy.minimumCount<0||policy.minimumCount>1000){
    throw new Error('A verified, dated awarding-body sampling policy is required');
  }
  if(candidates.length>10000)throw new Error('Sampling population exceeds the reviewed batch limit');
  const seen=new Set<string>();
  const population:AuditCandidate[]=[];
  for(const item of candidates){
    if(!item||!nonempty(item.attemptId)||!nonempty(item.tenantId)||
      item.tenantId!==policy.tenantId||!nonempty(item.awardingBody)||
      !nonempty(item.qualificationCode)||!nonempty(item.level)||!nonempty(item.subject)||
      !nonempty(item.assessorId)||!nonempty(item.assessmentMethod)||
      !validInstant(item.releasedAt)||typeof item.highRisk!=='boolean'||
      (item.status!=='released'&&item.status!=='not_released')){
      throw new Error('Sampling population has invalid or cross-centre evidence');
    }
    if(seen.has(item.attemptId))throw new Error('Duplicate assessment attempt in sampling population');
    seen.add(item.attemptId);
    const releasedTime=Date.parse(item.releasedAt);
    if(item.awardingBody===policy.awardingBody&&item.status==='released'&&
       releasedTime>=Date.parse(policy.from)&&releasedTime<Date.parse(policy.to)){
      population.push(item);
    }
  }
  const selected=new Map<string,SampleReason>();
  for(const item of population)if(item.highRisk)selected.set(item.attemptId,'mandatory-risk');
  const targetCount=Math.min(population.length,Math.max(
    Math.ceil(population.length*policy.samplePercent/100),policy.minimumCount,selected.size,
  ));
  const byId=new Map(population.map(item=>[item.attemptId,item]));
  while(selected.size<targetCount){
    const already=[...selected.keys()].map(id=>byId.get(id)!);
    const covered=sampleCoverage(population,already);
    const remaining=population.filter(item=>!selected.has(item.attemptId));
    const gain=(item:AuditCandidate)=>dimensions.reduce((sum,dim)=>
      sum+(covered[dim.key].covered.includes(dim.value(item))?0:1),0);
    const best=Math.max(...remaining.map(gain));
    const choices=remaining.filter(item=>gain(item)===best);
    const chosen=choices[randomIndex(choices.length,draw)];
    selected.set(chosen.attemptId,best>0?'coverage':'random');
  }
  const selectedItems=[...selected.entries()].map(([attemptId,reason])=>({attemptId,reason}));
  return {
    state:'proposal-needs-independent-approval',
    tenantId:policy.tenantId,awardingBody:policy.awardingBody,
    policyReference:policy.policyReference,from:policy.from,to:policy.to,
    eligibleCount:population.length,targetCount,selected:selectedItems,
    coverage:sampleCoverage(population,selectedItems.map(({attemptId})=>byId.get(attemptId)!)),
  };
}
