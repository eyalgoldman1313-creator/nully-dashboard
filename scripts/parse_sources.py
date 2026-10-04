#!/usr/bin/env python3
"""Parse the Hebrew analysis files into structured seed data (data/seed/*.json).
Nothing is invented: every field comes from /workspace/analysis/*.md. Ids are kept as in the sources."""
import json, re, sys, pathlib
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/analysis')
OUT = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'seed'
OUT.mkdir(parents=True, exist_ok=True)
wp = (SRC / 'work-plan.md').read_text()
ch = (SRC / 'characterization.md').read_text()
nv = (SRC / 'nully-vs-references.md').read_text()
pr = (SRC / 'claude-code-prompts.md').read_text()
strip = lambda s: re.sub(r'\*\*|`', '', s).strip()
NOW = '2026-10-04T12:00:00+03:00'

# ---------------- waves
WAVES = {0: ('גל 0', 'תשתית'), 1: ('גל 1', 'תיקונים שמונעים מהמשפך לעבוד'), 2: ('גל 2', 'מנועי המרה'),
         3: ('גל 3', 'מדידה, שימור, ערוצים וליטוש'), 4: ('גל 4', 'השקה'), 5: ('גל 5', 'אחרי ההשקה')}

# ---------------- prompts
prompts = {}
for m in re.finditer(r'^### (T\d\.\d+) · (.+?)\n(.*?)(?=^### T\d\.\d+ · |\Z)', pr, re.S | re.M):
    tid, title, body = m.groups()
    cb = re.search(r'```text\n(.*?)\n```', body, re.S)
    prompts[tid] = cb.group(1) if cb else None

# ---------------- work-plan detail sections
details = {}
for m in re.finditer(r'^### (T\d\.\d+) · (.+?)\n(.*?)(?=^### T\d\.\d+ · |^---|^## |\Z)', wp, re.S | re.M):
    tid, title, body = m.groups()
    details[tid] = body.strip()

# ---------------- summary table
LEVELS = [('תשתית', 0), ('נמוכה-בינונית', 1.5), ('בינונית-גבוהה', 2.5), ('נמוכה', 1), ('בינונית', 2), ('גבוהה', 3), ('קריטית', 4)]
def level(s):
    for k, v in LEVELS:
        if k in s: return v
    return 2
def hours(s):
    m = re.search(r'(\d+(?:\.\d+)?)(?:[–-](\d+(?:\.\d+)?))?\s*ש', s)
    if not m: return None, None
    a = float(m.group(1)); b = float(m.group(2) or a)
    return a, b
tasks = []
tbl = wp.split('## טבלת סיכום')[1].split('**סה"כ')[0]
for line in tbl.splitlines():
    if not line.startswith('| '): continue
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) != 8: continue
    mid = strip(c[0])
    if not re.fullmatch(r'T\d\.\d+', mid): continue
    tid, title, source, impact, typ, status_raw, deps, effort = mid, strip(c[1]), strip(c[2]), strip(c[3]), c[4].strip(), c[5].strip(), c[6].strip(), c[7].strip()
    wave = int(tid[1])
    ids = re.findall(r'\b(D\d|A\d+|E\d)\b', strip(status_raw))
    partial = ('🔒*' in status_raw) or ('(' in status_raw and '⏸' in status_raw and status_raw.startswith('✅'))
    blocked = (status_raw.startswith('🔒') and '🔒*' not in status_raw) or status_raw.startswith('⏸')
    blockers = ids if blocked else []
    partial_blockers = ids if (partial and not blocked) else []
    wait_note = None
    if tid == 'T4.2': blockers = ['T4.1']; wait_note = 'אחרי סיום כל השיפורים ו-T4.1, ורק באישור מפורש של אייל. אייל מבצע; Claude Code לא מפרסם.'
    if tid == 'T5.1': blockers = ['D3', 'T4.2']; wait_note = 'חסום עד D3 + השקה ותנועה'
    if tid == 'T5.3': blockers = ['T4.2']; wait_note = 'ממתין לבחירת כלי (אפליקציית referral) + השקה'
    if tid == 'T2.11': wait_note = 'נדחה: התוכן יגיע בהמשך (A16)'
    if tid == 'T3.11': wait_note = 'אופציונלי'
    dep_tasks = re.findall(r'T\d\.\d+', deps)
    dep_inputs = re.findall(r'\b(A\d+|E\d)(?:–A(\d+))?', deps)
    di = []
    for a, b in dep_inputs:
        if b and a.startswith('A'):
            di += [f'A{n}' for n in range(int(a[1:]), int(b) + 1)]
        else: di.append(a)
    if tid == 'T5.1':  # blocked on D3 + launch
        pass
    ef_lo, ef_hi = hours(effort)
    tasks.append(dict(
        id=tid, wave=wave, title=title, source=source,
        finding_ids=sorted(set(re.findall(r'F\d+', source)), key=lambda x: int(x[1:])),
        idea_ids=re.findall(r'💡\s*(\d+)', source),
        impact=impact.replace('(', '').replace(')', '') if False else impact, impact_level=level(impact),
        kind=typ, status='blocked' if blockers else 'open', status_raw=status_raw,
        blockers=blockers, partial_blockers=partial_blockers, wait_note=wait_note,
        depends_on=sorted(set(dep_tasks), key=lambda x: (int(x[1]), int(x[3:]))) if dep_tasks else [],
        needs_inputs=sorted(set(di + [i for i in ids if i.startswith('A') and i not in di])),
        effort=effort, effort_min_h=ef_lo, effort_max_h=ef_hi,
        details=details.get(tid, ''), prompt=prompts.get(tid), sort=len(tasks),
        progress=0, assignee=None, notes=None, updated_at=NOW, updated_by='seed',
    ))
