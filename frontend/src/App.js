import './styles/App.css';
import Header from './components/common/Header/Header';
import Sidebar from './components/common/Sidebar/Sidebar';
import MainContainer from './components/common/MainContainer/MainContainer';
import Dashboard from './components/Dashboard/Dashboard';
import Footer from './components/Footer/Footer';

function App() {
  return (
    <div className="app">
      <Header />
      <Sidebar />
      <MainContainer>
        <Dashboard />
      </MainContainer>
      <Footer />
    </div>
  );
}

export default App;
