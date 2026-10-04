// "2–4 ש'" must keep the numeric range left-to-right inside RTL text.
export default function Effort({ text }: { text?: string | null }) {
  if (!text) return <>—</>;
  const m = text.match(/^([\d.]+(?:\s*[–-]\s*[\d.]+)?)(.*)$/);
  if (!m) return <>{text}</>;
  return <><span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{m[1].replace(/\s/g, '')}</span>{m[2]}</>;
}
