import './ExpandButton.css';

export default function ExpandButton({ isExpanded, onClick, isLoading = false, disabled = false }) {
  const buttonText = () => {
    if (isLoading && !isExpanded) return 'Loading...';
    return isExpanded ? 'Show Less' : 'Show More';
  };

  const buttonClass = isExpanded ? 'expand-btn expand-btn--collapse' : 'expand-btn expand-btn--expand';

  return (
    <div className="expand-button-wrapper">
      <button 
        onClick={onClick}
        className={buttonClass}
        disabled={disabled || (isLoading && !isExpanded)}
      >
        {buttonText()}
      </button>
    </div>
  );
}