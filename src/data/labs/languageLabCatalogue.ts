// Interactive language-lab content. Audio is spoken by the device voice, so drills work offline once loaded.
export type LabLanguage = 'en' | 'de';
export interface LanguageInfo { id: LabLanguage; label: string; voice: string; aiName: string }
export const LAB_LANGUAGES: LanguageInfo[] = [
  { id: 'en', label: 'English', voice: 'en-GB', aiName: 'English' },
  { id: 'de', label: 'German', voice: 'de-DE', aiName: 'German' },
];
export interface DrillSentence { id: string; language: LabLanguage; topic: string; level: 'A2' | 'B1' | 'B2' | 'C1'; text: string; translation?: string }
export interface SpeakingPrompt { id: string; language: LabLanguage; part: string; prompt: string; prepSeconds: number; speakSeconds: number }
export interface ConversationScenario { id: string; title: string; scenario: string; opener: Record<LabLanguage, string> }

export const DRILL_SENTENCES: DrillSentence[] = [
  { id: 'en-intro-1', language: 'en', topic: 'Introductions', level: 'A2', text: 'My name is Sana and I am from Rawalpindi.' },
  { id: 'en-intro-2', language: 'en', topic: 'Introductions', level: 'A2', text: 'I have two brothers and one sister.' },
  { id: 'en-study-1', language: 'en', topic: 'Study', level: 'B1', text: 'I would like to study computer science at university next year.' },
  { id: 'en-study-2', language: 'en', topic: 'Study', level: 'B1', text: 'The library opens at nine o’clock and closes at eight in the evening.' },
  { id: 'en-study-3', language: 'en', topic: 'Study', level: 'B2', text: 'Could you explain the assessment criteria for this assignment, please?' },
  { id: 'en-travel-1', language: 'en', topic: 'Travel', level: 'B1', text: 'Excuse me, which platform does the train to Manchester leave from?' },
  { id: 'en-travel-2', language: 'en', topic: 'Travel', level: 'B2', text: 'I booked a single room with breakfast for three nights.' },
  { id: 'en-work-1', language: 'en', topic: 'Work', level: 'B2', text: 'I am confident working in a team and meeting tight deadlines.' },
  { id: 'en-work-2', language: 'en', topic: 'Work', level: 'C1', text: 'Although the project was challenging, it significantly improved my problem-solving skills.' },
  { id: 'en-health-1', language: 'en', topic: 'Everyday life', level: 'B1', text: 'I would like to register with a local doctor, please.' },
  { id: 'en-sounds-1', language: 'en', topic: 'Pronunciation: th', level: 'B1', text: 'Three thousand thinkers thought through the theory.' },
  { id: 'en-sounds-2', language: 'en', topic: 'Pronunciation: v and w', level: 'B1', text: 'We visited a very wide valley in the west.' },
  { id: 'de-intro-1', language: 'de', topic: 'Vorstellung', level: 'A2', text: 'Ich heiße Ali und komme aus Pakistan.', translation: 'My name is Ali and I come from Pakistan.' },
  { id: 'de-intro-2', language: 'de', topic: 'Vorstellung', level: 'A2', text: 'Ich lerne seit sechs Monaten Deutsch.', translation: 'I have been learning German for six months.' },
  { id: 'de-study-1', language: 'de', topic: 'Studium', level: 'B1', text: 'Ich möchte an einer Universität in Berlin Informatik studieren.', translation: 'I would like to study computer science at a university in Berlin.' },
  { id: 'de-study-2', language: 'de', topic: 'Studium', level: 'B1', text: 'Wann beginnt das Wintersemester?', translation: 'When does the winter semester start?' },
  { id: 'de-travel-1', language: 'de', topic: 'Reisen', level: 'A2', text: 'Entschuldigung, wo ist der Bahnhof?', translation: 'Excuse me, where is the station?' },
  { id: 'de-work-1', language: 'de', topic: 'Arbeit', level: 'B1', text: 'Ich arbeite gern im Team und bin sehr zuverlässig.', translation: 'I like working in a team and I am very reliable.' },
];

export const SPEAKING_PROMPTS: SpeakingPrompt[] = [
  { id: 'en-p1-home', language: 'en', part: 'IELTS Part 1', prompt: 'Describe your hometown. What do you like most about it?', prepSeconds: 10, speakSeconds: 45 },
  { id: 'en-p1-study', language: 'en', part: 'IELTS Part 1', prompt: 'What are you studying at the moment, and why did you choose it?', prepSeconds: 10, speakSeconds: 45 },
  { id: 'en-p2-person', language: 'en', part: 'IELTS Part 2', prompt: 'Describe a teacher who has influenced you. You should say who they were, what they taught you, how they taught, and explain why they influenced you.', prepSeconds: 60, speakSeconds: 120 },
  { id: 'en-p2-place', language: 'en', part: 'IELTS Part 2', prompt: 'Describe a place in Pakistan you would recommend to a visitor. Say where it is, what people can do there, when is the best time to go, and why you recommend it.', prepSeconds: 60, speakSeconds: 120 },
  { id: 'en-p3-tech', language: 'en', part: 'IELTS Part 3', prompt: 'Do you think online learning will replace classrooms in the future? Why or why not?', prepSeconds: 15, speakSeconds: 90 },
  { id: 'en-job', language: 'en', part: 'Job interview', prompt: 'Tell me about yourself and why you would be a good fit for an office assistant role.', prepSeconds: 20, speakSeconds: 75 },
  { id: 'de-a2-self', language: 'de', part: 'Goethe A2 Sprechen', prompt: 'Stellen Sie sich vor: Name, Alter, Wohnort, Familie, Hobbys und warum Sie Deutsch lernen.', prepSeconds: 20, speakSeconds: 60 },
  { id: 'de-b1-plan', language: 'de', part: 'Goethe B1 Sprechen', prompt: 'Erzählen Sie über Ihre Pläne für die Zukunft. Wo möchten Sie studieren oder arbeiten und warum?', prepSeconds: 30, speakSeconds: 90 },
];

export const CONVERSATIONS: ConversationScenario[] = [
  { id: 'admissions', title: 'University admissions interview', scenario: 'You are an admissions tutor interviewing an applicant from Pakistan for a business or computing degree. Ask about motivation, study plans and goals.',
    opener: { en: 'Hello and welcome. Could you tell me why you would like to study on this course?', de: 'Guten Tag und willkommen. Warum möchten Sie diesen Studiengang studieren?' } },
  { id: 'job', title: 'Job interview', scenario: 'You are a friendly manager interviewing the learner for an entry-level office or customer-service job.',
    opener: { en: 'Thanks for coming in today. Can you start by telling me a little about yourself?', de: 'Danke, dass Sie gekommen sind. Erzählen Sie bitte etwas über sich.' } },
  { id: 'arrival', title: 'Arriving in a new city', scenario: 'You work at an international student help desk and help a newly arrived student find accommodation, transport and a bank.',
    opener: { en: 'Hi there! Welcome to the student help desk. How can I help you today?', de: 'Hallo! Willkommen beim Studierendenservice. Wie kann ich Ihnen helfen?' } },
  { id: 'cafe', title: 'At the café', scenario: 'You are a café server taking an order and making small talk.',
    opener: { en: 'Good morning! What can I get for you today?', de: 'Guten Morgen! Was darf es sein?' } },
];

export const sentenceById = (id?: string | null) => DRILL_SENTENCES.find(s => s.id === id);
export const promptById = (id?: string | null) => SPEAKING_PROMPTS.find(p => p.id === id);
