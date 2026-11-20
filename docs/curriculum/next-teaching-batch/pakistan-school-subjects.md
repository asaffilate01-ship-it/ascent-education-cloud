# UniPathway school learning batch: Grades 8–12

**Version:** original draft 1, 19 November 2026. **Status:** educator review required; not published, not accredited, not an exam-board-approved scheme of work.

## Scope and use
Thirty original 45-minute lessons: one for each combination of five proposed learner grades and six subjects (technology/computer science, physics, chemistry, biology, mathematics and English). This is a usable starter batch, **not a complete subject course, textbook or annual curriculum**. Grade labels indicate a proposed teaching progression, not a verified board placement. Grade 8 science may be taught as integrated general science rather than three separate examination subjects. Grades 9–10 are treated as an SSC planning band and 11–12 as an HSSC/Intermediate planning band; school, group and board rules must be confirmed. A learner need not take all six subjects in an approved subject combination.

All scenarios, passages, questions and answers below were newly written for this batch, not copied from textbooks or examination papers. Numerical laboratory data are explicitly synthetic. Do not label them as collected experimental evidence. Worked answers belong in a teacher panel rather than alongside an assessed submission.

## Board-specific review gates and verified source register
Checked official public sources on 19 November 2026. These establish the need for version-specific mapping, **not a completed mapping of these lessons**.

