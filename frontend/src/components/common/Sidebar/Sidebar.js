import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const location = useLocation();
  
  const dashboardActive = 
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/listening-patterns' ||
    location.pathname === '/discovery-and-variety';

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  const toggleDashboard = () => {
    setIsDashboardOpen(!isDashboardOpen);
  };

  return (
    <>
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <nav className="nav-menu">
          <Link 
            to="/"
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>

          <div className={`nav-group ${dashboardActive ? 'active' : ''}`}>
            <button 
              className={`nav-item nav-group-toggle ${isDashboardOpen ? 'expanded' : ''}`}
              onClick={toggleDashboard}
              aria-expanded={isDashboardOpen}
              aria-controls="dashboard-submenu"
            >
              <span className="caret" />
              Dashboard
            </button>
            {isDashboardOpen && (
              <div id="dashboard-submenu" className="nav-submenu">
                <Link 
                  to="/dashboard"
                  className={`nav-subitem ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  Top Content
                </Link>
                <Link 
                  to="/listening-patterns"
                  className={`nav-subitem ${location.pathname === '/listening-patterns' ? 'active' : ''}`}
                >
                  Listening Patterns
                </Link>
                <Link 
                  to="/discovery-and-variety"
                  className={`nav-subitem ${location.pathname === '/discovery-and-variety' ? 'active' : ''}`}
                >
                  Discovery & Variety
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
    </>
  );
}

export default Sidebar;