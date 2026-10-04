export const fmtDate = (d?: string | null) => d ? new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)) : '—';
export const SEV_LABEL: Record<string, string> = { critical: 'קריטית', high: 'גבוהה', medium: 'בינונית', 'low-med': 'נמוכה-בינונית', low: 'נמוכה' };
export const SEV_CLASS: Record<string, string> = { critical: 'crit', high: 'high', medium: 'med', 'low-med': 'low', low: 'low' };
export const FSTATUS_LABEL: Record<string, string> = { open: 'פתוח', fixed: 'תוקן', wontfix: 'נסגר בהחלטה', out_of_scope: 'מחוץ לתחום' };
export const ISTATUS_LABEL: Record<string, string> = { open: 'פתוח', in_progress: 'בטיפול', resolved: 'נסגר', wontfix: 'לא יטופל' };
export const TSTATUS_CLASS: Record<string, string> = { open: 'info', in_progress: 'brand', blocked: 'bad', done: 'ok' };
export const impactClass = (lvl: number) => (lvl >= 4 ? 'crit' : lvl >= 3 ? 'high' : lvl >= 2 ? 'med' : 'low');
export const WAVE_NAME: Record<number, string> = { 0: 'תשתית', 1: 'תיקונים שמונעים מהמשפך לעבוד', 2: 'מנועי המרה', 3: 'מדידה, שימור, ערוצים וליטוש', 4: 'השקה', 5: 'אחרי ההשקה' };
export const KIND_LABEL: Record<string, string> = { note: 'הערה', question: 'שאלה', unknown: 'לא ידוע', bug: 'תקלה', idea: 'רעיון' };
