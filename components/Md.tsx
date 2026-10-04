// Tiny markdown-ish renderer for the Hebrew source text: bullets, **bold**, `code`, tables as preformatted.
import React from 'react';
function inline(s: string, key: any) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const t = m[0];
    parts.push(t.startsWith('**') ? <strong key={i++}>{t.slice(2, -2)}</strong> : <code key={i++}>{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return <React.Fragment key={key}>{parts}</React.Fragment>;
}
export default function Md({ text }: { text?: string | null }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [], table: string[] = [];
  const flush = () => {
    if (list.length) { out.push(<ul key={'u' + out.length}>{list}</ul>); list = []; }
    if (table.length) { out.push(<div className="pre" key={'t' + out.length}>{table.join('\n')}</div>); table = []; }
  };
  lines.forEach((ln, i) => {
    const l = ln.trimEnd();
    if (l.startsWith('|')) { if (list.length) flush(); table.push(l); return; }
    if (table.length) flush();
    const b = l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (b) { list.push(<li key={i}>{inline(b[1], i)}</li>); return; }
    flush();
    if (l.trim()) out.push(<p key={i}>{inline(l.trim(), i)}</p>);
  });
  flush();
  return <div className="md">{out}</div>;
}
