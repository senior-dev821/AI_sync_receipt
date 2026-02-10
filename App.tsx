
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { VerifyPage } from './pages/VerifyPage';
import { HistoryPage } from './pages/HistoryPage';
import { AICallsPage } from './pages/AICallsPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/ai-calls" element={<AICallsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
