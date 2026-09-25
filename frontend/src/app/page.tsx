export default function Home() {
  return (
    <main className="foundation-shell">
      <section className="foundation-card" aria-labelledby="vitanarr-title">
        <div className="brand-mark" aria-hidden="true">
          VN
        </div>
        <p className="eyebrow">A life-story platform</p>
        <h1 id="vitanarr-title">VitaNarr</h1>
        <div className="tagline" aria-label="Live it. Tell it. Preserve it.">
          <span>Live it.</span>
          <span>Tell it.</span>
          <span>Preserve it.</span>
        </div>
        <p className="foundation-message">Your life deserves to be remembered.</p>
        <div className="foundation-status">
          <span className="status-dot" aria-hidden="true" />
          Foundation online
        </div>
      </section>
    </main>
  );
}
