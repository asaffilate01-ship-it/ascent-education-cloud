import type {QualificationOption} from '@/lib/qualificationSelection';
import {pearsonFineArtSpecification} from '@/lib/pearsonFineArt';

export default function QualificationCurriculum({qualification:q}:{qualification:QualificationOption}){
 const curriculum=q.curriculum;
 if(!curriculum)return null;
 return <div className="mt-4 space-y-3 text-sm [overflow-wrap:anywhere]">
  <p><strong>{curriculum.credits} credits</strong> · Qualification number {curriculum.qualificationNumber}</p>
  <p className="text-muted-foreground">{curriculum.creditNote}</p>
  <details className="rounded-lg border p-3">
   <summary className="min-h-11 cursor-pointer py-3 font-semibold">Modules and craft study · Level {q.level}</summary>
   <div className="space-y-4 pt-2">
    {curriculum.modules.map(module=><section key={module.code} aria-label={`Level ${module.level} module ${module.code}`}>
     <h3 className="font-semibold">Level {module.level} · Module {module.code}: {module.title}</h3>
     <ul className="mt-2 list-disc space-y-2 pl-5">{module.units.map(unit=><li key={unit.code}>{unit.code} · {unit.title} — {unit.credits} credits</li>)}</ul>
    </section>)}
    <section><h3 className="font-semibold">Planned craft-focused teaching</h3>
     <ul className="mt-2 list-disc space-y-2 pl-5">{curriculum.craftFocus.map(topic=><li key={topic}>{topic}</li>)}</ul>
     <p className="mt-2 text-muted-foreground">These are UniPathway teaching themes within the assessed modules, not additional Pearson units or extra credits. Final studio projects, facilities and supervised practical attendance must be confirmed for the approved programme.</p>
    </section>
    <a href={pearsonFineArtSpecification} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline">Pearson Fine Art specification (PDF)<span className="sr-only"> (opens in a new tab)</span></a>
   </div>
  </details>
 </div>;
}
