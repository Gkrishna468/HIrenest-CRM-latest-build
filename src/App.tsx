/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Sidebar } from './components/Sidebar';
import { Toaster } from 'sonner';

// Pages
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Contacts from './pages/Contacts';
import Requirements from './pages/Requirements';
import Vendors from './pages/Vendors';
import FollowUps from './pages/FollowUps';
import Revenue from './pages/Revenue';
import CommunicationCenter from './pages/CommunicationCenter';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PublicApply from './pages/PublicApply';
import MigrationDashboard from './pages/MigrationDashboard';
import ClientFeedbackTracker from './pages/ClientFeedbackTracker';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-500 font-medium">Loading HireNest...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="w-full h-full p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/apply/:jobId" element={<PublicApply />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
            <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
            <Route path="/requirements" element={<PrivateRoute><Requirements /></PrivateRoute>} />
            
            {/* New Staffing Routes */}
            <Route path="/candidates" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Candidates</h2><p className="text-slate-500">Coming in Sprint 3</p></div></div></PrivateRoute>} />
            <Route path="/submissions" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Submissions</h2><p className="text-slate-500">Coming in Sprint 3</p></div></div></PrivateRoute>} />
            <Route path="/interviews" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Interviews</h2><p className="text-slate-500">Coming in Sprint 3</p></div></div></PrivateRoute>} />

            <Route path="/vendors" element={<PrivateRoute><Vendors /></PrivateRoute>} />
            <Route path="/bench" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Bench Resources</h2><p className="text-slate-500">Coming in Sprint 4</p></div></div></PrivateRoute>} />

            <Route path="/follow-ups" element={<PrivateRoute><FollowUps /></PrivateRoute>} />
            <Route path="/revenue" element={<PrivateRoute><Revenue /></PrivateRoute>} />
            <Route path="/margins" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Margin Intelligence</h2><p className="text-slate-500">Coming in Sprint 4</p></div></div></PrivateRoute>} />
            
            <Route path="/mail" element={<PrivateRoute><CommunicationCenter /></PrivateRoute>} />
            <Route path="/req-extraction" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Requirement Extraction</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/sub-extraction" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Submission Extraction</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/jobs" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Job Ecosystem</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/deal-rooms" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Deal Rooms</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/ai-matching" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">AI Matching</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/placements" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Placements</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />
            <Route path="/integrations" element={<PrivateRoute><div className="flex items-center justify-center h-full"><div className="text-center"><h2 className="text-xl font-bold text-slate-800">Integrations</h2><p className="text-slate-500">Coming soon</p></div></div></PrivateRoute>} />

            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/migration" element={<PrivateRoute><MigrationDashboard /></PrivateRoute>} />
            <Route path="/intelligence" element={<PrivateRoute><ClientFeedbackTracker /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
