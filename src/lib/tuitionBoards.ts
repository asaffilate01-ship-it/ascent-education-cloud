/** Display names for tuition curriculum routes stored on school_tuition_tracks. */
const labels: Record<string, string> = {
  FBISE: 'Federal Board (FBISE)', Punjab_BISE: 'Punjab Board (BISE)', Sindh_BISE: 'Sindh Board', KPK_BISE: 'Khyber Pakhtunkhwa Board',
  Balochistan_BISE: 'Balochistan Board', AJK_BISE: 'AJK Board', AKU_EB: 'Aga Khan Board (AKU-EB)', Cambridge_OL: 'Cambridge O Level',
  Cambridge_IGCSE: 'Cambridge IGCSE / O Level', Cambridge_AL: 'Cambridge AS & A Level',
  Edexcel_IGCSE: 'Pearson Edexcel International GCSE', Edexcel_IAL: 'Pearson Edexcel International A Level', Other: 'Other board',
};
export const tuitionBoardOrder = Object.keys(labels);
export function tuitionBoardLabel(route: string) { return labels[route] || route; }
