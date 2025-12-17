import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Interview from './pages/Interview/Interview';
import Feedback from './pages/Feedback/Feedback';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/interview/:sessionId" element={<Interview />} />
      <Route path="/feedback/:sessionId" element={<Feedback />} />
    </Routes>
  );
}

export default App;
