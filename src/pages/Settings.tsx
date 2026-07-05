/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Database, 
  Mail, 
  Shield, 
  User, 
  Building2, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  Globe,
  RefreshCw,
  AlertTriangle,
  Activity,
  History,
  Link2,
  UserPlus,
  Phone,
  Plus,
  Trash2,
  Edit3,
  UserCheck,
  X,
  Briefcase,
  KeyRound,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRepository } from '@/repositories/UserRepository';
import { RequirementRepository } from '@/repositories/RequirementRepository';
import { CandidateRepository } from '@/repositories/CandidateRepository';
import { AgentRepository } from '@/repositories/AgentRepository';
import { SystemRepository } from '@/repositories/SystemRepository';
import { auth, db } from '@/services/firebase/config';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { initializeApp as initializeSecondaryApp, deleteApp as deleteSecondaryApp, getApps as getSecondaryApps } from 'firebase/app';
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword as createSecondaryUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Role } from '@/types';

export default function Settings() {
  const { user, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailData, setGmailData] = useState<any>(null);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [workflowConfigs, setWorkflowConfigs] = useState({
    gmailActive: true,
    gmailFrequency: 30,
    vendorParserActive: true,
    vendorParserAutoCreate: true,
    slaActive: true,
    slaReminderLimit: 3,
    slaEscalationLimit: 7,
    slaAlertLimit: 10,
    redeploymentActive: true,
    redeploymentMatchThreshold: 85,
    redeploymentIdleThreshold: 5
  });

  // For Personal Profile editing
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    avatar: '',
  });

  // For User Creation form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'client_manager' as Role,
    status: 'active' as 'active' | 'inactive',
    password: 'Welcome@HN2026', // Default temporary password
  });

  // Password provisioning and admin reset states
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{ name: string; email: string; temporaryPassword: string } | null>(null);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetSuccessCredentials, setResetSuccessCredentials] = useState<{ name: string; email: string; temporaryPassword: string } | null>(null);

  // For User Editing form
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // For Organization settings
  const [orgForm, setOrgForm] = useState({
    name: 'HireNest Workforce',
    domain: 'hirenestworkforce.com',
    region: 'Mumbai, India (asia-south1)',
    taxId: 'GST-IN-9943A1B2',
  });

  // Load profile values on mount
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  // Load all users list
  const [usersList, setUsersList] = useState<any[]>([]);
  const loadUsers = async () => {
    try {
      const list = await UserRepository.list();
      setUsersList(list);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      loadUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, "configs", "organization"));
        if (snap.exists()) {
          setOrgForm(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.warn("Could not load organization config:", err);
      }
    };
    fetchOrg();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await UserRepository.update(user.id, profileForm);
      toast.success("Personal profile updated successfully.");
      await SystemRepository.logEvent('PROFILE_UPDATED', user.name || user.email, {
        userId: user.id,
        ...profileForm
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      return toast.error("Full Name and Email Address are required");
    }
    const pwd = newUserForm.password || 'Welcome@HN2026';
    if (pwd.length < 6) {
      return toast.error("The temporary password must be at least 6 characters.");
    }

    setLoading(true);
    let secondaryApp: any = null;
    try {
      const emailLower = newUserForm.email.toLowerCase().trim();
      // Check if email already exists in Firestore
      const existingUser = await UserRepository.getByEmail(emailLower);
      if (existingUser) {
        throw new Error(`A user profile with email ${emailLower} already exists.`);
      }

      // Initialize secondary App instance to create Auth credentials without logging out Admin
      const apps = getSecondaryApps();
      const existing = apps.find(a => a.name === 'SecondaryProvisionApp');
      if (existing) {
        await deleteSecondaryApp(existing);
      }
      secondaryApp = initializeSecondaryApp(firebaseConfig, 'SecondaryProvisionApp');
      const secondaryAuth = getSecondaryAuth(secondaryApp);
      
      const cred = await createSecondaryUserWithEmailAndPassword(secondaryAuth, emailLower, pwd);
      const uid = cred.user.uid;

      // Create profile in Firestore linked to the Auth UID
      await UserRepository.create(uid, {
        email: emailLower,
        name: newUserForm.name,
        phone: newUserForm.phone,
        role: newUserForm.role,
        status: newUserForm.status,
        loginCount: 0,
        mustChangePassword: true,
        temporaryPassword: pwd,
      });

      // Log Event!
      await SystemRepository.logEvent('USER_CREATED', user?.name || user?.email || 'Admin', {
        createdUserId: uid,
        email: emailLower,
        name: newUserForm.name,
        role: newUserForm.role,
      });

      // Clean up secondary app
      await deleteSecondaryApp(secondaryApp);

      // Save credentials for the copyable invite box
      setCreatedUserCredentials({
        name: newUserForm.name,
        email: emailLower,
        temporaryPassword: pwd,
      });

      toast.success("User successfully created and credentials provisioned!");
      setNewUserForm({
        name: '',
        email: '',
        phone: '',
        role: 'client_manager',
        status: 'active',
        password: 'Welcome@HN2026',
      });
      setShowAddUser(false);
      loadUsers();
    } catch (err: any) {
      console.error("User creation failed:", err);
      toast.error(err.message || "Failed to create user");
      if (secondaryApp) {
        try {
          await deleteSecondaryApp(secondaryApp);
        } catch (cleanupErr) {
          console.error("Secondary app cleanup failed:", cleanupErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserAccess = async (userId: string, updates: Partial<any>) => {
    setLoading(true);
    try {
      const targetUser = usersList.find(u => u.id === userId);
      await UserRepository.update(userId, updates);
      
      // Log Event!
      await SystemRepository.logEvent('USER_UPDATED', user?.name || user?.email || 'Admin', {
        targetUserId: userId,
        email: targetUser?.email,
        ...updates
      });

      toast.success("User access privileges updated.");
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user privileges");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resettingUser || !resetPasswordVal) return;
    if (resetPasswordVal.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    
    setLoading(true);
    try {
      const response = await apiFetch('/api/auth?action=admin-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: resettingUser.id,
          newPassword: resetPasswordVal
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setResetSuccessCredentials({
        name: resettingUser.name || resettingUser.email.split('@')[0],
        email: resettingUser.email,
        temporaryPassword: resetPasswordVal
      });
      
      toast.success(data.message || `Password successfully reset for ${resettingUser.email}`);
      setResettingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error("Reset password failed:", err);
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return;
    
    setLoading(true);
    try {
      const response = await apiFetch('/api/auth?action=admin-delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: deletingUser.id
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      toast.success(data.message || `User has been permanently deleted.`);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error("Delete user failed:", err);
      toast.error(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, "configs", "organization"), orgForm);
      toast.success("Organization parameters registered in Enterprise Ledger.");
      await SystemRepository.logEvent('ORGANIZATION_UPDATED', user?.name || user?.email || 'Admin', orgForm);
    } catch (err: any) {
      toast.error("Failed to update organization config.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const snap = await getDoc(doc(db, "configs", "workflows"));
        if (snap.exists()) {
          setWorkflowConfigs(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.warn("Could not load workflows config from Firestore:", err);
      }
    };
    if (user) {
      fetchWorkflows();
    }
  }, [user]);

  const [firebaseStats, setFirebaseStats] = useState<any>({
    users: 0,
    requirements: 0,
    candidates: 0,
    logs: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [u, r, c, l] = await Promise.all([
          UserRepository.list(),
          RequirementRepository.list(),
          CandidateRepository.list(),
          AgentRepository.listLogs(),
        ]);
        setFirebaseStats({
          users: u.length,
          requirements: r.length,
          candidates: c.length,
          logs: l.length,
        });
      } catch (err) {
        console.warn("Failed to fetch Firestore stats:", err);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    // Handle redirect params from server-side OAuth callback
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('gmail_connected') === 'true') {
      setGmailConnected(true);
      toast.success('Gmail integration connected successfully');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (searchParams.get('gmail_error')) {
      toast.error('Gmail connection failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkGmailFirebase = async () => {
      try {
        const userId = user?.id || "unknown";
        const email = user?.email || "";
        const response = await apiFetch(`/api/gmail?action=status&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.connected && data.data) {
          setGmailConnected(true);
          setGmailData(data.data);
        } else {
          setGmailConnected(false);
          setGmailData(null);
        }
      } catch (error) {
        console.error("Failed to fetch gmail_connection status", error);
      }
    };
    checkGmailFirebase();
  }, [user]);

  const connectGmail = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/auth?action=url&userId=${user?.id}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch URL: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to retrieve authentication URL. Check if endpoint returns proper JSON.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gmail connection failed');
      setLoading(false);
    }
  };

  const disconnectGmail = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setGmailConnected(false);
      toast.info('Gmail integration disconnected');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Infrastructure</h1>
        <p className="text-slate-500 mt-1">Configure your backend hooks, security protocols, and integration points.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 flex flex-col gap-1 shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm self-start">
          {[
            { id: 'workflows', label: 'Workflow & Engines', icon: Activity },
            { id: 'firebase', label: 'Firebase Ledger', icon: Database },
            { id: 'gmail', label: 'Gmail Logic', icon: Mail },
            { id: 'security', label: 'Security & RLS', icon: Shield },
            { id: 'profile', label: 'User Profile', icon: User },
            { id: 'company', label: 'Organization', icon: Building2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[500px]">
          {activeTab === 'workflows' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Workflow & Engine Configuration</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Deploy, tune, and configure the core deterministic engines of HireNest OS.</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await setDoc(doc(db, "configs", "workflows"), workflowConfigs);
                      toast.success("Workflow engine rules stored in Firestore ledger.");
                    } catch (err) {
                      toast.error("Failed to update workflow configs in database.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 skeuo-btn text-xs font-black uppercase font-mono"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? "Saving..." : "Save Configs"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. GMAIL INGESTION ENGINE */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider font-mono">Sprint 1: Gmail Ingestion</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowConfigs.gmailActive}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, gmailActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                    Automated background harvesting of incoming candidate applications via official Google Workspace Pub/Sub.
                  </p>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      <span>Sync Check Frequency</span>
                      <span className="font-black text-slate-800">{workflowConfigs.gmailFrequency} minutes</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={workflowConfigs.gmailFrequency}
                      onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, gmailFrequency: Number(e.target.value) })}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. VENDOR EXCEL PARSER */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider font-mono">Sprint 2: Vendor Excel Parser</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowConfigs.vendorParserActive}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, vendorParserActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                    Automatically intercepts and extracts structured candidate batch submissions from vendor Excel/CSV attachment payloads.
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] font-mono uppercase text-slate-400">
                    <span>Auto-create Submissions Batches</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowConfigs.vendorParserAutoCreate}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, vendorParserAutoCreate: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* 3. FEEDBACK SLA ENGINE */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider font-mono">Sprint 3: Feedback SLA Engine</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowConfigs.slaActive}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, slaActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                    Calculates re-engagement loops and enforces candidate feedback response latency SLA boundaries. Triggers notifications dynamically.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span>Reminder (Days)</span>
                        <span className="font-black text-slate-800">{workflowConfigs.slaReminderLimit} d</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        value={workflowConfigs.slaReminderLimit}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, slaReminderLimit: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none text-xs text-center font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span>Escalation (Days)</span>
                        <span className="font-black text-slate-800">{workflowConfigs.slaEscalationLimit} d</span>
                      </div>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={workflowConfigs.slaEscalationLimit}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, slaEscalationLimit: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none text-xs text-center font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span>Founder Alert (Days)</span>
                        <span className="font-black text-slate-800">{workflowConfigs.slaAlertLimit} d</span>
                      </div>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={workflowConfigs.slaAlertLimit}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, slaAlertLimit: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. CANDIDATE REDEPLOYMENT ENGINE */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider font-mono">Sprint 4: Candidate Redeployment</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowConfigs.redeploymentActive}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, redeploymentActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                    Automatically maps inactive high-probability candidates matching secondary requisitions back to the BDM for resubmission.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span>Match Score Threshold</span>
                        <span className="font-black text-slate-800">{workflowConfigs.redeploymentMatchThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={workflowConfigs.redeploymentMatchThreshold}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, redeploymentMatchThreshold: Number(e.target.value) })}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span>Max Sourcing Idle Time</span>
                        <span className="font-black text-slate-800">{workflowConfigs.redeploymentIdleThreshold} Days</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        step="1"
                        value={workflowConfigs.redeploymentIdleThreshold}
                        onChange={(e) => setWorkflowConfigs({ ...workflowConfigs, redeploymentIdleThreshold: Number(e.target.value) })}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Firebase Enterprise SSOT</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Primary data ledger and immutable company events.</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Active & Secure
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Users</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{firebaseStats.users}</p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Requisitions</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{firebaseStats.requirements}</p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Candidates Ingested</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{firebaseStats.candidates}</p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Events Ledger</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{firebaseStats.logs}</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                <ExternalLink className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Enterprise Governance & Law 1</h4>
                  <p className="text-indigo-700/70 text-xs leading-relaxed mt-1">
                    Everything derives from Firebase: users, clients, requirements, candidates, submissions, and system_events. Collection updates are recorded in the append-only Company Ledger.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gmail' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Gmail Ingestion Point</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Automated synchronization and resume extraction.</p>
                  </div>
                </div>
                {gmailConnected ? (
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center text-center gap-4">
                  {gmailConnected && gmailData ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                        <Mail className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-900">Gmail Agent Active</h3>
                      
                      <div className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left shadow-sm mt-2 mb-2 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase">Account</span>
                          <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            {gmailData.email} <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Watch API</span>
                          <span className="text-xs font-medium text-slate-900 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-green-500" /> Active
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Pub/Sub</span>
                          <span className="text-xs font-medium text-slate-900 flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-green-500" /> Connected
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-100 mt-1">
                          <span className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                             <History className="w-3 h-3" /> Last Sync
                          </span>
                          <span className="text-xs font-mono text-slate-600">
                             {gmailData.lastSyncAt ? new Date(gmailData.lastSyncAt).toLocaleString() : new Date(gmailData.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={disconnectGmail}
                        className="mt-2 px-6 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-all"
                      >
                        Disconnect Integration
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                        <Mail className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-900">Connect Gmail Workspace</h3>
                      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                        Grant read-only access to HireNest agents to enable autonomous resume harvesting and client follow-ups.
                      </p>
                      <button 
                        onClick={connectGmail}
                        disabled={loading}
                        className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5 fill-current" />}
                        Authorize via Google
                      </button>
                    </>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <h5 className="text-sm font-black text-amber-900 uppercase tracking-tight">Step 1: Update Google Cloud Console</h5>
                      <p className="text-xs text-amber-700 font-medium leading-relaxed mt-2">
                        To link your Gmail, you MUST add this exact URI to your "Authorized redirect URIs" in the Google Cloud Console. 
                        If you see an old app, it's because you are using a client ID associated with a different domain.
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <code className="px-4 py-2 bg-slate-900 text-indigo-400 rounded-xl text-[10px] font-mono break-all border border-slate-800 select-all">
                          {window.location.origin}/api/auth?action=callback
                        </code>
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b border-amber-300">Copy this exact URL</span>
                      </div>
                    </div>
                  </div>

                  
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex items-start gap-4 mt-4">
                    <Shield className="w-6 h-6 text-indigo-600 shrink-0" />
                    <div>
                      <h5 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Step 2: Server-Side Processing</h5>
                      <p className="text-xs text-indigo-700 font-medium leading-relaxed mt-2">
                        Configure a Google Cloud Pub/Sub topic to receive Gmail Watch API webhook notifications. The HireNest Cloud Function will automatically fetch payloads using encrypted refresh tokens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">Security Protocols</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Manage access controls and administrative credentials.</p>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const isLocked = user && (user.loginCount || 0) < 3 && !user.mustChangePassword;
                if (isLocked) {
                  return toast.error("Password update is currently locked. A minimum of 3 successful logins is required.");
                }

                if (passwords.new !== passwords.confirm) {
                  return toast.error("New passwords don't match");
                }
                setLoading(true);
                try {
                  if (auth.currentUser) {
                    await updatePassword(auth.currentUser, passwords.new);
                    if (user) {
                      await UserRepository.update(user.id, {
                        mustChangePassword: false,
                        temporaryPassword: ''
                      });
                    }
                    toast.success("Password updated successfully");
                    setPasswords({ current: '', new: '', confirm: '' });
                  } else {
                    toast.error("No active authenticated session found. Note: Executive bypass password cannot be modified.");
                  }
                } catch (err: any) {
                  toast.error(err.message || "Failed to update password");
                }
                setLoading(false);
              }} className="max-w-md space-y-6">
                {user && (user.loginCount || 0) < 3 && !user.mustChangePassword && (
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wide">Custom Password Updates Locked</h4>
                      <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                        To maintain secure platform compliance, your account must register at least <strong>3 successful logins</strong> before custom password updates are unlocked.
                      </p>
                      <div className="pt-2 text-[10px] font-black text-amber-800 uppercase tracking-widest font-mono">
                        Current Logins: {user?.loginCount || 0} / 3 Completed
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    disabled={user && (user.loginCount || 0) < 3 && !user.mustChangePassword}
                    value={passwords.new}
                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    disabled={user && (user.loginCount || 0) < 3 && !user.mustChangePassword}
                    value={passwords.confirm}
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm disabled:opacity-50"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading || (user && (user.loginCount || 0) < 3 && !user.mustChangePassword)}
                  className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Access Password
                </button>
              </form>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Identity & Team Directory Settings</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Edit personal profile fields and oversee team credentials, roles, and platform access.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. PERSONAL PROFILE CARD */}
                <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-800 text-sm">Your Identity Profile</h3>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex flex-col items-center gap-3 py-2 bg-white border border-slate-200 rounded-xl p-4">
                      <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xl overflow-hidden border border-indigo-200 shadow-sm">
                        {profileForm.avatar ? (
                          <img referrerPolicy="no-referrer" src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          profileForm.name ? profileForm.name.slice(0, 2).toUpperCase() : 'HN'
                        )}
                      </div>
                      <div className="text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider font-mono">
                          {user?.role || 'viewer'}
                        </span>
                        <p className="text-slate-400 text-[10px] mt-1 font-medium font-mono">{user?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-semibold text-slate-800"
                        placeholder="Name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-semibold text-slate-800"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avatar Image URL</label>
                      <input
                        type="text"
                        value={profileForm.avatar}
                        onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-mono text-slate-600"
                        placeholder="https://..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Identity
                    </button>
                  </form>
                </div>

                {/* 2. TEAM DIRECTORY & ACCESS CONTROL */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-extrabold text-slate-800 text-sm">Team Directory & Access List</h3>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'founder') && !showAddUser && (
                      <button
                        onClick={() => setShowAddUser(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Member
                      </button>
                    )}
                  </div>

                  {/* CREATED USER CREDENTIALS BANNER (SUCCESS INVITATION CARD) */}
                  {createdUserCredentials && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider font-mono">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Credential Provisioned & Logged to Ledger
                        </div>
                        <button 
                          onClick={() => setCreatedUserCredentials(null)} 
                          className="text-emerald-500 hover:text-emerald-700 font-bold text-xs uppercase"
                        >
                          Dismiss
                        </button>
                      </div>
                      
                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                        A new corporate account has been successfully created in Firebase Authentication. Copy and send the message template below to inform the user.
                      </p>
                      
                      <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-inner relative">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap select-all pr-12 leading-relaxed">
{`Dear ${createdUserCredentials.name},

Your HireNest access credentials have been provisioned successfully! You can now log in using the following details:

Email Address: ${createdUserCredentials.email}
Temporary Password: ${createdUserCredentials.temporaryPassword}

Note: To maintain platform security compliance, you must log in successfully at least 3 times before you can customize and update your own password in Settings > Security.

Best regards,
HireNest Workforce Administration`}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Dear ${createdUserCredentials.name},\n\nYour HireNest access credentials have been provisioned successfully! You can now log in using the following details:\n\nEmail Address: ${createdUserCredentials.email}\nTemporary Password: ${createdUserCredentials.temporaryPassword}\n\nNote: To maintain platform security compliance, you must log in successfully at least 3 times before you can customize and update your own password in Settings > Security.\n\nBest regards,\nHireNest Workforce Administration`);
                            toast.success("Invitation message copied to clipboard!");
                          }}
                          title="Copy message to clipboard"
                          className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* RESET SUCCESS CREDENTIALS BANNER */}
                  {resetSuccessCredentials && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                        <div className="flex items-center gap-2 text-blue-800 font-extrabold text-xs uppercase tracking-wider font-mono">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Password Reset Executed Successfully
                        </div>
                        <button 
                          onClick={() => setResetSuccessCredentials(null)} 
                          className="text-blue-500 hover:text-blue-700 font-bold text-xs uppercase"
                        >
                          Dismiss
                        </button>
                      </div>
                      
                      <p className="text-xs text-blue-800 leading-relaxed font-semibold">
                        The user's password has been updated. Copy and send the template below to inform them of their new temporary credentials.
                      </p>
                      
                      <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-inner relative">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap select-all pr-12 leading-relaxed">
{`Dear ${resetSuccessCredentials.name},

Your HireNest access password has been reset by the System Administrator. Please log in using your new temporary credentials:

Email Address: ${resetSuccessCredentials.email}
New Temporary Password: ${resetSuccessCredentials.temporaryPassword}

Note: Your login counter has been reset. You must complete at least 3 successful logins to re-unlock custom password updates in your Settings.

Best regards,
System Administrator`}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Dear ${resetSuccessCredentials.name},\n\nYour HireNest access password has been reset by the System Administrator. Please log in using your new temporary credentials:\n\nEmail Address: ${resetSuccessCredentials.email}\nNew Temporary Password: ${resetSuccessCredentials.temporaryPassword}\n\nNote: Your login counter has been reset. You must complete at least 3 successful logins to re-unlock custom password updates in your Settings.\n\nBest regards,\nSystem Administrator`);
                            toast.success("Password reset notification copied to clipboard!");
                          }}
                          title="Copy reset notification"
                          className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* INLINE ADD USER FORM */}
                  {showAddUser && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-black uppercase text-slate-700 font-mono tracking-wider">Configure New Access Credentials</h4>
                        <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                            <input
                              type="text"
                              required
                              value={newUserForm.name}
                              onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                              placeholder="e.g. Priya Sharma"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <input
                              type="email"
                              required
                              value={newUserForm.email}
                              onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              placeholder="e.g. priya@hirenestworkforce.com"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                            <input
                              type="text"
                              value={newUserForm.phone}
                              onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Privilege Role</label>
                            <select
                              value={newUserForm.role}
                              onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-semibold text-slate-700"
                            >
                              <option value="client_manager">BDM (Client Manager)</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="admin">System Administrator</option>
                              <option value="viewer">Viewer / Guest</option>
                            </select>
                          </div>

                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temporary Default Password</label>
                            <input
                              type="text"
                              required
                              value={newUserForm.password}
                              onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                              placeholder="e.g. Welcome@HN2026"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-semibold text-slate-800"
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">This password will be pre-configured. They must log in successfully 3 times with this account before they can change it.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowAddUser(false)}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                          >
                            Create & Provision
                          </button>
                        </div>
                      </form>

                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <Shield className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-indigo-700 leading-relaxed font-semibold">
                          <strong>Active Provisioning:</strong> This action creates their corporate account credentials in Firebase Authentication and Firestore immediately. The employee can then log in right away using their email and the provided temporary password.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* DIRECTORY LISTING */}
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500">
                          <th className="p-4">Name & Identity</th>
                          <th className="p-4">Mobile Number</th>
                          <th className="p-4">Access Privilege</th>
                          <th className="p-4">Account Status</th>
                          {(user?.role === 'admin' || user?.role === 'founder') && <th className="p-4 text-right">Ledger Control</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                              No team directory profiles found. Loading...
                            </td>
                          </tr>
                        ) : (
                          usersList.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner">
                                    {member.avatar ? (
                                      <img referrerPolicy="no-referrer" src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                      member.name ? member.name.slice(0, 2).toUpperCase() : 'HN'
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900">{member.name || 'Invited User'}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                      <span>{member.email}</span>
                                      <span className="text-slate-200">|</span>
                                      <span className="text-indigo-600 font-bold font-sans">Logins: {member.loginCount || 0}</span>
                                      {member.mustChangePassword && (
                                        <>
                                          <span className="text-slate-200">|</span>
                                          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">Temp PW Active</span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-mono font-medium text-slate-500">
                                {member.phone || 'Not Configured'}
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider",
                                  member.role === 'admin' && "bg-rose-100 text-rose-800 border border-rose-200",
                                  member.role === 'founder' && "bg-purple-100 text-purple-800 border border-purple-200",
                                  member.role === 'client_manager' && "bg-indigo-100 text-indigo-800 border border-indigo-200",
                                  member.role === 'recruiter' && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                                  member.role === 'viewer' && "bg-slate-100 text-slate-800 border border-slate-200",
                                )}>
                                  {member.role === 'client_manager' ? 'BDM' : member.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  member.status === 'active' || !member.status ? "text-emerald-700 bg-emerald-50" : "text-slate-400 bg-slate-100"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", member.status === 'active' || !member.status ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                                  {member.status === 'active' || !member.status ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              {(user?.role === 'admin' || user?.role === 'founder') && (
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      disabled={member.id === user.id}
                                      onClick={() => {
                                        setResettingUser(member);
                                        setResetPasswordVal('HN-Reset-' + Math.floor(1000 + Math.random() * 9000));
                                        setResetSuccessCredentials(null);
                                      }}
                                      title="Reset Password for this Member"
                                      className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={member.id === user.id}
                                      onClick={() => handleUpdateUserAccess(member.id, {
                                        role: member.role === 'recruiter' ? 'client_manager' : 'recruiter'
                                      })}
                                      title="Toggle Role Between Recruiter / BDM"
                                      className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={member.id === user.id}
                                      onClick={() => handleUpdateUserAccess(member.id, {
                                        status: (member.status === 'active' || !member.status) ? 'inactive' : 'active'
                                      })}
                                      title="Toggle Member Status"
                                      className={cn(
                                        "p-1 rounded-lg transition-all",
                                        (member.status === 'active' || !member.status) ? "bg-amber-50 hover:bg-amber-100 text-amber-600" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                      )}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={member.id === user.id}
                                      onClick={() => {
                                        setDeletingUser(member);
                                      }}
                                      title="Delete Profile permanently"
                                      className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ADMIN PASSWORD RESET CONFIRMATION MODAL */}
                  {resettingUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2 text-indigo-600">
                            <KeyRound className="w-5 h-5 animate-spin-once" />
                            <h3 className="font-extrabold text-slate-900 text-sm">Administrative Password Reset</h3>
                          </div>
                          <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            You are resetting the password for <strong className="text-slate-800">{resettingUser.name || resettingUser.email}</strong>.
                            This will immediately change their credential in Firebase Auth and reset their logins count to 0, forcing them to use the new password.
                          </p>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block ml-1">New Temporary Password</label>
                            <input
                              type="text"
                              value={resetPasswordVal}
                              onChange={(e) => setResetPasswordVal(e.target.value)}
                              placeholder="Min 6 characters"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none text-xs transition-all shadow-sm font-mono font-bold text-slate-800"
                            />
                            <p className="text-[9px] text-slate-400 font-medium">We pre-generated a secure password. You can customize it above before confirming.</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => setResettingUser(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={loading || !resetPasswordVal}
                            onClick={handleResetPasswordConfirm}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {loading ? "Resetting..." : "Confirm & Reset"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN USER DELETION CONFIRMATION MODAL */}
                  {deletingUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2 text-rose-600">
                            <Trash2 className="w-5 h-5 animate-bounce-once" />
                            <h3 className="font-extrabold text-slate-900 text-sm">Delete Corporate Profile</h3>
                          </div>
                          <button onClick={() => setDeletingUser(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            You are about to permanently delete the corporate account for <strong className="text-slate-800">{deletingUser.name || deletingUser.email}</strong>.
                          </p>
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-2.5 items-start animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h5 className="font-bold text-rose-900 text-[10px] uppercase tracking-wide">Critical Security Warning</h5>
                              <p className="text-[10px] text-rose-700 leading-relaxed font-semibold">
                                This will permanently remove their access credentials from <strong>Firebase Authentication</strong> and delete their user profile document from <strong>Firestore</strong> immediately. This action is irreversible.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => setDeletingUser(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={handleDeleteUserConfirm}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {loading ? "Deleting..." : "Confirm & Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Organization Profile & Governance</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Edit organizational metadata, parameters, and global regulatory identifiers.</p>
                  </div>
                </div>
                <button
                  onClick={handleSaveOrg}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 skeuo-btn text-xs font-black uppercase font-mono"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? "Registering..." : "Update Org"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* BRAND FORM */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                  <form onSubmit={handleSaveOrg} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Organization Name</label>
                        <input
                          type="text"
                          required
                          value={orgForm.name}
                          onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Corporate Domain</label>
                        <input
                          type="text"
                          required
                          value={orgForm.domain}
                          onChange={e => setOrgForm({ ...orgForm, domain: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm font-mono text-slate-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Cloud hosting Region</label>
                        <input
                          type="text"
                          required
                          value={orgForm.region}
                          onChange={e => setOrgForm({ ...orgForm, region: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">GST/Tax Identification Number</label>
                        <input
                          type="text"
                          required
                          value={orgForm.taxId}
                          onChange={e => setOrgForm({ ...orgForm, taxId: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all shadow-sm font-mono text-indigo-700 font-bold"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* INFO BOARD */}
                <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-slate-800 text-sm">Regulatory & Audit Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                        <span className="text-slate-400 font-semibold font-mono uppercase tracking-wider text-[10px]">Active Platform Users</span>
                        <span className="font-black text-slate-800">{firebaseStats.users}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                        <span className="text-slate-400 font-semibold font-mono uppercase tracking-wider text-[10px]">Global Requirements</span>
                        <span className="font-black text-slate-800">{firebaseStats.requirements}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                        <span className="text-slate-400 font-semibold font-mono uppercase tracking-wider text-[10px]">Managed Candidates</span>
                        <span className="font-black text-slate-800">{firebaseStats.candidates}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                        <span className="text-slate-400 font-semibold font-mono uppercase tracking-wider text-[10px]">Immutable Audit Trails</span>
                        <span className="font-black text-slate-800">{firebaseStats.logs}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                      <div className="flex gap-2 items-center text-slate-800 font-extrabold text-xs">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        Law 2 Enforcement
                      </div>
                      <p>
                        Firebase acts as the sole enterprise single source of truth. Schema changes, manual table insertions, or shadow data silos are strictly forbidden under the current RC-1 system status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'firebase' && activeTab !== 'gmail' && activeTab !== 'security' && activeTab !== 'profile' && activeTab !== 'company' && activeTab !== 'workflows' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-20 border border-slate-100 border-dashed rounded-2xl">
              <SettingsIcon className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-medium">{activeTab[0].toUpperCase() + activeTab.slice(1)} settings coming in next module.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
