import './Wrapped.css';
import ExitButton from '../common/ExitButton/ExitButton';
import HeroSection from './HeroSection';
import FirstPlaySection from './FirstPlaySection';

export default function Wrapped() {
  return (
    <div className="wrapped-immersive">
      <ExitButton to="/" label="Exit Wrapped" />
      <HeroSection />
      <FirstPlaySection />
    </div>
  );
}


