import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;