import './HeroSection.css';

export default function HeroSection() {
  return (
    <section className="wrapped-section wrapped-hero">
      <div className="wrapped-hero-content">
        <h1>Your Spotify Streaming Journey</h1>
        <p>Scroll to begin</p>
      </div>
      <div className="wrapped-scroll-indicator" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>
  );
}