assert len(tasks) == 38, len(tasks)
assert all(t['prompt'] for t in tasks), [t['id'] for t in tasks if not t['prompt']]
# order of 'impact' text e.g. "**קריטית**" stripped already.

# ---------------- inputs (A1..A16, E1)
inputs = []
sec = wp.split('## 📦 מה צריך מאייל')[1].split('## מקרא')[0]
for line in sec.splitlines():
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) == 4 and re.fullmatch(r'A\d+', strip(c[0])):
        used = re.findall(r'T\d\.\d+', c[3])
        inputs.append(dict(id=strip(c[0]), title=strip(c[1]), fmt=c[2].strip(), kind='asset', tasks=used, status='needed', note=None, updated_at=NOW, updated_by='seed'))
e1 = wp.split('## 🛠 E1')[1].split('## 📈 E2')[0]
inputs.append(dict(id='E1', title='צעדי Admin לעברית ול-₪ (אייל מבצע; משפיע גם על הערכה החיה)',
    fmt=re.sub(r'\n+', '\n', e1.split('\n', 1)[1].split('> אחרי')[0]).strip(), kind='admin_action',
    tasks=['T1.3', 'T2.9', 'T3.8'], status='needed', note='אחרי שאייל מאשר שבוצע, המשימות שמסומנות ⏸ E1 משתחררות: T1.3 (החלק של ה-locale), T2.9 (כותרות העגלה), T3.8 (תפריט).', updated_at=NOW, updated_by='seed'))
# link: tasks needing inputs
for t in tasks:
    t['needs_inputs'] = sorted(set(t['needs_inputs'] + [i for i in t['blockers'] + t['partial_blockers'] if re.fullmatch(r'A\d+|E1', i)]), key=lambda x: (x[0], int(x[1:])))

# ---------------- decisions
def sec_between(a, b): return wp.split(a)[1].split(b)[0]
d3_ev = sec_between('## 🔎 D3', '## 💬 D5')
d5_ev = sec_between('## 💬 D5', '## 🛠 E1')
unb = {}
for t in tasks:
    for b in t['blockers'] + t['partial_blockers']:
        unb.setdefault(b, []).append(t['id'])
