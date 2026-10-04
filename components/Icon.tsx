import type { ReactNode } from 'react';

export type IconName =
  | 'home' | 'kanban' | 'timeline' | 'decisions' | 'findings' | 'issues' | 'changes' | 'activity'
  | 'more' | 'chevron' | 'arrow' | 'undo' | 'play' | 'check' | 'close' | 'lock' | 'clock'
  | 'star' | 'copy' | 'plus' | 'alert' | 'info';

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  kanban: <><path d="M5 4h4v16H5zM15 4h4v10h-4zM10 4h4v7h-4z" /></>,
  timeline: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  decisions: <><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5 11 15l4.5-5" /></>,
  findings: <><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></>,
  issues: <path d="M6 6h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4 3v-3H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />,
  changes: <><path d="M8 7h11M8 12h11M8 17h7" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></>,
  activity: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  more: <><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h9a6 6 0 0 1 0 12h-3" /></>,
  play: <path d="M9 7.5v9l8-4.5z" />,
  check: <path d="m5 12 5 5L20 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="6" y="11" width="12" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
  star: <path d="m12 3.5 2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 16.8 7 18.5l1.1-5.5L4 9.2l5.6-.7z" />,
  copy: <><rect x="8" y="8" width="11" height="12" rx="1.5" /><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  alert: <><path d="M12 4 3 19h18z" /><path d="M12 10v4M12 16.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></>,
};

export default function Icon({ name, mirror = false, className = '' }: { name: IconName; mirror?: boolean; className?: string }) {
  return (
    <svg className={`icon${mirror ? ' icon-dir' : ''}${className ? ' ' + className : ''}`} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
