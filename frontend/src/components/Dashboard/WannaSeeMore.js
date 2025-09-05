import { useNavigate } from 'react-router-dom';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import './WannaSeeMore.css';

export default function WannaSeeMore() {
  const navigate = useNavigate();

  const handleListeningPatternsClick = () => {
    navigate('/listening-patterns');
  };

  const handleDiscoveryAndVarietyClick = () => {
    navigate('/discovery-and-variety');
  };

  return (
    <div className="wanna-see-more">
      <SectionTitle title="Wanna see more?" />
      <div className="wanna-see-more-buttons">
        <button
          className="see-more-btn"
          onClick={handleListeningPatternsClick}
        >
          Listening Patterns
        </button>
        <button
          className="see-more-btn"
          onClick={handleDiscoveryAndVarietyClick}
        >
          Discovery and Variety
        </button>
      </div>
    </div>
  );
}