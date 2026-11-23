/** Public-course FAQ only. Never infer or disclose learner-specific information. */
export type WhatsAppDecision = { kind: 'reply'; body: string } | { kind: 'handoff' };
export function whatsappDecision(message: string): WhatsAppDecision {
  const input = message.normalize('NFKC').toLowerCase().trim().slice(0, 2000);
  if (!input || /\b(stop|unsubscribe|opt.?out)\b|بند|روک/.test(input)) return { kind: 'handoff' };
  // Escalate any identity, academic, welfare, financial or safeguarding request.
  if (/student|child|son|daughter|my class|my fee|my result|attendance|absen|payment|invoice|receipt|grade|report|complain|bully|abuse|safeguard|password|otp|refund|medical|health|emergency|میرے|میرا|فیس|حاضری|نتیجہ/.test(input)) return { kind: 'handoff' };
  if (/\b(hi|hello|hey|salam|salaam|assalam|help)\b|سلام|السلام/.test(input)) return { kind: 'reply', body: 'Welcome to UniPathway! We can help with admissions, IELTS, ACCA, tuition and technology courses. Which would you like to know about? For a person, reply HUMAN. / UniPathway mein khush aamdeed! Urdu mein bhi likh sakte hain.' };
  if (/\b(ielts|english test)\b|آئیلٹس/.test(input)) return { kind: 'reply', body: 'UniPathway offers IELTS learning support. For current classes, pricing and enrolment requirements, our admissions team will confirm the details. What would you like to know? Reply HUMAN for staff.' };
  if (/\b(acca|accountancy|accounting)\b/.test(input)) return { kind: 'reply', body: 'UniPathway provides accountancy and ACCA study support. Our admissions team can confirm levels, current availability and fees. Reply HUMAN to speak with staff.' };
  if (/\b(coding|technology|computing|ai course|aws|microsoft|google|tech course)\b/.test(input)) return { kind: 'reply', body: 'UniPathway can advise on technology and computing learning. Course entry requirements, schedules and fees are confirmed by admissions. Reply HUMAN for staff help.' };
  if (/\b(admission|apply|enrol|enroll|register|course|tuition|class|language)\b|داخلہ|کورس/.test(input)) return { kind: 'reply', body: 'Thanks for your interest in UniPathway. Please share the course or school grade you are interested in. Our admissions team will confirm availability and requirements. Reply HUMAN for staff help.' };
  return { kind: 'handoff' };
}
export function normalizeWhatsAppText(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const message = input as {type?: unknown;text?: {body?: unknown}};
  return message.type === 'text' && typeof message.text?.body === 'string'
    ? message.text.body.slice(0, 4000) : null;
}
