import {ORIGINAL_FORMATIVE_EXPANSION} from './formativeQuestionExpansion';
import {CALCULATION_PRACTICE} from './formativeCalculations';
/** Original formative practice authored for staff review. Not secure assessment items. */
export type FormativeQuestion={id:string;subject:string;scope:string;topic:string;question:string;options:string[];answer:string;explanation:string;revision:number;status:'draft_review_required'};
export const FORMATIVE_QUESTIONS:readonly FormativeQuestion[]=[
 {
  "id": "UP-FQ3-MATHS-01",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Linear equations",
  "question": "Solve 3x − 7 = 20.",
  "options": [
   "9",
   "7",
   "13",
   "27"
  ],
  "answer": "9",
  "explanation": "Add 7 to both sides, then divide 27 by 3.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-MATHS-02",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Quadratics",
  "question": "Which pair solves x² − 5x + 6 = 0?",
  "options": [
   "−2 and −3",
   "1 and 6",
   "−1 and 6",
   "2 and 3"
  ],
  "answer": "2 and 3",
  "explanation": "Factorise as (x − 2)(x − 3).",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-MATHS-03",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Percentage change",
  "question": "A price of PKR 800 rises by 15%. What is the new price?",
  "options": [
   "PKR 680",
   "PKR 900",
   "PKR 920",
   "PKR 815"
  ],
  "answer": "PKR 920",
  "explanation": "15% of 800 is 120; add it to 800.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-MATHS-04",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Coordinate geometry",
  "question": "Find the gradient between (2, 3) and (6, 11).",
  "options": [
   "8",
   "2",
   "4",
   "1/2"
  ],
  "answer": "2",
  "explanation": "Change in y is 8; change in x is 4. Divide 8 by 4.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-MATHS-05",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Probability",
  "question": "A bag has 3 red and 5 blue identical-sized balls. One is chosen at random. What is the probability of red?",
  "options": [
   "3/8",
   "5/8",
   "3/5",
   "1/3"
  ],
  "answer": "3/8",
  "explanation": "There are 3 favourable outcomes out of 8 equally likely outcomes.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-MATHS-06",
  "subject": "School maths",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Trigonometry",
  "question": "In a right triangle, the side opposite angle θ is 6 cm and the hypotenuse is 10 cm. What is sin θ?",
  "options": [
   "0.8",
   "1.5",
   "0.4",
   "0.6"
  ],
  "answer": "0.6",
  "explanation": "Sine equals opposite divided by hypotenuse: 6/10.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-01",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Motion",
  "question": "A cyclist travels 120 m in 15 s at constant speed. Find the speed.",
  "options": [
   "105 m/s",
   "1,800 m/s",
   "8 m/s",
   "15 m/s"
  ],
  "answer": "8 m/s",
  "explanation": "Speed equals distance divided by time.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-02",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Forces",
  "question": "A net force of 18 N acts on a 3 kg object. What is its acceleration?",
  "options": [
   "0.167 m/s²",
   "6 m/s²",
   "54 m/s²",
   "15 m/s²"
  ],
  "answer": "6 m/s²",
  "explanation": "Newton's second law gives a = F/m = 18/3.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-03",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Electric circuits",
  "question": "A 6 Ω resistor has a current of 2 A through it. What is the potential difference?",
  "options": [
   "12 V",
   "3 V",
   "8 V",
   "0.333 V"
  ],
  "answer": "12 V",
  "explanation": "Ohm's law V = IR = 2 × 6.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-04",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Energy",
  "question": "A 2 kg object is moving at 4 m/s. What is its kinetic energy?",
  "options": [
   "8 J",
   "32 J",
   "4 J",
   "16 J"
  ],
  "answer": "16 J",
  "explanation": "Kinetic energy is ½mv², or ½ × 2 × 16.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-05",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Pressure",
  "question": "A force of 50 N acts uniformly over 0.25 m². Calculate the pressure.",
  "options": [
   "50 Pa",
   "20 Pa",
   "200 Pa",
   "12.5 Pa"
  ],
  "answer": "200 Pa",
  "explanation": "Pressure is force per unit area: 50/0.25.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-PHYSICS-06",
  "subject": "School physics",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Waves",
  "question": "A wave has a frequency of 5 Hz and wavelength of 2 m. What is its speed?",
  "options": [
   "0.4 m/s",
   "10 m/s",
   "2.5 m/s",
   "7 m/s"
  ],
  "answer": "10 m/s",
  "explanation": "Wave speed equals frequency multiplied by wavelength.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-01",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Atomic structure",
  "question": "An atom has 11 protons. What is its atomic number?",
  "options": [
   "11",
   "22",
   "1",
   "It depends on the neutrons"
  ],
  "answer": "11",
  "explanation": "Atomic number is the number of protons.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-02",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Chemical equations",
  "question": "Balance H₂ + O₂ → H₂O using the smallest whole-number coefficients.",
  "options": [
   "1, 1, 1",
   "1, 2, 2",
   "2, 2, 1",
   "2, 1, 2"
  ],
  "answer": "2, 1, 2",
  "explanation": "2H₂ + O₂ → 2H₂O has four H atoms and two O atoms on each side.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-03",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Moles",
  "question": "Using C = 12 and O = 16, what is the molar mass of CO₂?",
  "options": [
   "32 g/mol",
   "48 g/mol",
   "44 g/mol",
   "28 g/mol"
  ],
  "answer": "44 g/mol",
  "explanation": "Add 12 + 2 × 16.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-04",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Acids and bases",
  "question": "Which pH value indicates an acidic aqueous solution at 25 °C?",
  "options": [
   "13",
   "3",
   "7",
   "10"
  ],
  "answer": "3",
  "explanation": "At 25 °C, pH below 7 indicates acidity.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-05",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Bonding",
  "question": "What primarily holds oppositely charged ions together in sodium chloride?",
  "options": [
   "Electrostatic attraction",
   "Shared electron pairs",
   "Hydrogen bonds",
   "Gravity"
  ],
  "answer": "Electrostatic attraction",
  "explanation": "Ionic bonding involves electrostatic attraction between ions.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CHEMISTRY-06",
  "subject": "School chemistry",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Reaction rates",
  "question": "Why does a powdered solid often react faster than the same mass in large lumps?",
  "options": [
   "Its atoms become heavier",
   "Its concentration always doubles",
   "Its products have less energy",
   "Greater exposed surface area"
  ],
  "answer": "Greater exposed surface area",
  "explanation": "More exposed particles can collide with reactants per unit time.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-01",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Cell structure",
  "question": "Which organelle is the main site of aerobic respiration in typical animal cells?",
  "options": [
   "Ribosome",
   "Golgi apparatus",
   "Mitochondrion",
   "Nucleus"
  ],
  "answer": "Mitochondrion",
  "explanation": "Mitochondria carry out major stages of aerobic ATP production.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-02",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Photosynthesis",
  "question": "Which gas supplies carbon for glucose production during photosynthesis?",
  "options": [
   "Hydrogen",
   "Carbon dioxide",
   "Oxygen",
   "Nitrogen"
  ],
  "answer": "Carbon dioxide",
  "explanation": "Plants fix carbon dioxide into organic molecules.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-03",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Transport",
  "question": "What is osmosis?",
  "options": [
   "Net movement of water across a partially permeable membrane down its water-potential gradient",
   "Movement of oxygen through arteries",
   "Movement of any solute against its gradient",
   "Movement of proteins by mitosis"
  ],
  "answer": "Net movement of water across a partially permeable membrane down its water-potential gradient",
  "explanation": "Osmosis specifically concerns water moving from higher to lower water potential.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-04",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Enzymes",
  "question": "Why can very high temperatures reduce enzyme activity permanently?",
  "options": [
   "They create more substrate",
   "They stop all molecular motion",
   "They convert enzymes into DNA",
   "They can denature the enzyme's active site"
  ],
  "answer": "They can denature the enzyme's active site",
  "explanation": "Heat can disrupt the enzyme's three-dimensional structure.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-05",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Inheritance",
  "question": "For a cross Aa × Aa, assuming complete dominance, what fraction is expected to have genotype aa?",
  "options": [
   "3/4",
   "All",
   "1/4",
   "1/2"
  ],
  "answer": "1/4",
  "explanation": "The four equally likely genotype outcomes are AA, Aa, Aa and aa.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BIOLOGY-06",
  "subject": "School biology",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Ecology",
  "question": "What is the role of decomposers in nutrient cycling?",
  "options": [
   "Produce all food using sunlight",
   "Break down dead organic matter and release nutrients",
   "Create energy from nothing",
   "Prevent all respiration"
  ],
  "answer": "Break down dead organic matter and release nutrients",
  "explanation": "Decomposition returns nutrients to ecosystems.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-01",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Grammar",
  "question": "Choose the sentence with correct subject–verb agreement.",
  "options": [
   "The list of books is on the desk.",
   "The list of books are on the desk.",
   "The list of books were on the desk.",
   "The list of books be on the desk."
  ],
  "answer": "The list of books is on the desk.",
  "explanation": "The singular subject is 'list', not 'books'.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-02",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Punctuation",
  "question": "Which sentence correctly uses an apostrophe to show singular possession?",
  "options": [
   "The students notebook is open.",
   "The student notebook's is open.",
   "The student's notebook are open.",
   "The student's notebook is open."
  ],
  "answer": "The student's notebook is open.",
  "explanation": "The apostrophe before s indicates one student owns the notebook.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-03",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Reading inference",
  "question": "A character checks the clock repeatedly before an interview. Which inference is best supported?",
  "options": [
   "The interview has been cancelled.",
   "The clock is broken.",
   "The character is concerned about time.",
   "The character definitely dislikes the interviewer."
  ],
  "answer": "The character is concerned about time.",
  "explanation": "Repeated clock-checking supports concern about timing, not the other claims.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-04",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Vocabulary",
  "question": "Choose the closest meaning of 'concise'.",
  "options": [
   "Unrelated",
   "Brief and clear",
   "Lengthy and detailed",
   "Uncertain"
  ],
  "answer": "Brief and clear",
  "explanation": "Concise language expresses ideas clearly in few words.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-05",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Cohesion",
  "question": "Which connector best introduces a contrast?",
  "options": [
   "However",
   "Therefore",
   "Furthermore",
   "For example"
  ],
  "answer": "However",
  "explanation": "However signals a contrast with a previous idea.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ENGLISH-06",
  "subject": "School English",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Writing purpose",
  "question": "Which opening is most appropriate for a formal email requesting course information?",
  "options": [
   "Hey, send me everything now.",
   "Yo, what's the deal?",
   "Tell me stuff.",
   "Dear Admissions Team, I am writing to ask about the course entry requirements."
  ],
  "answer": "Dear Admissions Team, I am writing to ask about the course entry requirements.",
  "explanation": "A formal request states its purpose politely and clearly.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-01",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Binary",
  "question": "What is the decimal value of binary 1011?",
  "options": [
   "13",
   "1011",
   "11",
   "9"
  ],
  "answer": "11",
  "explanation": "8 + 0 + 2 + 1 = 11.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-02",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Algorithms",
  "question": "A loop runs for i = 1, 2, 3 and adds i to a total initially 0. What is the final total?",
  "options": [
   "9",
   "6",
   "3",
   "4"
  ],
  "answer": "6",
  "explanation": "The total becomes 1, then 3, then 6.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-03",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Logic",
  "question": "For Boolean values A = true and B = false, what is A AND B?",
  "options": [
   "False",
   "True",
   "Undefined",
   "2"
  ],
  "answer": "False",
  "explanation": "AND is true only when both inputs are true.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-04",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Databases",
  "question": "What is a primary key used for?",
  "options": [
   "Sorting every table alphabetically",
   "Encrypting every field",
   "Storing only images",
   "Uniquely identifying a row"
  ],
  "answer": "Uniquely identifying a row",
  "explanation": "A primary key uniquely identifies records in a table.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-05",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Networks",
  "question": "What is the usual purpose of DNS?",
  "options": [
   "Replacing encryption",
   "Generating passwords",
   "Resolving domain names to resource records such as IP addresses",
   "Compressing every web page"
  ],
  "answer": "Resolving domain names to resource records such as IP addresses",
  "explanation": "DNS is a distributed naming system that can resolve host names to IP addresses.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMPUTING-06",
  "subject": "School computer science",
  "scope": "Classes 9–12 / Cambridge foundation",
  "topic": "Cyber awareness",
  "question": "A message asks you to enter your password on an unexpected link. What is the safest first response?",
  "options": [
   "Disable security updates",
   "Verify through the service's known official site or support channel",
   "Enter the password immediately",
   "Forward the link to everyone"
  ],
  "answer": "Verify through the service's known official site or support channel",
  "explanation": "Avoid the link and verify the request independently.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-01",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Gross profit",
  "question": "Sales revenue is PKR 90,000 and cost of goods sold is PKR 60,000. What is gross profit?",
  "options": [
   "PKR 30,000",
   "PKR 150,000",
   "PKR 60,000",
   "PKR 90,000"
  ],
  "answer": "PKR 30,000",
  "explanation": "Gross profit = sales minus cost of goods sold.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-02",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Trade",
  "question": "What is an invoice?",
  "options": [
   "A guarantee of payment received",
   "A bank loan agreement",
   "A stock count sheet",
   "A document requesting payment for supplied goods or services"
  ],
  "answer": "A document requesting payment for supplied goods or services",
  "explanation": "An invoice records the amount billed; a receipt confirms payment.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-03",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Assets",
  "question": "Which is usually a current asset for a trading business?",
  "options": [
   "Long-term borrowing",
   "Owner's capital",
   "Inventory held for resale",
   "A factory building"
  ],
  "answer": "Inventory held for resale",
  "explanation": "Inventory is generally expected to be sold in the operating cycle.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-04",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Demand",
  "question": "Other factors equal, what usually happens to quantity demanded when a product's price rises?",
  "options": [
   "It becomes supply",
   "It decreases",
   "It always increases",
   "It must stay constant"
  ],
  "answer": "It decreases",
  "explanation": "The law of demand describes an inverse price–quantity relationship, other things equal.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-05",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Business ownership",
  "question": "What is a common feature of a partnership?",
  "options": [
   "Two or more persons carry on business together",
   "Every partner necessarily has limited liability",
   "It cannot employ anyone",
   "It must be publicly listed"
  ],
  "answer": "Two or more persons carry on business together",
  "explanation": "Partners conduct a business together; liability depends on the legal form.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-COMMERCE-06",
  "subject": "School commerce",
  "scope": "Classes 9–12 / introductory commerce",
  "topic": "Cash flow",
  "question": "A cash-only business begins with PKR 5,000, receives PKR 12,000 and pays PKR 9,000. What is closing cash?",
  "options": [
   "PKR 26,000",
   "PKR 3,000",
   "PKR 2,000",
   "PKR 8,000"
  ],
  "answer": "PKR 8,000",
  "explanation": "Opening cash plus receipts minus payments = 5,000 + 12,000 − 9,000.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-01",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Double entry",
  "question": "A business buys equipment for cash. Which entries record the purchase?",
  "options": [
   "Debit sales; credit cash",
   "Debit expense; credit sales",
   "Debit equipment; credit cash",
   "Debit cash; credit equipment"
  ],
  "answer": "Debit equipment; credit cash",
  "explanation": "An asset increases and another asset decreases.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-02",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Accruals",
  "question": "An electricity expense of PKR 12,000 relates to the current period but is unpaid. What is the adjustment?",
  "options": [
   "No expense until cash is paid",
   "Debit electricity expense; credit accrual liability",
   "Debit cash; credit electricity expense",
   "Debit accrual liability; credit sales"
  ],
  "answer": "Debit electricity expense; credit accrual liability",
  "explanation": "Accrual accounting recognises expenses in the period incurred.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-03",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Depreciation",
  "question": "Equipment costs 100,000, residual value is 10,000 and useful life is 5 years. Annual straight-line depreciation?",
  "options": [
   "18,000",
   "20,000",
   "22,000",
   "10,000"
  ],
  "answer": "18,000",
  "explanation": "Depreciable amount is 90,000; divide by five.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-04",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Contribution",
  "question": "Selling price per unit is 80 and variable cost per unit is 50. Contribution per unit?",
  "options": [
   "130",
   "50",
   "80",
   "30"
  ],
  "answer": "30",
  "explanation": "Contribution is selling price less variable cost.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-05",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Break-even",
  "question": "Fixed costs are 12,000 and contribution per unit is 30. Break-even sales volume?",
  "options": [
   "12,030 units",
   "30 units",
   "400 units",
   "360,000 units"
  ],
  "answer": "400 units",
  "explanation": "Break-even units = fixed costs divided by unit contribution.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-06",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Audit evidence",
  "question": "Which procedure directly obtains a bank balance confirmation from the bank?",
  "options": [
   "Reading an advertisement",
   "External confirmation",
   "Inquiry of the sales clerk",
   "Reperforming depreciation"
  ],
  "answer": "External confirmation",
  "explanation": "External confirmation obtains information from an independent third party.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-07",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Financial analysis",
  "question": "Current assets are 150,000 and current liabilities are 100,000. Current ratio?",
  "options": [
   "1.5:1",
   "0.67:1",
   "2.5:1",
   "50,000:1"
  ],
  "answer": "1.5:1",
  "explanation": "Current assets divided by current liabilities = 1.5.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ACCA-08",
  "subject": "ACCA preparation",
  "scope": "Foundation to applied and strategic concepts; independent practice",
  "topic": "Ethics",
  "question": "An accountant discovers a material error in a report already sent to management. What is the appropriate initial professional action?",
  "options": [
   "Hide it to avoid embarrassment",
   "Alter the record without documentation",
   "Ignore it because the report was sent",
   "Raise the error promptly and seek correction through appropriate channels"
  ],
  "answer": "Raise the error promptly and seek correction through appropriate channels",
  "explanation": "Integrity requires truthful reporting and appropriate corrective action.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-01",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "SMART objectives",
  "question": "Which objective is measurable and time-bound?",
  "options": [
   "Be the best business",
   "Make everyone happy",
   "Reduce average response time from 24 to 12 hours by 30 June",
   "Improve service sometime"
  ],
  "answer": "Reduce average response time from 24 to 12 hours by 30 June",
  "explanation": "The objective specifies a baseline, target and deadline.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-02",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Operations",
  "question": "A process can handle 20 jobs/hour at stage A and 12 at stage B. Assuming both stages are needed, what is maximum steady throughput?",
  "options": [
   "8 jobs/hour",
   "12 jobs/hour",
   "32 jobs/hour",
   "20 jobs/hour"
  ],
  "answer": "12 jobs/hour",
  "explanation": "The slower stage constrains throughput.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-03",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Marketing",
  "question": "What does market segmentation involve?",
  "options": [
   "Dividing a market into groups with relevant shared characteristics",
   "Selling every product at the same price",
   "Eliminating customer research",
   "Replacing all competitors"
  ],
  "answer": "Dividing a market into groups with relevant shared characteristics",
  "explanation": "Segmentation helps tailor offers to different groups.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-04",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Leadership",
  "question": "Which action best supports constructive feedback?",
  "options": [
   "Criticise personal character",
   "Discuss performance only through rumours",
   "Give vague criticism without evidence",
   "Describe observed behaviour, its effect and a specific improvement"
  ],
  "answer": "Describe observed behaviour, its effect and a specific improvement",
  "explanation": "Specific, evidence-based feedback is actionable.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-05",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Risk management",
  "question": "A risk has high impact and high likelihood. What should a manager usually do?",
  "options": [
   "Assume all risks are equal",
   "Delete the risk register",
   "Prioritise assessment and appropriate mitigation",
   "Ignore it until it happens"
  ],
  "answer": "Prioritise assessment and appropriate mitigation",
  "explanation": "Likelihood and impact guide prioritisation, with context.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-BUSINESS-06",
  "subject": "Business management",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Research",
  "question": "Which source best supports a claim about your own centre's attendance last month?",
  "options": [
   "A guess from last year",
   "Verified attendance records for that period",
   "An unrelated online opinion",
   "A competitor's advert"
  ],
  "answer": "Verified attendance records for that period",
  "explanation": "The centre's verified records are directly relevant evidence.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-01",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Person-centred care",
  "question": "Which action best respects a service user's preferences?",
  "options": [
   "Ask about preferences and involve them in decisions as appropriate",
   "Assume everyone wants the same support",
   "Ignore their communication needs",
   "Make choices without explanation"
  ],
  "answer": "Ask about preferences and involve them in decisions as appropriate",
  "explanation": "Person-centred support involves the individual and respects choices.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-02",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Confidentiality",
  "question": "A colleague without an authorised need asks for a client's private details. What is the appropriate response?",
  "options": [
   "Share the entire file",
   "Post it in a group chat",
   "Leave the file in a public area",
   "Do not disclose; follow the organisation's information-sharing policy"
  ],
  "answer": "Do not disclose; follow the organisation's information-sharing policy",
  "explanation": "Sensitive information should be shared only through authorised, necessary routes.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-03",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Safeguarding",
  "question": "A learner reports a concern about possible abuse. What is the appropriate response in a care training setting?",
  "options": [
   "Investigate alone and confront everyone",
   "Ignore the report without evidence",
   "Listen, record factual information and follow the safeguarding reporting procedure",
   "Promise absolute secrecy"
  ],
  "answer": "Listen, record factual information and follow the safeguarding reporting procedure",
  "explanation": "Follow designated reporting channels; avoid promises or independent investigations.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-04",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Infection prevention",
  "question": "What is a key purpose of appropriate hand hygiene?",
  "options": [
   "Remove the need for training",
   "Reduce transmission of microorganisms",
   "Replace every other infection-control measure",
   "Guarantee there can never be an infection"
  ],
  "answer": "Reduce transmission of microorganisms",
  "explanation": "Hand hygiene helps interrupt transmission but is only one control.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-05",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Communication",
  "question": "Which action supports a person with hearing difficulties?",
  "options": [
   "Ask how they prefer to communicate and use suitable adjustments",
   "Speak only while facing away",
   "Assume they cannot participate",
   "Avoid giving information"
  ],
  "answer": "Ask how they prefer to communicate and use suitable adjustments",
  "explanation": "Communication adjustments should reflect individual needs.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-CARE-06",
  "subject": "Health and social care",
  "scope": "Vocational and diploma preparation, Levels 2–6 concepts",
  "topic": "Record keeping",
  "question": "Which note is most appropriate in a professional care record?",
  "options": [
   "Unverified rumours stated as facts",
   "A sarcastic personal comment",
   "An undocumented alteration",
   "A dated factual observation with actions and appropriate attribution"
  ],
  "answer": "A dated factual observation with actions and appropriate attribution",
  "explanation": "Accurate factual records support accountability and continuity.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-01",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "Cloud",
  "question": "What does horizontal scaling usually mean?",
  "options": [
   "Removing the network",
   "Replacing all software with a spreadsheet",
   "Adding more instances to share workload",
   "Increasing RAM in one server only"
  ],
  "answer": "Adding more instances to share workload",
  "explanation": "Horizontal scaling adds instances; vertical scaling changes capacity of one instance.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-02",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "Identity security",
  "question": "Which principle limits an account to only the permissions necessary for its task?",
  "options": [
   "Shared root credentials",
   "Least privilege",
   "Unlimited delegation",
   "Public-by-default access"
  ],
  "answer": "Least privilege",
  "explanation": "Least privilege reduces unnecessary access and potential impact.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-03",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "Python",
  "question": "What does len([4, 7, 9]) return in Python?",
  "options": [
   "3",
   "20",
   "9",
   "0"
  ],
  "answer": "3",
  "explanation": "len returns the number of elements.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-04",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "SQL",
  "question": "Which SQL clause filters rows before grouping?",
  "options": [
   "ORDER BY",
   "SELECT DISTINCT",
   "LIMIT",
   "WHERE"
  ],
  "answer": "WHERE",
  "explanation": "WHERE filters source rows; HAVING filters groups.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-05",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "AI evaluation",
  "question": "A model performs well on its training examples but poorly on new examples. Which issue is suggested?",
  "options": [
   "Perfect generalisation",
   "Encryption failure",
   "Overfitting",
   "Guaranteed fairness"
  ],
  "answer": "Overfitting",
  "explanation": "Overfitting captures training-specific patterns that do not generalise well.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-TECHNOLOGY-06",
  "subject": "Technology and AI",
  "scope": "Introductory certification preparation / vocational practice",
  "topic": "Data privacy",
  "question": "What should you do before providing student data to an external AI tool?",
  "options": [
   "Assume consent for any use",
   "Verify authority, necessity, permitted data use and privacy safeguards",
   "Upload every record by default",
   "Remove only the file extension"
  ],
  "answer": "Verify authority, necessity, permitted data use and privacy safeguards",
  "explanation": "Use approved tools and share only authorised, necessary information.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-01",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Reading evidence",
  "question": "A notice states: 'The library opens at 9 am on weekdays. Saturday hours are under review.' Are Saturday opening hours confirmed?",
  "options": [
   "No; the notice says they are under review",
   "Yes, 9 am",
   "Yes, all day",
   "Yes, the library is closed"
  ],
  "answer": "No; the notice says they are under review",
  "explanation": "Use the stated evidence; do not infer a Saturday timetable.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-02",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Reading paraphrase",
  "question": "Which phrase has the closest meaning to 'the number rose gradually'?",
  "options": [
   "The figure fell sharply",
   "The figure remained unchanged",
   "The figure disappeared",
   "The figure increased steadily"
  ],
  "answer": "The figure increased steadily",
  "explanation": "Gradual rising describes a steady increase.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-03",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Writing overview",
  "question": "Data: online enrolments rose from 200 to 300; campus enrolments stayed at 220. Which overview is accurate?",
  "options": [
   "Campus enrolments grew faster.",
   "Online enrolments were unchanged.",
   "Online enrolments increased while campus enrolments were stable.",
   "Both figures decreased."
  ],
  "answer": "Online enrolments increased while campus enrolments were stable.",
  "explanation": "The overview summarises the two main observed trends without adding causes.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-04",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Formal correspondence",
  "question": "Choose the most appropriate formal request.",
  "options": [
   "You better send the date.",
   "Could you please confirm the registration deadline?",
   "Tell me the date now!",
   "What's up, deadline?"
  ],
  "answer": "Could you please confirm the registration deadline?",
  "explanation": "Polite modal language suits formal enquiries.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-05",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Speaking development",
  "question": "Which response most directly develops the answer to 'Why do you enjoy reading?'",
  "options": [
   "I enjoy reading because it helps me explore new ideas, especially through biographies.",
   "Yes.",
   "Reading.",
   "I have a pen."
  ],
  "answer": "I enjoy reading because it helps me explore new ideas, especially through biographies.",
  "explanation": "The response answers why and adds a relevant example.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-IELTS-06",
  "subject": "IELTS and English communication",
  "scope": "Independent Academic / General Training practice",
  "topic": "Listening preparation",
  "question": "A teacher reads: 'The session starts at ten—sorry, at half past ten.' What time should a listener record?",
  "options": [
   "10:00",
   "11:30",
   "12:30",
   "10:30"
  ],
  "answer": "10:30",
  "explanation": "The speaker corrects the first time; use the final confirmed time.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-GERMAN-01",
  "subject": "German",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Introductions",
  "question": "Which German phrase means 'My name is Sara'?",
  "options": [
   "Ich bin aus Sara.",
   "Ich habe Sara.",
   "Ich heiße Sara.",
   "Ich wohne in Sara."
  ],
  "answer": "Ich heiße Sara.",
  "explanation": "Ich heiße means 'my name is'.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-GERMAN-02",
  "subject": "German",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Present tense",
  "question": "Complete: Ich ___ in Jhelum. (wohnen)",
  "options": [
   "wohnen",
   "wohne",
   "wohnst",
   "wohnt"
  ],
  "answer": "wohne",
  "explanation": "The first-person singular present form is wohne.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-GERMAN-03",
  "subject": "German",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Time",
  "question": "What does 'um acht Uhr' mean?",
  "options": [
   "At eight o'clock",
   "For eight days",
   "After eight weeks",
   "At half past seven"
  ],
  "answer": "At eight o'clock",
  "explanation": "Um is used before a clock time.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-GERMAN-04",
  "subject": "German",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Polite requests",
  "question": "Which asks politely where the station is?",
  "options": [
   "Guten Abend, ich bin der Bahnhof.",
   "Woher ist das Buch?",
   "Ich esse den Bahnhof.",
   "Entschuldigung, wo ist der Bahnhof?"
  ],
  "answer": "Entschuldigung, wo ist der Bahnhof?",
  "explanation": "Entschuldigung means excuse me; wo ist asks where something is.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-FRENCH-01",
  "subject": "French",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Introductions",
  "question": "Which means 'I am called Ali'?",
  "options": [
   "Je parle Ali.",
   "J'ai Ali.",
   "Je m'appelle Ali.",
   "J'habite Ali."
  ],
  "answer": "Je m'appelle Ali.",
  "explanation": "Je m'appelle introduces your name.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-FRENCH-02",
  "subject": "French",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Present tense",
  "question": "Complete: Nous ___ français. (parler)",
  "options": [
   "parlent",
   "parlons",
   "parlez",
   "parle"
  ],
  "answer": "parlons",
  "explanation": "Nous takes the -ons ending for regular -er verbs.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-FRENCH-03",
  "subject": "French",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Directions",
  "question": "What does 'à gauche' mean?",
  "options": [
   "To the left",
   "To the right",
   "Straight ahead",
   "Tomorrow"
  ],
  "answer": "To the left",
  "explanation": "À gauche means left.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-FRENCH-04",
  "subject": "French",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Polite requests",
  "question": "Which asks 'How much does this cost?'",
  "options": [
   "Où habitez-vous ?",
   "Quelle heure est-il ?",
   "Comment allez-vous ?",
   "Combien ça coûte ?"
  ],
  "answer": "Combien ça coûte ?",
  "explanation": "Combien asks how much.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ITALIAN-01",
  "subject": "Italian",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Introductions",
  "question": "Which Italian phrase means 'My name is Sara'?",
  "options": [
   "Ho Sara.",
   "Parlo Sara.",
   "Mi chiamo Sara.",
   "Abito Sara."
  ],
  "answer": "Mi chiamo Sara.",
  "explanation": "Mi chiamo is the standard name introduction.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ITALIAN-02",
  "subject": "Italian",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Present tense",
  "question": "Complete: Noi ___ italiano. (parlare)",
  "options": [
   "parlano",
   "parliamo",
   "parlate",
   "parlo"
  ],
  "answer": "parliamo",
  "explanation": "Noi takes -iamo with parlare.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ITALIAN-03",
  "subject": "Italian",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Directions",
  "question": "What does 'a destra' mean?",
  "options": [
   "To the right",
   "To the left",
   "At night",
   "Next week"
  ],
  "answer": "To the right",
  "explanation": "A destra means right.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-ITALIAN-04",
  "subject": "Italian",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Polite requests",
  "question": "Which asks where the station is?",
  "options": [
   "Quanto costa?",
   "Come ti chiami?",
   "Che ore sono?",
   "Dov'è la stazione?"
  ],
  "answer": "Dov'è la stazione?",
  "explanation": "Dov'è means 'where is'.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-SPANISH-01",
  "subject": "Spanish",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Introductions",
  "question": "Which means 'My name is Ali'?",
  "options": [
   "Tengo Ali.",
   "Hablo Ali.",
   "Me llamo Ali.",
   "Vivo Ali."
  ],
  "answer": "Me llamo Ali.",
  "explanation": "Me llamo introduces your name.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-SPANISH-02",
  "subject": "Spanish",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Present tense",
  "question": "Complete: Nosotros ___ español. (hablar)",
  "options": [
   "hablas",
   "hablamos",
   "hablan",
   "hablo"
  ],
  "answer": "hablamos",
  "explanation": "Nosotros takes -amos with hablar.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-SPANISH-03",
  "subject": "Spanish",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Directions",
  "question": "What does 'a la izquierda' mean?",
  "options": [
   "To the left",
   "To the right",
   "Yesterday",
   "At midday"
  ],
  "answer": "To the left",
  "explanation": "Izquierda means left.",
  "revision": 1,
  "status": "draft_review_required"
 },
 {
  "id": "UP-FQ3-SPANISH-04",
  "subject": "Spanish",
  "scope": "A1–A2 communication; independent practice",
  "topic": "Polite requests",
  "question": "Which asks 'How much does it cost?'",
  "options": [
   "¿Dónde está?",
   "¿Cómo te llamas?",
   "¿Qué hora es?",
   "¿Cuánto cuesta?"
  ],
  "answer": "¿Cuánto cuesta?",
  "explanation": "Cuánto asks how much; cuesta means costs.",
  "revision": 1,
  "status": "draft_review_required"
 },
 ...ORIGINAL_FORMATIVE_EXPANSION,
 ...CALCULATION_PRACTICE
];
