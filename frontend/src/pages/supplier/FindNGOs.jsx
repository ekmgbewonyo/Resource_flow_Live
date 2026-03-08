// ## Find NGOs Page
// ## Lists all NGOs with projects, completion rate, and impact for donors to select partners
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Target,
  TrendingUp,
  Search,
  Filter,
  Users,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Heart,
  MapPin,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { matchmakingApi, csrPartnershipApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatGHC } from '../../utils/currency';
import { SDG_GOALS } from '../../types/csr';

const FindNGOs = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSdg, setFilterSdg] = useState('');
  const [expandedNgo, setExpandedNgo] = useState(null);
  const [fundingProject, setFundingProject] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundType, setFundType] = useState('one_time');
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundError, setFundError] = useState('');

  const isCorporate = role === 'donor_institution';

  useEffect(() => {
    loadNGOs();
  }, [filterSdg]);

  const loadNGOs = async () => {
    try {
      setLoading(true);
      const params = filterSdg ? { sdg: parseInt(filterSdg) } : {};
      const { ngos: data } = await matchmakingApi.getNGOs(params);
      setNgos(data || []);
    } catch (err) {
      console.error('Failed to load NGOs:', err);
      setNgos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNgos = ngos.filter((ngo) => {
    const q = searchQuery.toLowerCase();
    const name = (ngo.name || '').toLowerCase();
    const org = (ngo.organization || '').toLowerCase();
    const addr = (ngo.address || '').toLowerCase();
    const projectTitles = (ngo.projects || []).map((p) => (p.title || '').toLowerCase()).join(' ');
    return name.includes(q) || org.includes(q) || addr.includes(q) || projectTitles.includes(q);
  });

  const handleFundProject = (ngo, project) => {
    setFundingProject({ ngo, project });
    setFundAmount('');
    setFundError('');
  };

  const handleSubmitPartnership = async (e) => {
    e.preventDefault();
    if (!fundingProject || !fundAmount || parseFloat(fundAmount) <= 0) return;
    setFundError('');
    setFundingLoading(true);
    try {
      await csrPartnershipApi.create({
        ngo_id: fundingProject.ngo.id,
        project_id: fundingProject.project.id,
        funding_amount: parseFloat(fundAmount),
        funding_type: fundType,
      });
      setFundingProject(null);
      loadNGOs();
    } catch (err) {
      setFundError(err.response?.data?.message || err.response?.data?.errors?.funding_amount?.[0] || 'Failed to create partnership');
    } finally {
      setFundingLoading(false);
    }
  };

  const getCompletionBadge = (rate) => {
    if (rate >= 80) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' };
    if (rate >= 50) return { label: 'Good', color: 'bg-blue-100 text-blue-700' };
    if (rate >= 25) return { label: 'Developing', color: 'bg-amber-100 text-amber-700' };
    return { label: 'New', color: 'bg-slate-100 text-slate-600' };
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading NGOs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 size={28} className="text-emerald-600" />
          Find NGOs
        </h2>
        <p className="text-slate-600 mt-1">
          Browse verified NGOs, their CSR projects, completion rates, and impact. Select the best partners for your corporate giving.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NGOs, projects, or location..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={18} />
            <select
              value={filterSdg}
              onChange={(e) => setFilterSdg(e.target.value)}
              className="flex-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All SDG Goals</option>
              {SDG_GOALS.map((sdg) => (
                <option key={sdg.id} value={sdg.id}>
                  SDG {sdg.id}: {sdg.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* NGO List */}
      {filteredNgos.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No NGOs found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNgos.map((ngo) => {
            const badge = getCompletionBadge(ngo.completion_rate);
            const isExpanded = expandedNgo === ngo.id;

            return (
              <div
                key={ngo.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* NGO Header */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedNgo(isExpanded ? null : ngo.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800">{ngo.name}</h3>
                        {ngo.organization && (
                          <span className="text-sm text-slate-500">({ngo.organization})</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label} • {ngo.completion_rate}% completion
                        </span>
                      </div>
                      {ngo.address && (
                        <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                          <MapPin size={14} />
                          {ngo.address}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{ngo.completion_rate}%</p>
                        <p className="text-xs text-slate-500">Completion</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-700">{ngo.total_projects}</p>
                        <p className="text-xs text-slate-500">Projects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{ngo.total_lives_impacted}</p>
                        <p className="text-xs text-slate-500">Lives Impacted</p>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded: Projects & Impact */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-6">
                    {/* CSR Brief & Impact */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Award size={16} className="text-emerald-600" />
                        Impact Summary
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                          <Users className="text-emerald-600" size={18} />
                          <span className="text-sm font-medium">{ngo.total_lives_impacted} lives impacted</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                          <CheckCircle className="text-emerald-600" size={18} />
                          <span className="text-sm font-medium">{ngo.completed_projects} projects completed</span>
                        </div>
                      </div>
                    </div>

                    {/* Projects List */}
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-emerald-600" />
                      CSR Projects
                    </h4>
                    <div className="space-y-3">
                      {(ngo.projects || []).map((project) => (
                        <div
                          key={project.id}
                          className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4"
                        >
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-800">{project.title}</h5>
                            {project.description && (
                              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(project.sdg_goals || []).slice(0, 3).map((sdgId) => {
                                const sdg = SDG_GOALS.find((s) => s.id === sdgId);
                                return sdg ? (
                                  <span
                                    key={sdgId}
                                    className="text-xs px-2 py-0.5 bg-slate-100 rounded"
                                    title={sdg.name}
                                  >
                                    SDG {sdgId}
                                  </span>
                                ) : null;
                              })}
                              {project.impact_proofs_count > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                  {project.impact_proofs_count} impact proof(s)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                {formatGHC(project.funded_amount)} / {formatGHC(project.target_amount)}
                              </p>
                              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${Math.min(100, project.funding_progress || 0)}%` }}
                                />
                              </div>
                            </div>
                            {isCorporate && project.status !== 'completed' && (
                              <Button
                                size="sm"
                                icon={Heart}
                                onClick={() => handleFundProject(ngo, project)}
                              >
                                Fund Project
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fund Project Modal */}
      {fundingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Fund CSR Project</h3>
            <p className="text-sm text-slate-600 mb-4">
              {fundingProject.project.title} — {fundingProject.ngo.name}
            </p>
            <form onSubmit={handleSubmitPartnership} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Amount (GH₵) *</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Funding Type</label>
                <select
                  value={fundType}
                  onChange={(e) => setFundType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                  <option value="milestone_based">Milestone-based</option>
                </select>
              </div>
              {fundError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600 shrink-0" size={18} />
                  <p className="text-sm text-red-700">{fundError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFundingProject(null)}
                  className="flex-1"
                  disabled={fundingLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={fundingLoading || !fundAmount || parseFloat(fundAmount) <= 0}
                  icon={fundingLoading ? Loader2 : Heart}
                >
                  {fundingLoading ? 'Processing...' : 'Create Partnership'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindNGOs;