decisions = [
 dict(id='D1', title='משלוח', question='סף ומחיר משלוח: להתיישר על העיצוב (300) או על הגדרת Shopify (250)?', status='decided',
      options=[dict(id='design', label='העיצוב הוא מקור האמת', detail='חינם לנקודת איסוף מעל 300 ₪, 19 ₪ לנקודת איסוף, 35 ₪ עד הדלת, 20 ₪ שדרוג במנוי'),
               dict(id='shopify', label='הגדרת Shopify', detail='ישראל 35 ₪ קבוע + חינם מ-250 ₪ (מקור: F7)')],
      recommended=None, chosen='design', decided_note='ספק המשלוחים כבר מחובר ונמצא מחוץ לתחום. הוסרו משימות הגדרת המשלוח; נשארו אחידות טקסט ועיצוב (T1.6) ומד משלוח חינם לפי 300 ₪ (T2.9).',
      unblocks=['T1.6', 'T2.9'], evidence=None, source='work-plan §החלטות שהתקבלו; characterization §7; F7'),
 dict(id='D2', title='ערבות', question='ערבות: כן/לא, כמה ימים?', status='decided',
      options=[dict(id='none', label='אין ערבות'), dict(id='g30', label='ערבות 30 יום', detail='כמו Gruns (מקור: F6)'), dict(id='g60', label='ערבות 60 יום', detail='כמו Wonders/Softella (מקור: F6)')],
      recommended=None, chosen='none', decided_note='הוסרו משימת הערבות וכל הרכיבים שתלויים בה. כלל 6: לא מוסיפים תגי ערבות, "ימי ניסיון" או "החזר כספי".',
      unblocks=[], evidence=None, source='work-plan §החלטות שהתקבלו; F6'),
 dict(id='D3', title='איזו אפליקציית מנוי', question='איזו אפליקציית מנוי להתקין (selling plans + פורטל ניהול מנוי בעברית)?', status='open',
      options=[dict(id='shopify-subscriptions', label='Shopify Subscriptions (של Shopify)', detail='נמצאה כנראה אצל Smiley ו-Woof לצד Appstle. כרטיסי ההצעה המותאמים (nully-offer-cards.js) צריכים רק לשלוח selling_plan, לא נדרש ווידג\'ט. סביר שמוסיפה מעט סקריפטים, ושומרת על יתרון "0 סקריפטים צד-ג\'". לבדוק: תמחור ותמיכה בתוכנית Basic; עברית בפורטל; דילוג/השהיה; הנחה קבועה.'),
               dict(id='appstle', label='Appstle', detail='פיצ\'רים רבים (פורטל, דילוג, upsell, נאמנות), פעילה אצל Smiley ו-Woof (ישראליות). לבדוק: משקל הסקריפט; אפשרות לבטל את הווידג\'ט ולהשתמש בכרטיסים שלנו; תמחור.'),
               dict(id='seal', label='Seal Subscriptions', detail='פשוטה יחסית; פעילה אצל Craftly, מותקנת אצל Harmony. הסקריפט נטען בכל עמוד.'),
               dict(id='payeo', label='Payeo', detail='אפליקציה ישראלית עם "מתנות למנויים" (GOOM). פחות מידע; לבדוק תמחור ותמיכה.')],
      recommended='shopify-subscriptions', decided_note=None, unblocks=['T1.2', 'T2.1', 'T3.5', 'T5.1', 'T5.4'],
      evidence=d3_ev.strip(), source='work-plan §D3; d3/D3-evidence.md'),
 dict(id='D4', title='קהל יעד', question='קהל ראשי להשקה', status='decided',
      options=[dict(id='parents', label='הורים לילדים'), dict(id='students', label='סטודנטים'), dict(id='other', label='אחר')],
      recommended=None, chosen='parents', decided_note='הקופי, ה-FAQ, ה-hero ותוכן ההורים שוחררו לביצוע (T2.6, T2.7, T3.9).',
      unblocks=['T2.6', 'T2.7', 'T3.9'], evidence=None, source='work-plan §החלטות שהתקבלו; F11'),
 dict(id='D5', title='מקור הביקורות / הוכחה חברתית', question='איך משלבים את הביקורות מה-CSV באתר?', status='open',
      options=[dict(id='A', label='A. נבחרות סטטיות בערכה', detail='Claude Code ממיר את ה-CSV (מקומית) לבלוקים של סקשן הביקורות ב-templates/*.json: כרטיסים נבחרים, ציטוט מוביל, ודירוג ממוצע וספירה שמחושבים מה-CSV. יתרונות: אין אפליקציה ואין שינוי בחנות, מהיר, בלי סקריפטים. חסרונות: מספר הבלוקים מוגבל (עד 50), עדכון מחייב הרצה מחדש.'),
               dict(id='B', label='B. Metaobjects', detail='🏪 הגדרת metaobject review ויבוא ה-CSV; הערכה קוראת ממנו. יתרונות: נתונים מסודרים, ללא הגבלת בלוקים. חסרונות: פעולת Admin וכלי יבוא.'),
               dict(id='C', label='C. אפליקציית ביקורות בהמשך', detail='Loox / Judge.me / Junip. אייל החליט לא בשלב זה (E7) ולכן האפשרות לא רלוונטית כרגע.', disabled=True)],
      recommended='A', decided_note=None, unblocks=['T2.3', 'T3.8'], evidence=d5_ev.strip(), source='work-plan §D5; E7'),
 dict(id='D6', title='דומיין', question='מתי מצמידים את הדומיין הראשי לטיוטה (פרסום)?', status='decided',
      options=[dict(id='last', label='רק בסוף', detail='הדומיין הראשי יוצמד לטיוטה (פרסום) רק אחרי שכל השיפורים הושלמו, כשלב ההשקה האחרון ובאישור מפורש')],
      recommended=None, chosen='last', decided_note='T4.2 הוא הצעד האחרון, ומבוצע על ידי אייל בלבד.', unblocks=['T4.2'], evidence=None, source='work-plan §החלטות שהתקבלו; F15'),
]
# E-series decided items (from the "decisions received" table)
etab = sec_between('### החלטות שהתקבלו', '### החלטות פתוחות')
for line in etab.splitlines():
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) == 4 and re.fullmatch(r'E[2-9]', strip(c[0])):
        decisions.append(dict(id=strip(c[0]), title=strip(c[1]), question=strip(c[1]), status='decided',
            options=[], recommended=None, chosen=None, decided_note=f'{strip(c[2])} — {strip(c[3])}', unblocks=[], evidence=None, source='work-plan §החלטות שהתקבלו'))
