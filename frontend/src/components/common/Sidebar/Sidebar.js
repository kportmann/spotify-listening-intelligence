import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const menuItems = [
    { label: 'Dashboard', path: '/', active: location.pathname === '/' },
    { label: 'Listening Patterns', path: '/listening-patterns', active: location.pathname === '/listening-patterns' },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
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
          {menuItems.map((item, index) => (
            <Link 
              key={index} 
              to={item.path}
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
    </>
  );
}

export default Sidebar;