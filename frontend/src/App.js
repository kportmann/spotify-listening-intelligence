import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './styles/App.css';
import Header from './components/common/Header/Header';
import Sidebar from './components/common/Sidebar/Sidebar';
import MainContainer from './components/common/MainContainer/MainContainer';
import LandingPage from './components/LandingPage/LandingPage';
import Dashboard from './components/Dashboard/Dashboard';
import ListeningPatterns from './components/ListeningPatterns/ListeningPatterns';
import DiscoveryAndVariety from './components/DiscoveryAndVariety/DiscoveryAndVariety';
import Footer from './components/common/Footer/Footer';
import Wrapped from './components/Wrapped/Wrapped';

function AppLayout() {
  const location = useLocation();
  const isImmersive = location.pathname.startsWith('/wrapped');

  if (isImmersive) {
    return (
      <Routes>
        <Route path="/wrapped" element={<Wrapped />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <Header />
      <Sidebar />
      <MainContainer>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/listening-patterns" element={<ListeningPatterns />} />
          <Route path="/discovery-and-variety" element={<DiscoveryAndVariety />} />
        </Routes>
      </MainContainer>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
