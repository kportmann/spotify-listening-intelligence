import { useNavigate } from 'react-router-dom';
import './ExitButton.css';

export default function ExitButton({ to = '/', label = 'Exit' }) {
  const navigate = useNavigate();
  return (
    <button
      className="exit-button"
      onClick={() => navigate(to)}
      aria-label={label}
      title={label}
    >
      ✕
    </button>
  );
}


