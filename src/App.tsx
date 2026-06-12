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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-500 font-medium">Loading HireNest...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
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
            <Route path="/vendors" element={<PrivateRoute><Vendors /></PrivateRoute>} />
            <Route path="/follow-ups" element={<PrivateRoute><FollowUps /></PrivateRoute>} />
            <Route path="/revenue" element={<PrivateRoute><Revenue /></PrivateRoute>} />
            <Route path="/communication" element={<PrivateRoute><CommunicationCenter /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
