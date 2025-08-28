import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/App.css';
import Header from './components/common/Header/Header';
import Sidebar from './components/common/Sidebar/Sidebar';
import MainContainer from './components/common/MainContainer/MainContainer';
import Dashboard from './components/Dashboard/Dashboard';
import ListeningPatterns from './components/ListeningPatterns/ListeningPatterns';
import Footer from './components/Footer/Footer';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <Sidebar />
        <MainContainer>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/listening-patterns" element={<ListeningPatterns />} />
          </Routes>
        </MainContainer>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
