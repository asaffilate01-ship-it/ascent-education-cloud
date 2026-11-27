import type {FormativeQuestion} from './formativeQuestions';
type Seed=readonly [topic:string,question:string,answer:string,wrong1:string,wrong2:string,wrong3:string,explanation:string];
type Group={code:string;subject:string;scope:string;items:readonly Seed[]};
const groups:readonly Group[]=[
 {code:'MATH',subject:'School maths',scope:'Classes 8–12 / independent practice',items:[
 ['Indices','Simplify 2³ × 2⁴.','128','64','32','256','With the same base, add exponents: 2⁷ = 128.'],
 ['Statistics','Find the median of 3, 7, 9, 12, 20.','9','7','10.2','12','The median is the middle value of the ordered list.'],
 ['Trigonometry','In a right-angled triangle, opposite = 6 and hypotenuse = 10. What is sin θ?','0.6','0.8','1.67','0.4','Sine is opposite divided by hypotenuse: 6/10.']
 ]},
 {code:'PHYS',subject:'School physics',scope:'Classes 8–12 / independent practice',items:[
 ['Energy','What energy transfer occurs in an electric kettle?','Electrical to thermal','Thermal to electrical','Chemical to sound','Light to kinetic','The heating element converts electrical energy into thermal energy.'],
 ['Waves','What happens to wavelength when frequency doubles at constant wave speed?','It halves','It doubles','It stays unchanged','It quadruples','v = fλ, so at constant v the wavelength is inversely proportional to frequency.'],
 ['Circuits','Two identical resistors are connected in series. Their total resistance is:','Twice one resistor','Half one resistor','Equal to one resistor','Zero','Series resistances add.']
 ]},
 {code:'CHEM',subject:'School chemistry',scope:'Classes 8–12 / independent practice',items:[
 ['Atomic structure','An atom has 17 protons and 18 neutrons. Its mass number is:','35','17','18','1','Mass number is the number of protons plus neutrons.'],
 ['Chemical reactions','Which observation most directly suggests a gas is produced during a reaction?','Bubbles form in the liquid','A solid is cut into smaller pieces','A liquid is poured into a new container','A thermometer is placed in the liquid','Bubbles can indicate a gaseous product; additional testing may identify it.'],
 ['Acids and bases','What is the usual pH of a neutral aqueous solution at 25 °C?','7','0','14','1','At 25 °C, neutral water has equal hydrogen and hydroxide ion concentrations and pH 7.']
 ]},
 {code:'BIO',subject:'School biology',scope:'Classes 8–12 / independent practice',items:[
 ['Transport','Which plant tissue transports water and mineral ions from roots?','Xylem','Phloem','Epidermis','Palisade mesophyll','Xylem transports water and dissolved mineral ions; phloem transports assimilates.'],
 ['Enzymes','Why can excessive heat reduce enzyme activity?','It can alter the active site shape','It always increases substrate supply','It changes enzymes into carbohydrates','It removes all water instantly','Denaturation can change the enzyme shape so the substrate no longer binds effectively.'],
 ['Genetics','A diploid cell with 46 chromosomes undergoes ordinary mitosis. How many chromosomes does each daughter cell have?','46','23','92','12','Mitosis normally preserves the chromosome number in each daughter cell.']
 ]},
 {code:'ENG',subject:'School English',scope:'Classes 8–12 / independent practice',items:[
 ['Grammar','Which sentence uses the present perfect tense correctly?','She has finished her homework.','She have finished her homework.','She has finish her homework.','She is finished her homework yesterday.','The present perfect uses has or have followed by a past participle; finished is the past participle here.'],
 ['Reading','What is an inference?','A conclusion supported by clues in the text','A direct quotation only','The title of the text','An unrelated personal preference','An inference combines textual evidence with reasoning.'],
 ['Writing','Which connective signals a contrast?','However','Furthermore','Therefore','Similarly','However introduces a contrasting point.']
 ]},
 {code:'CS',subject:'School computer science',scope:'Classes 8–12 / independent practice',items:[
 ['Algorithms','What is a loop used for in an algorithm?','Repeating a sequence of instructions','Renaming a file','Deleting every variable','Preventing all input','A loop repeats instructions according to a condition or fixed count.'],
 ['Binary','Convert binary 1010 to decimal.','10','8','12','5','The place values are 8, 4, 2 and 1; 8 + 2 = 10.'],
 ['Networks','Which practice most directly protects an account against a stolen password alone?','Multi-factor authentication','Increasing monitor brightness','Disabling updates','Reusing the same password','An additional authentication factor can prevent access when only the password is stolen.']
 ]},
 {code:'COM',subject:'School commerce',scope:'Classes 9–12 / independent practice',items:[
 ['Business ownership','What distinguishes a sole trader from a partnership?','A sole trader has one owner','A sole trader cannot sell goods','A partnership must be a charity','A partnership has exactly one owner','A sole trader is owned by one person; a partnership generally has two or more partners.'],
 ['Trade','What is an import?','A good or service purchased from another country','A good sold exclusively abroad','A domestic wage payment','An internal stock transfer','Imports enter a country from overseas suppliers.'],
 ['Banking','What is the main purpose of a bank reconciliation?','Explain differences between bank and cash-book records','Calculate employee holidays','Count stock by weight','Replace all invoices','Reconciliation identifies timing differences and errors between the two records.']
 ]},
 {code:'ACCA',subject:'ACCA preparation',scope:'Accounting fundamentals / independent practice',items:[
 ['Accruals','A business owes electricity charges for this period but has not paid. What is the usual accrual entry?','Debit expense, credit accrual liability','Debit liability, credit expense','Debit cash, credit revenue','Debit inventory, credit cash','Recognise the expense in the period incurred and the unpaid liability.'],
 ['Control accounts','Which item normally reduces a trade receivables control account?','A customer payment','A new credit sale','An increase in sales tax charged on a credit sale','A dishonoured customer cheque','A customer payment reduces the receivable balance.'],
 ['Audit evidence','Which evidence generally provides stronger assurance about a bank balance?','A confirmation obtained directly from the bank','An unsupported verbal statement','A blank bank statement template','A sales brochure','Independent external confirmation is generally more reliable than an unsupported internal assertion.']
 ]},
 {code:'BUS',subject:'Business management',scope:'Level 3–6 conceptual preparation / independent practice',items:[
 ['Operations','What is a key purpose of a capacity plan?','Align available resources with expected demand','Remove all demand forecasts','Guarantee unlimited sales','Avoid measuring output','Capacity planning compares expected workload against available people, equipment and time.'],
 ['Strategy','In a SWOT analysis, a new competitor entering the market is usually a:','Threat','Strength','Internal resource','Accounting asset','A competitor is an external factor that may threaten performance.'],
 ['Marketing','What does segmentation involve?','Grouping customers with similar needs','Selling only at a fixed price','Eliminating customer research','Recording staff absence','Segmentation identifies groups so offers can better address their needs.']
 ]},
 {code:'HSC',subject:'Health and social care',scope:'Level 3–6 conceptual preparation / independent practice',items:[
 ['Person-centred care','Which action best demonstrates person-centred support?','Discussing preferences and involving the person in decisions','Choosing every activity without consultation','Ignoring communication needs','Using identical plans regardless of needs','Person-centred support respects preferences, choices and individual circumstances.'],
 ['Confidentiality','When handling care information, what is the best general approach?','Share only with authorised people for an appropriate purpose','Post it in a public group','Discuss it casually with visitors','Keep it on an unlocked shared device','Access should be limited to authorised purposes; safeguarding and legal duties may require appropriate escalation.'],
 ['Safeguarding','A learner notices a possible safeguarding concern. What should they do?','Follow the setting’s reporting procedure promptly','Investigate alone without guidance','Promise absolute secrecy','Ignore it until proof is certain','Follow the safeguarding policy and report concerns to the designated responsible person.']
 ]},
 {code:'TECH',subject:'Technology and AI',scope:'Technology certification concepts / independent practice',items:[
 ['Cloud computing','What is a practical benefit of cloud elasticity?','Adjusting resources as workload changes','Guaranteeing zero cost','Removing the need for authentication','Making every application offline','Elastic systems can scale resources up or down to match demand.'],
 ['Databases','What does a primary key do?','Uniquely identifies a row in a table','Encrypts every database column','Stores every duplicate value','Automatically creates an internet connection','A primary key uniquely identifies a record and cannot be null.'],
 ['AI evaluation','Why test an AI tutor on held-out examples?','To measure performance on examples not used during development','To guarantee every future answer is correct','To remove the need for a teacher','To share learner records publicly','Held-out evaluation helps assess generalisation; it does not guarantee correctness.']
 ]},
 {code:'IELTS',subject:'IELTS and English communication',scope:'Independent English and IELTS preparation',items:[
 ['Reading','A passage says that the library closes at six. The statement says it closes at eight. How should the statement be classified?','False','True','Not given','Opinion','The stated time directly contradicts the passage.'],
 ['Writing','Which opening best introduces a balanced discussion essay?','This essay examines both views before presenting a conclusion.','Everyone must agree with me.','I have no idea what the topic is.','There is only one sentence in this essay.','A clear introduction can outline the discussion without unsupported absolutes.'],
 ['Speaking','Which response develops the answer to “Do you enjoy reading?” most effectively?','Yes, especially biographies, because I learn about real experiences.','Yes.','Reading.','No answer.','An extended response gives a direct answer, detail and a reason.']
 ]},
 {code:'DE',subject:'German',scope:'A1–A2 independent practice',items:[
 ['Greetings','What does “Guten Abend” mean?','Good evening','Good morning','Good night only','See you tomorrow','Guten Abend is an evening greeting.'],
 ['Present tense','Complete: Wir ___ in Jhelum. (wohnen)','wohnen','wohnt','wohnst','wohne','Wir takes the plural verb form wohnen.'],
 ['Shopping','What does “Wie viel kostet das?” mean?','How much does that cost?','Where is the station?','What time is it?','What is your name?','Wie viel asks how much; kostet means costs.']
 ]},
 {code:'FR',subject:'French',scope:'A1–A2 independent practice',items:[
 ['Greetings','What does “Bonsoir” mean?','Good evening','Good morning','Goodbye only','Thank you','Bonsoir is an evening greeting.'],
 ['Present tense','Complete: Vous ___ à Jhelum. (habiter)','habitez','habitons','habite','habitent','Vous takes the ending -ez with regular -er verbs.'],
 ['Travel','What does “Où est la gare ?” mean?','Where is the station?','How much is this?','What is your name?','What time is it?','Où means where; la gare is the railway station.']
 ]},
 {code:'IT',subject:'Italian',scope:'A1–A2 independent practice',items:[
 ['Greetings','What does “Buongiorno” mean?','Good morning / good day','Good night','See you later','Please','Buongiorno is a daytime greeting.'],
 ['Present tense','Complete: Io ___ italiano. (parlare)','parlo','parli','parla','parlano','Io takes the ending -o with parlare in the present tense.'],
 ['Shopping','What does “Quanto costa?” mean?','How much does it cost?','Where are you from?','How old are you?','Where is the station?','Quanto asks how much; costa means costs.']
 ]},
 {code:'ES',subject:'Spanish',scope:'A1–A2 independent practice',items:[
 ['Greetings','What does “Buenos días” mean?','Good morning','Good night','Goodbye','Excuse me','Buenos días is used as a morning greeting.'],
 ['Present tense','Complete: Ella ___ en Pakistán. (vivir)','vive','vivo','vives','viven','Ella takes vive, the third-person singular present form of vivir.'],
 ['Travel','What does “¿Dónde está la biblioteca?” mean?','Where is the library?','How much is the ticket?','What is your name?','When is breakfast?','Dónde asks where; biblioteca means library.']
 ]},
];
export const ORIGINAL_FORMATIVE_EXPANSION:readonly FormativeQuestion[]=groups.flatMap(group=>group.items.map(([topic,question,answer,...rest],index)=>{
 const [wrong1,wrong2,wrong3,explanation]=rest;
 const choices=[wrong1,wrong2,wrong3];choices.splice(index%4,0,answer);
 return {id:'UP-FQ4-'+group.code+'-'+String(index+1).padStart(2,'0'),subject:group.subject,scope:group.scope,topic,question,options:choices,answer,explanation,revision:1,status:'draft_review_required' as const};
}));
