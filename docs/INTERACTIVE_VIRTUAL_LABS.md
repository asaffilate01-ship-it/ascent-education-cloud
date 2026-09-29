# UniPathway Interactive Virtual Lab Gateway

## Goal
One LMS experience across low-cost/free education providers and UniPathway-managed environments. Students get isolated practical workspaces; instructors see progress and help queues and may observe/assist only where the provider supports it and policy permits.

## Provider routing
Prefer in order: education/free entitlement -> low-cost UniPathway container/Jupyter -> student cloud credit -> on-demand VM -> specialist managed lab. Providers include GitHub Codespaces/Classroom, AWS Academy, Azure/Microsoft learning environments, Jupyter/container labs and managed multi-VM/cyber labs.

## Classroom flow
Teams live teaching -> lecturer demonstration -> Start Lab -> individual workspace -> task telemetry/verification -> help request -> instructor/TA observe or assist -> completion evidence -> sign-off/assessment -> environment stop.

## Instructor access
Observe/assist/control are separate audited modes. Control must be explicit, time-bounded and provider-supported. Every instructor access session records instructor, student lab, mode, reason and times. Never expose credentials or unrelated student environments.

## Verification
Use deterministic checks wherever practical: unit tests, files/configuration, SQL results, service state, cloud-resource configuration, network checks. AI may explain errors/hints but must not falsely mark deterministic tasks complete.

## Scale/cost
Labs are provisioned on demand, idle-shutdown, duration/attempt capped, and destroyed/reset according to course policy. Track minutes and provider cost by student/module/cohort. For large classes, allocate TA support groups and operate a central help queue.

## Production connector contract
Each provider connector implements: provision, launch, status, task/evidence query where available, observe/assist capability declaration, pause/stop/reset, usage/cost and termination. Provider tokens stay server-side and launch references are short-lived.
