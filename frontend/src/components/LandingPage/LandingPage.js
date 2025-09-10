import {useNavigate} from 'react-router-dom';
import './LandingPage.css';
import PageHeader from '../common/PageHeader/PageHeader';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <PageHeader 
        title="Welcome to Your Streaming Journey"
        description="Explore your spotify streaming data the way you like it. You can choose between the classic dashboard style and the wrapped style."
      />

      <div className="landing-hero">
        <SectionTitle title="Choose your journey" />
      </div>

      <div className="landing-options">
        <button className="landing-card" onClick={() => navigate('/dashboard')}>
          <div className="landing-card-badge">Classic</div>
          <h2 className="landing-card-title">Dashboard Style</h2>
          <p className="landing-card-desc">More analytical</p>
        </button>

        <button className="landing-card landing-card-accent" onClick={() => navigate('/wrapped')}>
          <div className="landing-card-badge">New</div>
          <h2 className="landing-card-title">Wrapped Style</h2>
          <p className="landing-card-desc">A scrollable story that reveals your highlights.</p>
        </button>
      </div>
    </div>
  );
}