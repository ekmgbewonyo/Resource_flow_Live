// ## NGO Dashboard Widget - Verification status, active projects funding %, quick actions
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { organizationApi, projectApi } from '../../services/api';
import { Button } from '../ui/Button';

const formatGHC = (n) => `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const NGODashboardWidget = ({ onPostUpdate, onCreateProject }) => {
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [orgRes, projRes] = await Promise.all([
          organizationApi.get(),
          projectApi.getAll({ status: 'active' }),
        ]);
        setOrg(orgRes?.organization ?? null);
        const data = projRes?.data ?? projRes;
        setProjects(Array.isArray(data) ? data : (data?.data ?? []));
      } catch (err) {
        console.error('NGO widget load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const tierLabel = org?.verification_tier === 'tier_2'
    ? 'Tier 2 - Verified'
    : org?.verification_tier === 'tier_3'
    ? 'Tier 3 - Fully Verified'
    : org
    ? 'Tier 1 - Upload RG to unlock Tier 2'
    : 'No organization profile — Create one to publish projects';

  const activeProjects = projects.filter((p) => ['active', 'pending_approval'].includes(p.status));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <ShieldCheck size={20} />
        NGO Portal
      </h3>

      {/* Verification Status */}
      <div className="p-3 rounded-lg bg-slate-50">
        <p className="text-sm font-medium text-slate-700">Verification Status</p>
        <p className={`text-sm mt-1 ${
          org?.verification_tier === 'tier_1' ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {tierLabel}
        </p>
        {org?.verification_tier === 'tier_1' && (
          <p className="text-xs text-slate-500 mt-1">
            Projects over GH₵5,000 require Tier 2+. Upload your Registration (RG) in Organization settings.
          </p>
        )}
      </div>

      {/* Active Projects Funding */}
      {activeProjects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Active Projects Funding</p>
          <div className="space-y-3">
            {activeProjects.slice(0, 3).map((p) => {
              const target = parseFloat(p.target_amount ?? p.budget ?? 0);
              const raised = parseFloat(p.raised_amount ?? p.funded_amount ?? 0);
              const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate max-w-[180px]">{p.title}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {!org && (
          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/organization')}>
            Create Organization
          </Button>
        )}
        {onCreateProject && (
          <Button size="sm" onClick={onCreateProject}>
            Create Project
          </Button>
        )}
        {onPostUpdate && (
          <Button variant="outline" size="sm" icon={Camera} onClick={onPostUpdate}>
            Post Update
          </Button>
        )}
      </div>
    </div>
  );
};

export default NGODashboardWidget;
