import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { LogStreamProvider } from './contexts/LogStreamContext';
import MonitorPage from './pages/MonitorPage';
import LogBrowserPage from './pages/LogBrowserPage';
import ErrorSearchPage from './pages/ErrorSearchPage';
import HistoryPage from './pages/HistoryPage';
import TimelinePage from './pages/TimelinePage';
import HeatmapPage from './pages/HeatmapPage';
import ReportsPage from './pages/ReportsPage';
import ComparePage from './pages/ComparePage';
import StatsPage from './pages/StatsPage';
import DevicesPage from './pages/DevicesPage';
import NotesPage from './pages/NotesPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <LogStreamProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/monitor" replace />} />
              <Route path="/monitor" element={<MonitorPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/logs" element={<LogBrowserPage />} />
              <Route path="/search" element={<ErrorSearchPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/heatmap" element={<HeatmapPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/notes" element={<NotesPage />} />
            </Routes>
          </main>
        </div>
      </LogStreamProvider>
    </BrowserRouter>
  );
}

export default App;
