/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { Sidebar } from "./components/Sidebar";
import { MobileNavBar } from "./components/MobileNavBar";
import { Toaster } from "sonner";

// Pages
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Accounts from "./pages/Accounts";
import Contacts from "./pages/Contacts";
import Requirements from "./pages/Requirements";
import Candidates from "./pages/Candidates";
import Vendors from "./pages/Vendors";
import Revenue from "./pages/Revenue";
import CommunicationCenter from "./pages/CommunicationCenter";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PublicApply from "./pages/PublicApply";
import VendorSubmit from "./pages/VendorSubmit";
import MigrationDashboard from "./pages/MigrationDashboard";
import AIAccuracy from "./pages/AIAccuracy";
import Agents from "./pages/Agents";
import KnowledgeVault from "./pages/KnowledgeVault";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-500 font-medium">
        Loading HireNest...
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen skeuo-container flex-col md:flex-row pb-16 md:pb-0">
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="w-full h-full p-4 md:p-8">{children}</div>
      </main>
      <MobileNavBar />
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
            <Route path="/vendor-submit/:jobId" element={<VendorSubmit />} />
            <Route path="/vendor-submit" element={<VendorSubmit />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <PrivateRoute>
                  <Workspaces />
                </PrivateRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <PrivateRoute>
                  <Agents />
                </PrivateRoute>
              }
            />
            <Route
              path="/knowledge-vault"
              element={
                <PrivateRoute>
                  <KnowledgeVault />
                </PrivateRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <PrivateRoute>
                  <Accounts />
                </PrivateRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <PrivateRoute>
                  <Contacts />
                </PrivateRoute>
              }
            />
            <Route
              path="/requirements"
              element={
                <PrivateRoute>
                  <Requirements />
                </PrivateRoute>
              }
            />

            {/* New Staffing Routes */}
            <Route
              path="/candidates"
              element={
                <PrivateRoute>
                  <Candidates />
                </PrivateRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <PrivateRoute>
                  <Candidates />
                </PrivateRoute>
              }
            />
            <Route
              path="/interviews"
              element={
                <PrivateRoute>
                  <Candidates />
                </PrivateRoute>
              }
            />
            <Route
              path="/offers"
              element={
                <PrivateRoute>
                  <Candidates />
                </PrivateRoute>
              }
            />
            <Route
              path="/placements"
              element={
                <PrivateRoute>
                  <Candidates />
                </PrivateRoute>
              }
            />

            <Route
              path="/vendors"
              element={
                <PrivateRoute>
                  <Vendors />
                </PrivateRoute>
              }
            />

            <Route
              path="/revenue"
              element={
                <PrivateRoute>
                  <Revenue />
                </PrivateRoute>
              }
            />

            <Route
              path="/mail"
              element={
                <PrivateRoute>
                  <CommunicationCenter />
                </PrivateRoute>
              }
            />

            <Route
              path="/ai-accuracy"
              element={
                <PrivateRoute>
                  <AIAccuracy />
                </PrivateRoute>
              }
            />
            <Route
              path="/migration"
              element={
                <PrivateRoute>
                  <MigrationDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
