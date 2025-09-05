import { useNavigate } from 'react-router-dom';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import './StillWannaSeeMore.css';

export default function WannaSeeMore() {
  const navigate = useNavigate();

  const handleDiscoveryAndVarietyClick = () => {
    navigate('/discovery-and-variety');
  };

  return (
    <div className="wanna-see-more">
      <SectionTitle title="Wanna see more?" />
      <div className="wanna-see-more-buttons">
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