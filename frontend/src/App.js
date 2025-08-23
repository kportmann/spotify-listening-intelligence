
import './styles/App.css';
import Header from './components/common/Header/Header';
import Sidebar from './components/common/Sidebar/Sidebar';
import MainContainer from './components/common/MainContainer/MainContainer';
import Card from './components/common/Card/Card';
import Footer from './components/Footer/Footer';

function App() {
  const metricsData = [
    { title: 'Revenue', value: '$12,543', period: 'Last 30 days', type: 'revenue' },
    { title: 'Plays', value: '480,000', period: 'Last 30 days', type: 'plays' },
    { title: 'Listeners', value: '34,035', period: 'Last 30 days', type: 'listeners' }
  ];

  return (
    <div className="app">
      <Header />
      <Sidebar />
      
      <MainContainer>
      </MainContainer>
      
      <Footer />
    </div>
  );
}

export default App;
