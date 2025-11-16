import { Routes, Route } from 'react-router-dom';
import WelcomeScreen from '../components/WelcomeScreen';
import Chat from '../components/Chat';
import Journal from '../components/Journal';
import Entry from '../components/Entry';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/entry" element={<Entry />} />
    </Routes>
  );
}

export default App;
