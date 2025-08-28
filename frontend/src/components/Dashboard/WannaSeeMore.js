import { useNavigate } from 'react-router-dom';
import './WannaSeeMore.css';

export default function WannaSeeMore() {
  const navigate = useNavigate();

  const handleListeningPatternsClick = () => {
    navigate('/listening-patterns');
  };

  return (
    <div className="wanna-see-more">
      <div className="wanna-see-more-label">Wanna see more?</div>
      <div className="wanna-see-more-buttons">
        <button
          className="see-more-btn"
          onClick={handleListeningPatternsClick}
        >
          Listening Patterns
        </button>
      </div>
    </div>
  );
}