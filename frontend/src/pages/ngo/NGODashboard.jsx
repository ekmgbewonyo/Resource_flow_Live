// ## NGO Dashboard - Donor institution view with Project Wizard
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Heart } from 'lucide-react';
import { NGODashboardWidget } from '../../components/ngo/NGODashboardWidget';
import { ProjectWizard } from '../../components/ngo/ProjectWizard';
import { Button } from '../../components/ui/Button';
import { projectApi } from '../../services/api';

export const NGODashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await projectApi.getAll();
      const data = res?.data ?? res;
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = (project) => {
    setShowWizard(false);
    fetchProjects();
    navigate(`/dashboard/projects/${project?.id}`, { replace: true });
  };

  if (showWizard) {
    return (
      <div className="p-6">
        <ProjectWizard
          onSuccess={handleProjectCreated}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">NGO Portal</h2>
          <p className="text-slate-600 mt-1">Manage your projects and funding</p>
        </div>
        <Button icon={Plus} onClick={() => setShowWizard(true)}>
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <NGODashboardWidget
            onCreateProject={() => setShowWizard(true)}
            onPostUpdate={() => navigate('/dashboard/proofs')}
          />
        </div>
        <div className="lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">My Projects</h3>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : projects.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <Package className="mx-auto text-slate-400 mb-2" size={40} />
              <p className="text-slate-600">No projects yet</p>
              <Button className="mt-4" icon={Plus} onClick={() => setShowWizard(true)}>
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-emerald-300 transition"
                >
                  <p className="font-medium text-slate-800">{p.title}</p>
                  <p className="text-sm text-slate-500">
                    {p.status} • GH₵{(p.target_amount ?? p.budget ?? 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;
