export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p>טוען את הלוח…</p>
      <div className="skel-line lg" />
      <div className="skel-block" />
      <div className="skel-line" />
      <div className="skel-block" />
    </div>
  );
}
