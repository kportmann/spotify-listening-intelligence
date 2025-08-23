import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <img src="/images/logos/Spotify_Full_Logo_RGB_White.png" alt="Spotify" className="header-logo" />
        <span className="header-title">Streaming Analytics</span>
      </div>
      
      <div className="header-right">
        <div className="user-profile">
          <div className="user-avatar">
            <span>K</span>
          </div>
          <span className="user-name">user name</span>
        </div>
      </div>
    </header>
  );
}

export default Header;