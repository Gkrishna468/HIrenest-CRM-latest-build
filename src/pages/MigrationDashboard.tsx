import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { migrationService } from '@/services/firebase/migrationService';
import { Activity, Database, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, Zap, ShieldAlert } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

interface Metric {
  id: string;
  timestamp: string;
  collectionName: string;
  supabaseCount: number;
  firebaseCount: number;
  parity: number;
  fieldParity: number;
  relationshipParity: number;
  eventParity: number;
  status: string;
}

export default function MigrationDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'migration_metrics'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const recentMetrics = snapshot.docs.map(doc => doc.data() as Metric);
      setMetrics(recentMetrics);
    } catch (error) {
      console.error('Failed to fetch migration metrics', error);
    } finally {
      setLoading(false);
    }
  };

  const cutoverStatus = useMemo(() => {
    if (metrics?.length === 0) return 'NOT READY';
    const recentFailures = metrics.slice(0, 6).some(m => m.status === 'FAIL' || m.fieldParity < 100 || m.relationshipParity < 100 || (m.eventParity ?? 100) < 100);
    if (recentFailures) return 'NOT READY';
    return 'READY FOR PHASE 5';
  }, [metrics]);

  const migrationConfidence = useMemo(() => {
    if (metrics?.length === 0) return 0;
    const avgScore = metrics.reduce((acc, m) => acc + (m.parity + m.fieldParity + m.relationshipParity + (m.eventParity ?? 100)) / 4, 0) / metrics?.length;
    return avgScore.toFixed(2);
  }, [metrics]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <AlertTriangle className="w-12 h-12 mb-4 text-orange-400" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p>This view is restricted to Founder/Admin roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Migration Health Dashboard</h1>
          <p className="text-slate-500 mt-1">Live tracking of Dual Read Mode parity check (Phase 4).</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Top Indicators Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cutover Status Indicator */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between ${cutoverStatus === 'READY FOR PHASE 5' ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-full ${cutoverStatus === 'READY FOR PHASE 5' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
               {cutoverStatus === 'READY FOR PHASE 5' ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
             </div>
             <div>
               <p className={`text-sm font-bold uppercase tracking-widest ${cutoverStatus === 'READY FOR PHASE 5' ? 'text-emerald-600' : 'text-orange-600'}`}>System Cutover Status</p>
               <h2 className={`text-2xl font-black ${cutoverStatus === 'READY FOR PHASE 5' ? 'text-emerald-900' : 'text-orange-900'}`}>{cutoverStatus}</h2>
             </div>
          </div>
          {cutoverStatus === 'READY FOR PHASE 5' && (
            <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Authorize Phase 5
            </button>
          )}
        </div>

        {/* Migration Confidence */}
        <div className="p-6 rounded-2xl border bg-slate-900 border-slate-800 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
               <ShieldAlert className="w-8 h-8" />
             </div>
             <div>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Migration Confidence</p>
               <h2 className="text-3xl font-black text-white">{migrationConfidence}%</h2>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Parity Reports
          </h3>
          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1 uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            Phase 4: Dual Read
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Collection</th>
                <th className="px-6 py-4 text-center">Supabase Count</th>
                <th className="px-6 py-4 text-center">Firebase Count</th>
                <th className="px-6 py-4 text-center">Record Parity</th>
                <th className="px-6 py-4 text-center">Field Parity</th>
                <th className="px-6 py-4 text-center">Rel. Parity</th>
                <th className="px-6 py-4 text-center">Event Parity</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No parity checks recorded yet. They run automatically on data load.
                  </td>
                </tr>
              ) : (
                metrics.map(metric => (
                  <tr key={metric.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{new Date(metric.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 capitalize">{metric.collectionName}</td>
                    <td className="px-6 py-4 text-center font-mono">{metric.supabaseCount}</td>
                    <td className="px-6 py-4 text-center font-mono">{metric.firebaseCount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${metric.parity === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {metric.parity}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${metric.fieldParity === 100 ? 'bg-emerald-100 text-emerald-700' : (metric.fieldParity >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                        {metric.fieldParity ?? 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${metric.relationshipParity === 100 ? 'bg-emerald-100 text-emerald-700' : (metric.relationshipParity >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                        {metric.relationshipParity ?? 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${(metric.eventParity ?? 100) === 100 ? 'bg-emerald-100 text-emerald-700' : ((metric.eventParity ?? 100) >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                        {metric.eventParity ?? 100}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {metric.status === 'PASS' && metric.fieldParity === 100 && metric.relationshipParity === 100 && (metric.eventParity ?? 100) === 100 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                          <CheckCircle2 className="w-4 h-4" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-orange-600 font-bold text-xs uppercase tracking-widest">
                          <AlertTriangle className="w-4 h-4" /> FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
