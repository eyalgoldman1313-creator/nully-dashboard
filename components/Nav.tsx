'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', 'סקירה'], ['/timeline', 'ציר זמן'], ['/board', 'לוח משימות'], ['/decisions', 'החלטות'], ['/findings', 'ממצאים'],
  ['/issues', 'הערות ופתוחים'], ['/changes', 'שינויים בטיוטה'], ['/activity', 'יומן פעילות'],
];
export default function Nav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">Nully<small>לוח בקרה</small></Link>
        <nav className="nav" aria-label="ניווט ראשי">
          {ITEMS.map(([href, label]) => (
            <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
