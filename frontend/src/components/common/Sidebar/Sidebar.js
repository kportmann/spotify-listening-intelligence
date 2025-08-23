import './Sidebar.css';

function Sidebar() {
  const menuItems = [
    { label: 'Dashboard', active: true },
    { label: 'example', active: false}
  ];

  return (
    <div className="sidebar">
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
  );
}

export default Sidebar;