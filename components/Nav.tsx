'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon, { type IconName } from './Icon';
import Modal from './Modal';

type Group = {
  label: string;
  icon: IconName;
  href?: string;
  on: (path: string) => boolean;
  links?: { href: string; label: string }[];
};

const GROUPS: Group[] = [
  { label: 'סקירה', icon: 'home', href: '/', on: (p) => p === '/' },
  {
    label: 'עבודה', icon: 'kanban', on: (p) => p.startsWith('/board') || p.startsWith('/timeline'),
    links: [{ href: '/board', label: 'לוח משימות' }, { href: '/timeline', label: 'ציר זמן' }],
  },
  { label: 'החלטות', icon: 'decisions', href: '/decisions', on: (p) => p.startsWith('/decisions') },
  {
    label: 'ממצאים', icon: 'findings', on: (p) => p.startsWith('/findings') || p.startsWith('/issues'),
    links: [{ href: '/findings', label: 'ממצאים' }, { href: '/issues', label: 'הערות' }],
  },
  {
    label: 'היסטוריה', icon: 'changes', on: (p) => p.startsWith('/changes') || p.startsWith('/activity'),
    links: [{ href: '/changes', label: 'שינויים בטיוטה' }, { href: '/activity', label: 'יומן פעילות' }],
  },
];

const TABS: { href: string; label: string; icon: IconName; on: (p: string) => boolean }[] = [
  { href: '/', label: 'סקירה', icon: 'home', on: (p) => p === '/' },
  { href: '/board', label: 'עבודה', icon: 'kanban', on: (p) => p.startsWith('/board') || p.startsWith('/timeline') },
  { href: '/decisions', label: 'החלטות', icon: 'decisions', on: (p) => p.startsWith('/decisions') },
  { href: '/findings', label: 'ממצאים', icon: 'findings', on: (p) => p.startsWith('/findings') || p.startsWith('/issues') },
];

const MORE = [
  { href: '/timeline', label: 'ציר זמן', icon: 'timeline' as IconName },
  { href: '/issues', label: 'הערות', icon: 'issues' as IconName },
  { href: '/changes', label: 'שינויים בטיוטה', icon: 'changes' as IconName },
  { href: '/activity', label: 'יומן פעילות', icon: 'activity' as IconName },
];

function current(href: string, path: string) {
  return path === href || path.startsWith(href + '/');
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">N</span>
        <span><strong>Nully</strong><small>לוח בקרה</small></span>
      </Link>
      <nav className="nav" aria-label="ניווט ראשי">
        {GROUPS.map((g) => (
          <div className="nav-group" key={g.label}>
            {g.links ? (
              <>
                <div className={`nav-label${g.on(path) ? ' on' : ''}`}><Icon name={g.icon} />{g.label}</div>
                <div className="nav-sub">
                  {g.links.map((l) => (
                    <Link key={l.href} href={l.href} aria-current={current(l.href, path) ? 'page' : undefined}>{l.label}</Link>
                  ))}
                </div>
              </>
            ) : (
              <Link href={g.href!} className={`nav-link${g.on(path) ? ' on' : ''}`} aria-current={g.on(path) ? 'page' : undefined}>
                <Icon name={g.icon} />{g.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function MobileBar() {
  return (
    <header className="appbar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">N</span>
        <span><strong>Nully</strong><small>לוח בקרה</small></span>
      </Link>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const moreActive = path.startsWith('/changes') || path.startsWith('/activity');
  return (
    <>
      <nav className="tabbar" aria-label="ניווט ראשי">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={t.on(path) ? 'on' : ''} aria-current={current(t.href, path) ? 'page' : undefined}>
            <Icon name={t.icon} />{t.label}
          </Link>
        ))}
        <button type="button" className={moreActive ? 'on' : ''} aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)}>
          <Icon name="more" />עוד
        </button>
      </nav>
      {more && (
        <Modal variant="sheet" titleId="more-title" onClose={() => setMore(false)}>
          <h2 id="more-title">עוד</h2>
          <div className="stack">
            {MORE.map((l) => (
              <Link key={l.href} href={l.href} className="btn start" aria-current={current(l.href, path) ? 'page' : undefined} onClick={() => setMore(false)}>
                <Icon name={l.icon} />{l.label}
              </Link>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

export function Subnav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="seg subnav" aria-label="בתוך הקבוצה">
      {items.map((l) => (
        <Link key={l.href} href={l.href} className={current(l.href, path) ? 'on' : ''} aria-current={current(l.href, path) ? 'page' : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}

export const WORK_NAV = [{ href: '/board', label: 'לוח משימות' }, { href: '/timeline', label: 'ציר זמן' }];
export const FINDINGS_NAV = [{ href: '/findings', label: 'ממצאים' }, { href: '/issues', label: 'הערות' }];
export const HISTORY_NAV = [{ href: '/changes', label: 'שינויים' }, { href: '/activity', label: 'יומן' }];
