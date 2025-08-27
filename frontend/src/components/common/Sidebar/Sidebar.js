import React, { useState } from 'react';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  
  const menuItems = [
    { label: 'Dashboard', active: true },
    { label: 'Example1', active: false },
    { label: 'Example2', active: false },
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
            <div 
              key={index} 
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </div>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
    </>
  );
}

export default Sidebar;