for d in decisions:
    d['unblocks_dynamic'] = unb.get(d['id'], [])
    d.setdefault('chosen', None)
    d['decided_by'] = 'eyal' if d['status'] == 'decided' else None
    d['decided_at'] = '2026-10-04T00:00:00+03:00' if d['status'] == 'decided' else None
    d['note'] = None
    d['updated_at'] = NOW; d['updated_by'] = 'seed'
    d.pop('unblocks_dynamic')
open_dec = [d['id'] for d in decisions if d['status'] == 'open']
assert open_dec == ['D3', 'D5'], open_dec

# ---------------- findings
CAT = {}
cat_title = None
characterization = {}
for line in ch.splitlines():
    m = re.match(r'### 3\.(\d) (.+)', line)
    if m:
        cat_title = re.sub(r' \*.*', '', m.group(2)).strip(); continue
    if line.startswith('## 4.'): cat_title = None
    m = re.match(r'\| (F\d+)\b', line)
    if m and cat_title:
        fid = m.group(1)
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        row = dict(cat=cat_title, impact=strip(c[2]), effort=strip(c[3]), type=strip(c[4]) if len(c) > 4 else '', deps=strip(c[5]) if len(c) > 5 else '')
        if fid not in characterization or fid == 'F14' and cat_title == 'ביצועים':
            characterization[fid] = row
CATS = {'מסר ותמחור': 'מסר ותמחור', 'אמון והוכחה חברתית': 'אמון והוכחה חברתית', 'UX ומובייל': 'UX ומובייל', 'עמוד מוצר': 'עמוד מוצר',
        'תהליך רכישה ומנוי': 'תהליך רכישה ומנוי', 'SEO ותוכן': 'SEO ותוכן', 'ביצועים': 'ביצועים', 'תפעול וניקיון': 'תפעול וניקיון'}
def clean_cat(c):
    c = re.sub(r'\(.*?\)', '', c).strip()
    if c.startswith('רגולציה'): return 'רגולציה (מחוץ לתחום)'
    return c
SEV = [('נמוכה-בינונית', 'low-med'), ('קריטית', 'critical'), ('גבוהה', 'high'), ('בינונית', 'medium'), ('נמוכה', 'low')]
def sev(s):
    for k, v in SEV:
        if s.startswith(k) or k in s.split('(')[0]: return v
    return 'medium'
