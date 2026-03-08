// ## Project Detail - View/edit NGO project
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Send } from 'lucide-react';
import { projectApi } from '../../services/api';
import { Button } from '../../components/ui/Button';

const formatGHC = (n) => `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const data = await projectApi.getById(Number(id));
        setProject(data);
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSubmit = async () => {
    if (!project?.id) return;
    try {
      await projectApi.submit(project.id);
      setProject((p) => ({ ...p, status: 'pending_approval' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!project) return <div className="p-6">Project not found</div>;

  const target = parseFloat(project.target_amount ?? project.budget ?? 0);
  const raised = parseFloat(project.raised_amount ?? project.funded_amount ?? 0);
  const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{project.title}</h2>
          <p className="text-slate-500 text-sm">{project.status}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <p className="text-slate-700">{project.description}</p>
        <p><strong>Location:</strong> {project.location || '—'}</p>
        <p><strong>Target:</strong> {formatGHC(target)}</p>
        <p><strong>Raised:</strong> {formatGHC(raised)} ({pct.toFixed(0)}%)</p>

        {project.project_budgets?.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Budget Breakdown</h3>
            <ul className="space-y-1 text-sm">
              {project.project_budgets.map((b, i) => (
                <li key={i}>
                  {b.item_name} ({b.category}): {formatGHC(b.total_cost ?? b.quantity * b.unit_cost)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.status === 'draft' && (
          <Button icon={Send} onClick={handleSubmit}>
            Submit for Approval
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