- **Punjab gate P:** choose the actual BISE, academic session, subject group, prescribed book edition and examination year; check curriculum outcomes and current deleted-topic/ALP notices before assigning exam relevance. PECTAA's official page lists different smart-syllabus materials for grades 9, 10, 11 and 12, including a separate computer-science listing. Do not apply one year's exclusions to another year. [PECTAA curriculum and compliance](https://pectaa.edu.pk/curriculum-compliance/).
- **Sindh gate S:** choose the examining board and its implementation notice, curriculum edition and textbook. DCAR lists revised subject curricula alongside older versions; selecting a convenient PDF is not proof of the version a school examines. The directory's computer-science grade label also needs verification inside its PDF rather than being copied unquestioningly. [Sindh DCAR curriculum directory](https://www.dcar.gos.pk/Sindh%20Curriculum.html).
- **Other Pakistan boards gate O:** name the board (for example FBISE or the relevant provincial BISE), subject/group, exam year and official SLO/assessment framework. National curriculum publication alone does not prove local implementation or assessment weighting. [National Curriculum Council](https://ncc.gov.pk/) and [official BISE Peshawar national curriculum directory](https://www.bisep.gov.pk/page-10030.html) are discovery sources, not interchangeable board approvals. The latter describes combined grade bands; do not infer a precise grade split without its board's bifurcation.
- **Cambridge gate C:** select qualification (Lower Secondary, IGCSE, O Level or International AS & A Level), exact subject code, exam year and applicable options/tier. Pakistan grade numbers are **not** Cambridge syllabus stages. English First Language, Second Language and Literature are not interchangeable. Do not advertise these English skills lessons as covering prescribed literature texts. [Cambridge IGCSE curriculum overview](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/curriculum/).
- **Concrete version warning:** Cambridge's 0478 overview now also describes later changes. The 2026–2028 PDF still specifies pseudocode for relevant Paper 2 coding answers, with a stated exception for the scenario question. Therefore Python practice here is not automatically acceptable examination-answer syntax. [0478 official overview](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-computer-science-0478/) and [2026–2028 syllabus PDF](https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf).

**Required mapping record for every lesson:** lesson ID; reviewer; selected board/qualification; subject code; exam/session year; curriculum/version; official source URL; exact outcome/page; prerequisite; included/excluded/extracurricular classification; practical requirements; approval date. Until completed, `alignment_status = unmapped_original_draft` and `exam_readiness = not_certified` for all 30 lessons. No automatic Punjab-to-Sindh, SSC-to-IGCSE or Intermediate-to-A-Level equivalence is asserted.

## Teaching, accessibility and safety protocol
Each lesson uses this complete 45-minute routine: **0–5** retrieve the prerequisite and discuss the starter; **5–15** teach the explanation and worked example; **15–25** guided paired task; **25–38** independent questions; **38–45** exit check and feedback. Use the lesson's questions and answer key to check understanding, not just completion. If the exit response misses the named concept, reteach using the worked example with smaller numbers before the next lesson.

Provide large-print text, keyboard-accessible worksheets and spoken descriptions of diagrams. Permit Urdu/Sindhi vocabulary support while preserving the technical meaning; do not assume English fluency measures subject mastery. Offer paper alternatives to computing exercises. Avoid collecting real learner records, names, medical details or passwords. Scientific practicals here are desk-based models/data tasks. No mains electricity, flames, unknown chemicals, bodily samples, microbial culture or unsupervised wet experiments. Any later physical practical needs a teacher's risk assessment and local facilities check. Teacher judgement governs marks; AI suggestions are not official grades.

## Technology and computer science

### CS08 — Algorithms, decisions and test cases
**Proposed grade:** 8. **Review gates:** P/S/O/C. **Prerequisite:** whole-number comparison. **Resources:** paper, pencil; optional offline code editor. **Objectives:** describe input/process/output; trace a decision; test a boundary. **Starter:** how does a bus fare rule become a repeatable instruction?

**Teach:** An algorithm is an ordered method. A variable stores a value; a condition selects a branch. Our invented school-club rule gives free entry to ages under 12 and charges 100 rupees otherwise. It is a fictional exercise, not a real admissions policy. Write: INPUT age; IF age < 12 THEN fee ← 0 ELSE fee ← 100; OUTPUT fee. Trace age 12: the condition is false, so the output is 100. The comparison is not “less than or equal”.

**Guided task:** partners trace 10, 12 and 15. One reads each step; the other records the condition and result. **Independent:** (1) Output for 11? (2) Why test 12? (3) What should happen with −2? (4) Add a rule rejecting negative age before calculating a fee.

**Key:** 0; 12 is the boundary; reject invalid input; IF age < 0 THEN OUTPUT “Invalid” ELSE run the fee decision. **Exit:** explain why testing only age 10 is insufficient. Expected: it never checks the paid branch or boundary. **Support:** use a number line. **Stretch/home task:** add a reduced fee of 50 for ages 12–15 inclusive and give boundary tests 11, 12, 15, 16.

### CS09 — Binary representation
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** powers of two and addition. **Resources:** eight paper cards. **Objectives:** convert unsigned 8-bit values; explain range; distinguish numeric meaning from encoding. **Starter:** how can two symbols represent many numbers?

**Teach:** Eight bit positions have weights 128, 64, 32, 16, 8, 4, 2, 1. A 1 includes its weight; a 0 does not. Thus 00001101 = 8 + 4 + 1 = 13. To encode 22, choose 16 + 4 + 2: 00010110. Unsigned 8-bit values range from 0 to 255. The same bits can have other meanings under another encoding; this lesson assumes unsigned integers.

**Guided:** arrange cards to represent 37; explain each selected weight. **Independent:** (1) Convert 00101010. (2) Encode 19. (3) Encode 255. (4) Can 256 fit in unsigned 8 bits without changing representation?

**Key:** 42; 00010011; 11111111; no, it needs nine bits. **Exit:** why is the maximum not 256? Expected: 256 distinct combinations include zero. **Support:** begin with four bits. **Stretch/home task:** add 00001111 and 00000001, showing carries. Answer 00010000. No signed-number or overflow behaviour is implied for a particular programming language.

### CS10 — Reliable search and input validation
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** lists, equality and loops. **Resources:** paper or offline Python. **Objectives:** trace linear search; handle absent targets; separate validation from correctness. **Starter:** if a book code has the correct format, does that prove the book exists?

**Teach:** Linear search checks items sequentially. For codes [14, 22, 37, 41], searching for 37 compares 14, then 22, then 37: three comparisons. Use found ← FALSE; FOR each item: IF item = target THEN found ← TRUE and stop; OUTPUT found. A format/range check can reject impossible input but cannot establish a match. Define whether duplicate matches return the first or all results.

**Guided:** trace target 50, recording four failed comparisons and FALSE. **Independent:** (1) Comparisons for 14? (2) For 41? (3) Result for an empty list? (4) Give one normal, one absent and one empty-list test.

**Key:** one; four; FALSE with zero comparisons; e.g. target 22 in the list, target 50, target 22 in []. **Exit:** distinguish “invalid target” from “valid target not found”. **Support:** cross off cards one by one. **Stretch/home task:** change the method to count every occurrence in [14,22,22,41]; target 22 gives two. Check Cambridge answer syntax for the exact exam year before using pseudocode as exam preparation.

### CS11 — Relational data and safe queries
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** tables and identifiers. **Resources:** synthetic table below, optional local database only. **Objectives:** identify primary/foreign keys; explain reduced duplication; reason about a SELECT query. **Starter:** what goes wrong if a course title is copied into hundreds of enrolment rows?

**Teach:** Use Course(course_id, title), with rows (C1, Algebra), (C2, Writing); Learner(learner_id, alias), with (L1, A), (L2, B); and Enrolment(learner_id, course_id), with (L1,C1), (L1,C2), (L2,C2). Course IDs uniquely identify course rows. Enrolment references existing learner and course IDs. Its pair can form a composite primary key if duplicate enrolments are forbidden. A query selecting learner_id WHERE course_id = 'C2' returns L1 and L2.

**Guided:** draw links without replacing IDs with aliases. **Independent:** (1) Why is course title a poor key? (2) Which table records a learner joining another course? (3) Why reject (L9,C1) when L9 is absent? (4) What does SELECT COUNT(*) FROM Enrolment return?

**Key:** titles may change/repeat; Enrolment; foreign-key integrity; 3. **Exit:** explain one update anomaly avoided by separate Course rows. **Support:** colour-code keys. **Stretch/home task:** write a join to display aliases and course titles. Use parameterized queries for user input; never connect this exercise to production learner data.

### CS12 — Algorithms and scaling
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** loops, sorted lists and halving. **Resources:** numbered cards. **Objectives:** compare search strategies; identify preconditions; separate complexity from measured speed. **Starter:** why might sorting first be unnecessary for one search but useful for many?

**Teach:** Linear search may inspect all n entries. Binary search repeatedly halves a sorted search interval, making logarithmic comparison growth possible. For sorted [3,7,11,15,19,23,27], target 23: check middle 15, retain upper half, check 23. That is two comparisons under this chosen middle convention. Binary search on unsorted data is not reliable. Algorithmic complexity describes how work scales; it is not a stopwatch reading or a promise about network latency.

**Guided:** trace target 8 and show when the interval becomes empty. **Independent:** (1) Linear worst-case comparisons for 100 entries? (2) Why does binary search need ordering? (3) Can binary search guarantee faster total work if a list must first be sorted for one query? (4) Name a fair benchmarking control.

**Key:** 100; comparisons justify discarding one half; no; same inputs/hardware plus repeated trials. **Exit:** state one precondition and one limitation. **Support:** halve physical cards. **Stretch/home task:** compare repeated searches of a stable sorted catalogue with a frequently changing small list; justify a choice without claiming a universally best method.

## Physics

### PH08 — Speed from distance and time
**Proposed grade:** 8, integrated-science candidate. **Review gates:** P/S/O/C. **Prerequisite:** division and units. **Resources:** synthetic travel table. **Objectives:** calculate average speed; identify fair comparisons; distinguish speed and journey duration. **Starter:** does arriving first always mean travelling faster?

**Teach:** Average speed = total distance ÷ total elapsed time. An invented cart travels 12 m in 4 s: average speed = 3 m/s. Include stops when calculating the whole journey's average. This does not prove the speed was 3 m/s at every moment. Use consistent units.

**Guided:** compare cart A: 20 m in 5 s, and cart B: 18 m in 6 s. A averages 4 m/s, B 3 m/s. **Independent:** (1) 30 m in 10 s? (2) Distance at constant 2 m/s for 7 s? (3) A journey covers 10 m in 5 s then stops 5 s. Whole-journey average? (4) Why use repeated timing trials in a real experiment?

**Key:** 3 m/s; 14 m; 1 m/s; reduce influence of random timing variation and assess consistency. **Exit:** distinguish average from instantaneous speed. **Support:** use a distance/time triangle with units explained. **Stretch/home task:** invent two journeys with the same average speed but different stops. Use a desk model, not running near traffic.

### PH09 — Resultant force and acceleration
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** subtraction, division, speed change. **Resources:** force-arrow drawings. **Objectives:** calculate net force in one dimension; use F = ma for constant mass; distinguish balanced forces from rest. **Starter:** can an object move while its forces balance?

**Teach:** Opposite forces combine by subtraction. A 2 kg trolley has 10 N rightward and 4 N leftward forces. Net force = 6 N rightward, so acceleration = 6/2 = 3 m/s² rightward. The equation uses resultant external force, not just the largest force. Zero resultant force means zero acceleration, not necessarily zero velocity.

**Guided:** draw 8 N left and 8 N right on a moving trolley; explain constant velocity in the idealised model. **Independent:** (1) Acceleration of 3 kg under 12 N net force? (2) Net force on 5 kg accelerating at 2 m/s²? (3) A 6 N right force opposes 9 N left: direction and magnitude? (4) If acceleration is zero, must position stay constant?

**Key:** 4 m/s²; 10 N; 3 N left; no. **Exit:** identify the error in using applied force without subtracting resistance. **Support:** draw arrows to scale. **Stretch/home task:** explain how a constant-speed bicycle can have a forward driving force balanced by resistive forces.

### PH10 — Current, voltage and resistance
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** ratios and circuit symbols. **Resources:** synthetic measurements; no physical mains circuit. **Objectives:** calculate resistance; read a current–voltage pattern; state the constant-temperature condition. **Starter:** are voltage and current the same quantity?

**Teach:** Potential difference is energy transferred per unit charge; current is charge flow per unit time. Resistance R = V/I. Synthetic readings for a component at constant temperature: (V,I) = (2,0.10), (4,0.20), (6,0.30), in volts and amperes. Each gives R = 20 Ω. Constant resistance produces a straight-line I–V relation through the origin. Not every component obeys this model under all conditions.

**Guided:** calculate the predicted current at 8 V: 0.40 A. **Independent:** (1) Resistance at 9 V and 0.3 A? (2) Voltage across 10 Ω carrying 0.2 A? (3) Why mention temperature? (4) Does doubling voltage necessarily double current in a filament lamp?

**Key:** 30 Ω; 2 V; resistance can change as temperature changes; no, heating changes resistance. **Exit:** state what the table supports and what it does not prove. **Support:** annotate units in every substitution. **Stretch/home task:** sketch an I–V graph with labelled axes; do not infer a lamp's exact curve from the resistor table.

### PH11 — Work and energy conservation
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** force, displacement and squares. **Resources:** calculator, synthetic ramp scenario. **Objectives:** compute work for a parallel force; calculate kinetic energy; account for energy transfers. **Starter:** does effort always correspond to mechanical work on an object?

**Teach:** For a constant force parallel to displacement, W = Fs. Kinetic energy is E_k = ½mv². A 2 kg cart starts at rest; a net force does 16 J of work. Its kinetic energy becomes 16 J, so ½×2×v² = 16 and v = 4 m/s. When describing an applied force rather than net force, include opposing work and other transfers.

**Guided:** a 5 N pull over 3 m does 15 J of work; if friction transfers 6 J to thermal stores, kinetic energy increases by 9 J. **Independent:** (1) KE of 4 kg at 3 m/s? (2) Work by a parallel 7 N force over 2 m? (3) What happens to KE if speed doubles? (4) Why is all applied work not necessarily a KE increase?

**Key:** 18 J; 14 J; quadruples; energy can transfer to other stores or be opposed by other forces. **Exit:** distinguish applied work from net work. **Support:** energy-bar diagram. **Stretch/home task:** introduce W = Fs cos θ and explain the zero-work perpendicular case.

### PH12 — Magnetic flux and induced emf
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** area, time rate and basic magnetic fields. **Resources:** coil diagrams only. **Objectives:** calculate a simple flux change; interpret Faraday's law magnitude; explain Lenz's law qualitatively. **Starter:** why can a stationary magnet beside a stationary coil fail to produce a sustained emf?

**Teach:** For a uniform field, flux through a flat area is Φ = BA cos θ, where θ is measured from the area normal. With N identical linked turns, average emf magnitude is N|ΔΦ|/Δt. If flux per turn changes from 0.002 to 0.006 Wb in 0.20 s through 50 turns, emf magnitude is 50×0.004/0.20 = 1 V. Lenz's law gives the opposing effect, not a universal negative voltage reading independent of sign convention.

**Guided:** halve the change time; result 2 V. **Independent:** (1) Double turns, same flux change/time? (2) No flux change? (3) θ = 90° flux? (4) Does an open circuit necessarily carry induced current?

**Key:** 2 V for the original example; zero induced emf in this model; zero; no, emf may exist without a closed current path. **Exit:** distinguish emf from current. **Support:** label field and normal arrows. **Stretch/home task:** explain why opposition to the change is consistent with energy conservation. No high-voltage demonstrations.

## Chemistry

### CH08 — Mixtures and separation
**Proposed grade:** 8, integrated-science candidate. **Review gates:** P/S/O/C. **Prerequisite:** solids/liquids and dissolving. **Resources:** drawings of sand, salt and water; no heating. **Objectives:** distinguish dissolved and insoluble material; sequence separation; state what each step recovers. **Starter:** does clear water necessarily contain no dissolved substances?

**Teach:** Filtration can trap insoluble sand, but dissolved salt passes through with water. To recover salt from that solution, controlled evaporation/crystallisation can be used in a suitably supervised laboratory. Distillation can collect the solvent instead. A change in appearance does not by itself identify a substance or establish drinking-water safety.

**Guided:** draw a flowchart for a fictional sand–salt–water mixture: filter → sand residue plus salt-solution filtrate → appropriate solvent-removal stage to recover salt. **Independent:** (1) Where is the sand after filtration? (2) Why does dissolved salt pass through? (3) Which method collects water from the salt solution? (4) Is the recovered water automatically safe to drink?

**Key:** filter residue; dissolved particles travel with solvent through ordinary filter paper; distillation; no, safety needs validated treatment/testing. **Exit:** explain residue versus filtrate. **Support:** labelled particle sketches. **Stretch/home task:** compare recovering salt with recovering both salt and water. Plan only; do not heat or taste samples at home.

### CH09 — Atoms, isotopes and ions
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** positive/negative integers. **Resources:** particle-counter drawings. **Objectives:** calculate proton/neutron/electron counts; distinguish isotope from ion; use atomic and mass numbers. **Starter:** can two atoms of the same element have different masses?

**Teach:** Atomic number Z counts protons; mass number A counts protons plus neutrons. A neutral atom has equal proton/electron counts. For an invented labelled particle with Z = 11 and A = 23, protons = 11, neutrons = 12, electrons = 11. Its +1 ion has 10 electrons but the same nucleus. Isotopes share proton number but differ in neutron number.

**Guided:** compare carbon-12 and carbon-14, both Z = 6: each has six protons; neutrons are six and eight. **Independent:** (1) Neutral Z=8, A=16: counts? (2) Its 2− ion: electrons? (3) Does becoming an ion change element identity? (4) What is wrong with calling an ion an isotope solely because electron count differs?

**Key:** 8 protons, 8 neutrons, 8 electrons; 10 electrons; no, proton number stays unchanged; isotope differences concern neutrons. **Exit:** explain mass number versus atomic number. **Support:** separate nucleus/electron counters. **Stretch/home task:** calculate average mass for a hypothetical element with 75% mass-10 and 25% mass-11 isotopes: 10.25 relative units; this is a simplified model.

### CH10 — Balanced equations and reaction ratios
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** atom symbols and multiplication. **Resources:** coloured paper atoms. **Objectives:** balance an equation; preserve chemical formulas; distinguish coefficients from subscripts. **Starter:** can balancing be achieved by changing H₂O into H₂O₂?

**Teach:** Atoms are conserved in an ordinary chemical reaction. For hydrogen plus oxygen forming water, use 2H₂ + O₂ → 2H₂O. Count four H atoms and two O atoms on each side. Coefficients change amounts; subscripts define substances. The equation gives a 2:1:2 particle or mole ratio, not a 2:1:2 mass ratio. This lesson is a paper model; do not ignite gas.

**Guided:** balance Mg + O₂ → MgO as 2Mg + O₂ → 2MgO. **Independent:** (1) Balance N₂ + H₂ → NH₃. (2) Mole ratio H₂:NH₃? (3) With enough oxygen, how many moles of water from 3 mol H₂? (4) Why not change O₂ to O to balance the original reactants?

**Key:** N₂ + 3H₂ → 2NH₃; 3:2; 3 mol; that changes the specified chemical species. **Exit:** demonstrate atom counting on both sides. **Support:** use coloured counters. **Stretch/home task:** for 2 mol H₂ and 0.5 mol O₂, identify limiting O₂ and maximum water 1 mol.

### CH11 — Moles and solution concentration
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** mass, volume conversions, equation ratios. **Resources:** calculator and fictional solution data. **Objectives:** calculate n=m/M; use c=n/V; convert cm³ to dm³. **Starter:** why does the volume unit matter in a concentration calculation?

**Teach:** Moles measure amount of substance. Using M(NaCl)=58.5 g/mol as a provided classroom value, 5.85 g represents 0.100 mol. If the final solution volume is 500 cm³ = 0.500 dm³, concentration = 0.100/0.500 = 0.200 mol/dm³. “Final solution volume” is not necessarily the volume of water initially added. Calculations do not constitute permission to prepare chemicals.

**Guided:** find moles in 250 cm³ of 0.40 mol/dm³ solution: 0.100 mol. **Independent:** (1) Moles in 11.7 g NaCl? (2) Concentration if those moles occupy 1.00 dm³? (3) Moles in 50 cm³ of 0.10 mol/dm³? (4) Why is using 50 directly in c=n/V wrong here?

**Key:** 0.200 mol; 0.200 mol/dm³; 0.0050 mol; required volume is 0.050 dm³. **Exit:** write a dimensional check. **Support:** conversion table. **Stretch/home task:** use c₁V₁=c₂V₂ to find the final volume when 100 cm³ of 0.50 mol/dm³ is diluted to 0.20 mol/dm³: 250 cm³, assuming solute amount conserved.

### CH12 — Dynamic equilibrium
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** reversible reactions and concentration. **Resources:** particle-transfer model, synthetic data. **Objectives:** explain dynamic equilibrium; calculate a simple Kc; distinguish rate from position. **Starter:** must equilibrium mean equal reactant and product concentrations?

**Teach:** In a closed system at equilibrium, forward and reverse rates are equal while concentrations remain constant; concentrations need not be equal. For the simplified gaseous reaction A ⇌ B, Kc=[B]/[A]. If equilibrium values are 0.60 and 0.20 mol/dm³ respectively, Kc=3. A catalyst speeds approach to equilibrium but does not change its position or Kc at a fixed temperature. Changing temperature can change Kc.

**Guided:** use 0.15 mol/dm³ B and 0.05 mol/dm³ A; the ratio is again 3 despite different amounts. **Independent:** (1) If Kc=4 and [A]=0.10, [B]? (2) Are reactions stopped at equilibrium? (3) Does a catalyst increase equilibrium yield? (4) Why specify a closed system?

**Key:** 0.40 mol/dm³; no; no at fixed conditions; matter escaping can prevent the assumed equilibrium situation. **Exit:** explain “dynamic” with equal transfer rates. **Support:** two containers and equal paper-token transfers. **Stretch/home task:** for 2A ⇌ B, write Kc=[B]/[A]² and explain why coefficients become powers. This model is not a recipe for an experiment.

## Biology

### BI08 — Cells and specialised structures
**Proposed grade:** 8, integrated-science candidate. **Review gates:** P/S/O/C. **Prerequisite:** living organisms and scale. **Resources:** teacher-drawn plant/animal cell diagrams. **Objectives:** connect structures to functions; compare typical cells; avoid overgeneralisation. **Starter:** why is a cell membrane not the same as a cell wall?

**Teach:** In typical plant and animal cells, the membrane controls movement across the boundary, cytoplasm supports reactions and the nucleus contains genetic information. Typical plant cells also have a cellulose wall and often a large permanent vacuole. Chloroplasts occur in photosynthetic plant cells, not every plant cell. These are simplified models, not exact images of all living cells.

**Guided:** label a leaf cell and an animal cheek-cell drawing; identify shared and different structures without collecting samples. **Independent:** (1) Which structure contains chlorophyll? (2) Which supports a typical plant cell externally? (3) Must a root cell contain chloroplasts? (4) Explain one membrane function.

**Key:** chloroplast; cellulose cell wall; no, many root cells are non-photosynthetic; selectively regulates movement into/out of the cell. **Exit:** explain why “all plant cells have chloroplasts” is inaccurate. **Support:** use a bilingual structure/function matching set. **Stretch/home task:** draw a root-hair cell and explain how its shape can increase absorbing surface area; mark the drawing as schematic, not to scale.

### BI09 — Diffusion and osmosis
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** particles and membranes. **Resources:** synthetic potato-cylinder data only. **Objectives:** distinguish diffusion and osmosis; calculate percentage mass change; interpret evidence cautiously. **Starter:** do particles stop moving once concentrations become equal?

**Teach:** Diffusion is net movement down a concentration gradient arising from random motion. Osmosis concerns water across a selectively permeable membrane, from higher to lower water potential. In a simplified dilute-solution description, water moves from more dilute to more concentrated solution when other relevant conditions are equal. A fictional tissue piece changes from 2.00 g to 2.20 g: percentage change=(0.20/2.00)×100=10%.

**Guided:** calculate a change from 2.00 g to 1.80 g: −10%. Interpret net water loss, not cell “death” inferred from mass alone. **Independent:** (1) 4.00 g to 4.20 g? (2) Why use percentage rather than only absolute change? (3) One controlled variable? (4) What does zero net mass change suggest?

**Key:** +5%; compares different starting masses; time/temperature/size or tissue type; approximately balanced net water movement under those conditions, not absence of molecular motion. **Exit:** state the membrane requirement. **Support:** before/after mass boxes. **Stretch/home task:** propose repeat measurements and one uncertainty source without claiming synthetic data are experimental results.

### BI10 — Inheritance and probability
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** fractions and basic DNA/gene vocabulary. **Resources:** hypothetical pea-trait cards. **Objectives:** use a simple monohybrid cross; distinguish genotype/phenotype; interpret probability. **Starter:** does a 25% probability guarantee exactly one outcome in four offspring?

**Teach:** In an explicitly simplified complete-dominance model, allele T produces tall plants when present, while tt is short. Tt × Tt gives TT, Tt, Tt, tt: genotype ratio 1:2:1 and expected phenotype ratio 3:1. Dominant does not mean common, stronger or better. Many traits do not follow this simple model; do not apply it to complex human characteristics.

**Guided:** construct a Tt × tt grid: half Tt, half tt. **Independent:** (1) Probability of TT from Tt × Tt? (2) Probability of short offspring from TT × tt? (3) Does the predicted ratio require every group of four to match? (4) Genotype of all TT × tt offspring?

**Key:** ¼; zero in this model; no, small samples vary by chance; Tt. **Exit:** explain genotype versus phenotype using the example. **Support:** colour-coded allele tokens. **Stretch/home task:** explain why larger samples tend to provide more stable proportions, while not guaranteeing exact ratios. No collection of family medical or genetic histories.

### BI11 — Enzymes and evidence
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** proteins, reaction rates and graph axes. **Resources:** synthetic relative-rate table. **Objectives:** interpret an optimum; explain denaturation; distinguish measured range from universal claims. **Starter:** do all enzymes work best at the same temperature?

**Teach:** Enzymes are biological catalysts; their active sites interact with substrates. Temperature can increase reaction rates up to conditions where loss of functional structure reduces activity. Hypothetical readings for one enzyme: 10°C→2 units, 20°C→4, 30°C→7, 40°C→9, 50°C→3. The highest observed rate is at 40°C, but the exact optimum may lie between sampled temperatures. Low-temperature slowing is not equivalent to high-temperature denaturation.

**Guided:** graph the five points and suggest additional observations between 30°C and 50°C. **Independent:** (1) Highest measured rate? (2) Two variables to control? (3) Why not call 40°C every enzyme's optimum? (4) Why repeat each temperature measurement?

**Key:** 9 units at 40°C; pH/substrate concentration/enzyme amount; different enzymes and conditions differ, and these are synthetic data; estimate variability/reliability. **Exit:** explain active-site change without claiming the enzyme is “killed”. **Support:** describe the graph aloud. **Stretch/home task:** plan a pH investigation using a paper protocol only; no handling saliva, biological specimens or unknown reagents.

### BI12 — Population change and natural selection
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** variation, inheritance and percentages. **Resources:** fictional beetle population data. **Objectives:** explain selection using inherited variation; distinguish individuals from populations; evaluate competing explanations. **Starter:** do organisms develop a needed inherited trait simply because they need it?

**Teach:** Inherited variation exists in populations. Under particular conditions, some variants leave more surviving offspring; frequencies can change across generations. Fictional beetle records show a dark variant rising from 20 of 100 to 45 of 100 after several generations in darker habitat. Frequency rose from 20% to 45%, but this observation alone does not prove selection: migration, sampling and chance must be considered. Individual beetles did not deliberately evolve darker bodies.

**Guided:** build a causal explanation linking existing variation, habitat, survival/reproduction and inheritance; explicitly identify the assumptions. **Independent:** (1) Percentage-point change? (2) One alternative explanation? (3) What additional evidence supports selection? (4) Why is “all beetles changed colour because they needed to” inadequate?

**Key:** 25 percentage points; migration/genetic drift/sampling differences; inherited trait plus differential reproductive success across replicated observations; confuses individual change with population-level inherited change. **Exit:** write a four-step explanation without purposeful language. **Support:** sequencing cards. **Stretch/home task:** compare selection and genetic drift; no breeding, release or culture of living organisms is required.

## Mathematics

### MA08 — Proportional reasoning
**Proposed grade:** 8. **Review gates:** P/S/O/C. **Prerequisite:** fractions and multiplication. **Resources:** fictional recipe cards. **Objectives:** recognise direct proportion; calculate a scale factor; reject unsupported proportional assumptions. **Starter:** if a recipe serves twice as many people, must cooking time double?

**Teach:** In direct proportion y=kx, the ratio y/x is constant. A fictional recipe needs 150 g flour for three portions. That is 50 g per portion, so eight portions require 400 g. This model assumes identical portions and recipe proportions. Cooking time is not automatically proportional because heat transfer and equipment differ.

**Guided:** table: portions 2, 5, 10; flour 100, 250, 500 g. **Independent:** (1) Flour for seven portions? (2) Portions from 600 g? (3) Constant of proportionality and units? (4) A taxi charges a fixed 100 rupees plus 20 per km: is total fare directly proportional to distance?

**Key:** 350 g; 12; 50 g/portion; no, fixed charge means the graph does not pass through the origin. **Exit:** state a test for direct proportion. **Support:** unitary-method steps. **Stretch/home task:** compare y=50x and y=50x+100 at x=0,2,4 and explain their different interpretations.

### MA09 — Linear equations
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** signed numbers and distributive law. **Resources:** paper balance diagram. **Objectives:** preserve equality through operations; solve a multistep equation; check by substitution. **Starter:** why must the same operation be applied to both sides?

**Teach:** Solve 3x+5=20: subtract five on both sides to obtain 3x=15; divide both by three to obtain x=5. Check: 3×5+5=20. For 2(x−3)=10, first divide by two or expand correctly; x−3=5, so x=8. A solution is a value making the original statement true, not merely the last number in a calculation.

**Guided:** solve 4x−7=13 and check x=5. **Independent:** (1) 5x+2=22. (2) 3(x+2)=21. (3) 2x+4=x+9. (4) Identify the error: 2(x+3)=2x+3.

**Key:** x=4; x=5; x=5; both terms inside brackets must be multiplied, giving 2x+6. **Exit:** solve 7−x=3 and substitute: x=4. **Support:** balance diagram and one operation per line. **Stretch/home task:** examine 2x+4=2x+7: no solution; compare 2(x+2)=2x+4: every real x is a solution.

### MA10 — Quadratic equations and roots
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** expansion and signed products. **Resources:** algebra tiles or sketches. **Objectives:** factor a simple quadratic; use the zero-product property; check both roots. **Starter:** if ab=0, what must be true of a or b?

**Teach:** x²−5x+6=(x−2)(x−3), because −2 and −3 sum to −5 and multiply to 6. Setting the expression equal to zero gives x=2 or x=3. The zero-product property applies when the product equals zero; it cannot simply be used for (x−2)(x−3)=10. Verify roots in the original equation.

**Guided:** x²+5x+6=0 factors as (x+2)(x+3)=0, giving −2, −3. **Independent:** (1) x²−9=0. (2) x²−4x=0. (3) x²−6x+9=0. (4) Why is dividing x²−4x=0 by x risky?

**Key:** ±3; 0 or 4; repeated root 3; division by x can discard the solution x=0. **Exit:** explain the difference between a repeated root and two distinct roots. **Support:** factor-pair table. **Stretch/home task:** sketch y=(x−2)(x−3), marking roots and y-intercept 6; vertex is (2.5,−0.25).

### MA11 — Trigonometry and modelling
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** right triangles and ratios. **Resources:** calculator in degree mode; synthetic observation. **Objectives:** select tangent; account for observation height; state modelling assumptions. **Starter:** is the angle measured from the horizontal or vertical?

**Teach:** In a right triangle, tan θ=opposite/adjacent. An observer's eye is 1.5 m above level ground and 20 m horizontally from a building. The angle of elevation to its top is 30°. Height above the eye is 20 tan30°≈11.55 m; total building height≈13.05 m. This assumes level ground, vertical building, reliable distance and angle measurements.

**Guided:** repeat at 45°: total height 21.5 m. **Independent:** (1) At 10 m horizontal distance and 45°, eye height 1.5 m? (2) Why add eye height? (3) What happens if the calculator treats 30 as radians? (4) Give one measurement uncertainty.

**Key:** 11.5 m; triangle's vertical rise starts at the eye, not ground; incorrect trigonometric value/model input; angle reading/distance/ground slope. **Exit:** draw and label the triangle before calculating. **Support:** colour opposite/adjacent sides. **Stretch/home task:** compare heights computed with 29°, 30°, 31° to explore sensitivity. No rooftop access or roadside measurement required.

### MA12 — Derivatives as rates of change
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** functions, gradients, powers. **Resources:** paper and calculator. **Objectives:** differentiate simple polynomials; interpret units; distinguish average from instantaneous rate. **Starter:** why can a curve have different slopes at different points?

**Teach:** For s(t)=t²+2t metres, the derivative v(t)=2t+2 m/s gives instantaneous velocity. At t=3 s, v=8 m/s. Average velocity from 2 to 3 s is [s(3)−s(2)]/(3−2)=(15−8)/1=7 m/s. These differ because velocity changes. Use the power rule d(t^n)/dt=nt^(n−1) for the positive-integer polynomial cases here.

**Guided:** differentiate y=3x²−4x+5 to obtain 6x−4; at x=2 the slope is 8. **Independent:** (1) Derivative of x³? (2) Derivative of 7? (3) For s=4t², velocity at t=2? (4) Units of ds/dt if s is metres and t seconds?

**Key:** 3x²; 0; 16 m/s; m/s. **Exit:** explain why differentiating a constant gives zero. **Support:** table of secant slopes approaching a point. **Stretch/home task:** differentiate v=2t+2 again; acceleration 2 m/s². A review must establish whether this calculus belongs to the selected board/subject/group and year.

## English

### EN08 — Evidence-based inference
**Proposed grade:** 8. **Review gates:** P/S/O/C. **Prerequisite:** sentence meaning and retrieval. **Resources:** original passage below. **Objectives:** distinguish explicit information from inference; support a claim; avoid overclaiming.

**Original passage:** “Mina reached the library before the lights were switched on. Rain dotted her exercise book. She tucked it beneath her jacket and waited beside the locked door. When the caretaker arrived, she asked whether the reference shelves would be open that morning.”

**Starter:** what does the passage state directly? **Teach:** A retrieval answer repeats a stated fact; an inference combines clues with reasoning. “Mina wants to use the reference shelves” is supported by her question. “Mina always studies harder than everyone” is not supported. **Guided:** underline evidence that she arrived early: the lights were off and the door locked; acknowledge that exact clock time is unknown.

**Independent:** (1) What became wet? (2) Why might she put it beneath her jacket? (3) Can we conclude she has an exam that day? (4) Write one supported inference with evidence.

**Key:** exercise book; likely to protect it from rain; no; accept a cautious inference with a relevant clue. **Exit:** complete “I infer…because…”. **Rubric:** 1 claim, 1 relevant detail, 1 explanation, 1 appropriate caution (4 marks). **Support:** vocabulary: caretaker/reference/tucked. **Stretch/home task:** write a plausible continuation without pretending it was in the original passage.

### EN09 — Clear argumentative paragraphs
**Proposed grade:** 9. **Review gates:** P/S/O/C. **Prerequisite:** topic sentences. **Resources:** original claim and fictional evidence. **Objectives:** form a focused claim; connect evidence to reasoning; qualify limitations. **Starter:** is a strong opinion automatically a strong argument?

**Teach:** Use claim → evidence → explanation → qualification. Fictional pilot data: a reading room extended opening by 30 minutes for one week; recorded visits rose from 40 to 52. Model: “A short extension deserves a longer trial. Visits increased from 40 to 52 during the pilot, suggesting some learners valued the extra access. However, one week cannot show whether the increase will continue.” The data suggest a possibility, not proven causation.

**Guided:** identify each part and suggest another explanation, such as approaching exams. **Independent:** write 100–130 words recommending whether to continue the trial. Include the figures, one reason, one limitation and a next step. Then revise one absolute word such as “proves” or “everyone”.

**Key/model judgement:** either recommendation is acceptable if supported; 12 additional visits, not 52 additional visits. **Rubric:** claim 2, accurate evidence 2, reasoning 2, limitation 2, organisation/language 2 (10). **Exit:** explain why “the trial proves longer hours cause better grades” exceeds the evidence. **Support:** sentence starters. **Stretch/home task:** write a respectful counterargument without attacking people.

### EN10 — Summary without distortion
**Proposed grade:** 10. **Review gates:** P/S/O/C. **Prerequisite:** main idea and paraphrase. **Resources:** original passage. **Objectives:** select relevant points; condense accurately; retain qualifications.

**Original passage:** “The school garden club moved its weekly meeting to lunchtime because several members could not remain after lessons. Attendance increased during the first month. The new time also created difficulties: some pupils had to choose between the garden and sports practice, and watering could not always be completed before afternoon classes. The club plans to divide tasks into short shifts and review the timetable after six weeks. Its report makes no claim that every pupil prefers lunchtime.”

**Starter:** what is the passage mainly about? **Teach:** A summary preserves central meaning without copying every detail or adding judgement. **Guided:** identify reason, benefit, difficulties and planned response. **Independent:** write a 45–55-word summary; count words, then check that “all pupils prefer lunchtime” has not appeared.

**Model (48 words):** “The garden club shifted meetings to lunchtime to include pupils unable to stay after school. Attendance initially rose, but clashes with sports and limited watering time caused problems. The club will try shorter task shifts and review the arrangement, without claiming that all pupils prefer the new time.”

**Rubric:** key points 4, accuracy/qualification 2, own phrasing 2, coherence/length 2 (10). **Exit:** name one unsupported addition you avoided. **Support:** four-box notes. **Stretch/home task:** produce a 25-word version and discuss what nuance was lost. Word limits are teaching choices, not claimed board-paper requirements.

### EN11 — Compare viewpoints fairly
**Proposed grade:** 11. **Review gates:** P/S/O/C. **Prerequisite:** argument structure. **Resources:** two original mini-texts. **Objectives:** compare positions and evidence; recognise limits; synthesize rather than merely list.

**Text A:** “Phones should remain away during lessons. Even silent notifications interrupt attention, and teachers should not have to compete with messages. School devices can provide planned digital activities.”
**Text B:** “A complete classroom phone ban overlooks useful tools. A supervised phone can supply a dictionary or calculator where equipment is limited. Clear task-specific rules would be more practical than treating every use as distraction.”

**Starter:** do both writers reject all technology? **Teach:** A wants personal phones away but permits school devices; B supports supervised use. Both implicitly value learning. Neither supplies measured evidence here. **Guided:** build a comparison grid: claim, reason, assumption, missing evidence. **Independent:** write 150–180 words comparing the positions, including one shared concern, one difference and evidence needed to decide between them.

**Key:** avoid misrepresenting A as anti-technology or B as supporting unrestricted messaging. **Rubric:** accurate comparison 4, textual support 2, analysis of assumptions 2, synthesis/coherence 2 (10). **Exit:** state one fair paraphrase of the view you personally oppose. **Support:** “Both…whereas…” frames. **Stretch/home task:** propose a small ethical classroom trial without collecting private phone contents or real student identifiers.

### EN12 — Evidence-led recommendations and revision
**Proposed grade:** 12. **Review gates:** P/S/O/C. **Prerequisite:** comparison, argument and paragraph cohesion. **Resources:** fictional evidence pack. **Objectives:** synthesize quantitative and qualitative evidence; address a counterargument; revise for audience and uncertainty.

**Evidence pack (invented):** a study-room pilot recorded 80 visits in week 1 and 104 in week 2. A voluntary survey received 12 replies; nine favoured longer hours. Staff reported that extended opening required additional supervision. No attainment or cost data were collected.

**Starter:** does nine of 12 respondents mean 75% of all learners support the change? **Teach:** The correct denominator is respondents, and voluntary responses may be unrepresentative. Visits rose by 24, or 30%, but visits are not necessarily unique learners or evidence of improved grades. **Guided:** separate observation, interpretation and recommendation.

**Independent:** write a 200–250-word recommendation to a fictional school leader: preferred action, two accurate evidence points, one counterargument, limitations, and what to measure next. Revise one sentence for respectful professional tone.

**Key/judgement:** cautious continuation, modification or ending can earn full marks if reasoned; do not invent budgets or exam results. **Rubric:** evidence accuracy 4, reasoning 4, counterargument/limitations 4, feasible next step 4, organisation/language 4 (20). **Exit:** write one sentence distinguishing popularity from learning effectiveness. **Support:** labelled paragraph plan. **Stretch/home task:** condense the recommendation into a 60-word executive summary without strengthening the claims.

## Release checklist
- [ ] Subject specialist checks every explanation, numerical answer and model passage.
- [ ] Board reviewer completes the mapping record for each selected learner route.
- [ ] Exact exam year, group, official outcomes, exclusions and practical requirements verified.
- [ ] Cambridge-specific syllabus and language-choice review completed where relevant.
- [ ] Accessibility, English-language demand and Urdu/Sindhi support reviewed.
- [ ] School practical safety approval obtained before any physical extension.
- [ ] Teacher answer keys separated; review/feedback, resubmission and honest progress tracking implemented.
- [ ] Assessments remain formative until approved rubrics, moderation and grading policies exist.
- [ ] No claim of full course coverage, awarding-body approval or guaranteed examination success.

**Inventory:** CS08–CS12 (5); PH08–PH12 (5); CH08–CH12 (5); BI08–BI12 (5); MA08–MA12 (5); EN08–EN12 (5). **Total: 30 lessons.** All are original draft content with board mapping pending.

## Proposed next-lesson roadmap: planned, NOT written
The 30 topics below are future candidates, not delivered lessons or a claim of full syllabus coverage. Exact sequencing requires the same P/S/O/C board review gates. A topic may move grades or become enrichment after review.

| Proposed grade | Technology/computer science | Physics | Chemistry | Biology | Mathematics | English |
|---|---|---|---|---|---|---|
| 8 | Spreadsheet formulas and checking totals with synthetic club data | Density: comparing mass and volume | Particle model and changes of state | Food webs and energy-transfer diagrams | Percentages, discounts and checking reasonableness | Sequencing a narrative with consistent tense |
| 9 | Boolean operators and truth tables | Distance–time and velocity–time graphs | Electronic structure and simple bonding models | Photosynthesis: interpreting limiting-factor data | Simultaneous linear equations and intersections | Formal requests: audience, purpose and respectful register |
| 10 | Functions, parameters and systematic debugging | Wave speed, frequency and wavelength | Acids, bases and indicators using supplied data | Homeostasis and negative-feedback diagrams | Similar triangles and scale factors | Evaluating tone and language choices in original nonfiction |
| 11 | Normalisation and parameterized-query design using fictional records | Momentum and impulse in one dimension | Enthalpy changes and energy-cycle reasoning | Membrane transport and active transport | Sequences, series and model assumptions | Building a source-based essay with accurate attribution |
| 12 | Testing, complexity and trade-offs in sorting algorithms | Photoelectric-effect evidence and threshold frequency | Acid–base equilibria and logarithmic pH calculations | Gene expression and evidence limitations | Definite integrals and accumulation | Writing and editing a balanced extended analytical essay |

**Separate counts:** written starter batch = 30 lessons; proposed next batch = 30 topic ideas only; total written remains 30. Further practical resources, multimedia, homework sets and full schemes of work are not yet supplied.