SEVN = {'critical': 4, 'high': 3, 'medium': 2, 'low-med': 1.5, 'low': 1}
findings = []
for m in re.finditer(r'^### (F\d+) · (.+?) — \*\*(.+?)\*\*\s*\n(.*?)(?=^### F\d+ · |^## חלק|\Z)', nv, re.S | re.M):
    fid, title, sevtxt, body = m.groups()
    fields, cur = {}, 'באתר'
    pre = []
    for ln in body.splitlines():
        lm = re.match(r'- \*\*(.+?):\*\*\s*(.*)', ln)
        if lm:
            cur = lm.group(1).strip(); fields[cur] = fields.get(cur, '') + lm.group(2) + '\n'
        elif ln.startswith('**') and fid == 'F4' and 'באתר' not in fields and not fields:
            cur = 'באתר'; fields[cur] = fields.get(cur, '') + ln + '\n'
        else:
            fields[cur] = fields.get(cur, '') + ln + '\n'
    def g(*keys):
        out = []
        for k, v in fields.items():
            if any(k.startswith(x) for x in keys): out.append(v.strip())
        return '\n\n'.join(x for x in out if x) or None
    ch_row = characterization.get(fid, {})
    severity = sev(ch_row.get('impact', '')) if ch_row else 'medium'
    if not ch_row: print('no characterization for', fid)
    task_ids = [t['id'] for t in tasks if fid in t['finding_ids']]
    out_scope = fid in ('F4', 'F5')
    status = 'open'; status_note = None
    if fid == 'F6': status = 'wontfix'; status_note = 'נסגר בהחלטה D2: אין ערבות.'
    if out_scope: status = 'out_of_scope'; status_note = 'מחוץ לתחום לפי אייל: נושאי משפט/רגולציה לא נכללים. המיקוד הוא המרה, משפך ו-UX.'
    findings.append(dict(
        id=fid, title=strip(title), severity=severity, severity_level=SEVN[severity], severity_source=strip(sevtxt),
        category=clean_cat(ch_row.get('cat', '')) , impact=ch_row.get('impact'), effort=ch_row.get('effort'), type=ch_row.get('type'), dependencies=ch_row.get('deps'),
        in_scope=not out_scope, status=status, status_note=status_note,
        evidence_site=g('באתר', 'חיובי') if fid != 'F17' else (fields.get('באתר') or '').strip(),
        inference=g('הסקה'), evidence_reference=g('ייחוס'), why=g('למה'), recommendation=g('המלצה'),
        task_ids=task_ids, updated_at=NOW, updated_by='seed', note=None))
assert len(findings) == 18, len(findings)

# ---------------- issues
issues = []
n = 1
notes_sec = wp.split('## הערות על המקורות')[1]
for m in re.finditer(r'^(\d+)\. (.+)$', notes_sec, re.M):
    issues.append(dict(id=f'I{n}', title=strip(m.group(2))[:90] + ('…' if len(strip(m.group(2))) > 90 else ''), body=strip(m.group(2)), kind='note', status='open', source='work-plan.md › הערות על המקורות', author='bot:grok-bot', related=[]))
    n += 1
unk = ch.split('## 6.')[1].split('## 7.')[0]
SKIP = ('משרד הבריאות', 'מחקרים', 'compare-at', 'יצרן', 'עסק קיים', 'קהל יעד', 'כלכלת ערבות', 'משרד')
for line in unk.splitlines():
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) == 3 and not c[0].startswith('---') and c[0] != 'חוסר':
        if any(s in c[0] for s in SKIP): continue
        issues.append(dict(id=f'I{n}', title='לא ידוע: ' + strip(c[0])[:80], body=f'{strip(c[0])}\nמשפיע על: {strip(c[1])}\nמקור אפשרי: {strip(c[2])}', kind='unknown', status='open', source='characterization.md › §6 חוסרי מידע', author='bot:grok-bot', related=re.findall(r'F\d+', c[1])))
        n += 1
for i in issues: i.update(created_at=NOW, updated_at=NOW)

(OUT / 'tasks.json').write_text(json.dumps(tasks, ensure_ascii=False, indent=1))
(OUT / 'decisions.json').write_text(json.dumps(decisions, ensure_ascii=False, indent=1))
(OUT / 'findings.json').write_text(json.dumps(findings, ensure_ascii=False, indent=1))
(OUT / 'issues.json').write_text(json.dumps(issues, ensure_ascii=False, indent=1))
(OUT / 'inputs.json').write_text(json.dumps(inputs, ensure_ascii=False, indent=1))
(OUT / 'waves.json').write_text(json.dumps([dict(wave=k, name=v[0], title=v[1]) for k, v in WAVES.items()], ensure_ascii=False, indent=1))
print('tasks', len(tasks), 'blocked', sum(t['status'] == 'blocked' for t in tasks), 'open', sum(t['status'] == 'open' for t in tasks), 'decisions', len(decisions), 'findings', len(findings), 'issues', len(issues), 'inputs', len(inputs))
