// ## Project Upload Wizard - Multi-step form for NGOs
// ## Step 1: Pitch | Step 2: Budget | Step 3: Proof | Step 4: Review
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, FileText, Calculator, ShieldCheck, Eye, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { projectApi, organizationApi, requestApi } from '../../services/api';
import { Button } from '../ui/Button';

const STEPS = [
  { id: 1, title: 'The Pitch', icon: FileText },
  { id: 2, title: 'The Budget', icon: Calculator },
  { id: 3, title: 'Proof of Capability', icon: ShieldCheck },
  { id: 4, title: 'Review & Submit', icon: Eye },
];

const CATEGORIES = [
  { value: 'material', label: 'Materials' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'admin', label: 'Admin/Overhead' },
  { value: 'labor', label: 'Labor' },
];

const formatGHC = (n) => `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ProjectWizard = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    location_gps: '',
    cover_photo_path: '',
    budgets: [{ category: 'material', item_name: '', quantity: 1, unit_cost: 0 }],
    proof_documents: [],
  });

  const addBudgetRow = () => {
    setFormData((p) => ({
      ...p,
      budgets: [...p.budgets, { category: 'material', item_name: '', quantity: 1, unit_cost: 0 }],
    }));
  };

  const removeBudgetRow = (i) => {
    if (formData.budgets.length <= 1) return;
    setFormData((p) => ({
      ...p,
      budgets: p.budgets.filter((_, idx) => idx !== i),
    }));
  };

  const updateBudget = (i, field, value) => {
    setFormData((p) => ({
      ...p,
      budgets: p.budgets.map((b, idx) =>
        idx === i ? { ...b, [field]: value } : b
      ),
    }));
  };

  const budgetTotals = formData.budgets.reduce(
    (acc, b) => {
      const total = (parseFloat(b.quantity) || 0) * (parseFloat(b.unit_cost) || 0);
      acc.total += total;
      if (b.category === 'admin') acc.admin += total;
      if (['material', 'labor'].includes(b.category)) acc.direct += total;
      if (b.category === 'transportation') acc.logistics += total;
      return acc;
    },
    { total: 0, admin: 0, direct: 0, logistics: 0 }
  );

  const adminPercent = budgetTotals.total > 0 ? (budgetTotals.admin / budgetTotals.total) * 100 : 0;
  const hasMaterialOrTransport = formData.budgets.some((b) =>
    ['material', 'transportation'].includes(b.category)
  );

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'project');
      const res = await requestApi.uploadFile(fd);
      if (res.path) setFormData((p) => ({ ...p, cover_photo_path: res.path }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'project');
      const res = await requestApi.uploadFile(fd);
      if (res.path)
        setFormData((p) => ({
          ...p,
          proof_documents: [...(p.proof_documents || []), res.path],
        }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        location: formData.location || undefined,
        location_gps: formData.location_gps || undefined,
        cover_photo_path: formData.cover_photo_path || undefined,
        budgets: formData.budgets
          .filter((b) => b.item_name && (parseFloat(b.quantity) || 0) > 0 && (parseFloat(b.unit_cost) || 0) >= 0)
          .map((b) => ({
            category: b.category,
            item_name: b.item_name,
            quantity: parseFloat(b.quantity) || 0,
            unit_cost: parseFloat(b.unit_cost) || 0,
          })),
        proof_documents: formData.proof_documents?.length ? formData.proof_documents : undefined,
      };

      const result = await projectApi.create(payload);
      onSuccess?.(result.project);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.budgets?.[0] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Direct Impact', value: budgetTotals.direct, color: '#10b981' },
    { name: 'Logistics', value: budgetTotals.logistics, color: '#3b82f6' },
    { name: 'Overhead', value: budgetTotals.admin, color: adminPercent > 15 ? '#ef4444' : '#f59e0b' },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-3xl mx-auto">
      {/* Progress */}
      <div className="flex border-b border-slate-200">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1 text-sm font-medium transition ${
              step === s.id ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <s.icon size={16} />
            {s.title}
          </button>
        ))}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="text-red-600 shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: The Pitch */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">The Pitch</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="w-full p-2 border border-slate-200 rounded-lg"
                placeholder="Project title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Story / Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full p-2 border border-slate-200 rounded-lg"
                rows={5}
                placeholder="Tell your story..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                className="w-full p-2 border border-slate-200 rounded-lg"
                placeholder="e.g. Accra, Northern Region"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="block text-sm" />
              {formData.cover_photo_path && <p className="text-xs text-emerald-600 mt-1">✓ Uploaded</p>}
            </div>
          </div>
        )}

        {/* Step 2: The Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">The Budget (Trust Builder)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2">Item</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Qty</th>
                    <th className="text-left py-2">Unit Cost</th>
                    <th className="text-left py-2">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {formData.budgets.map((b, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">
                        <input
                          type="text"
                          value={b.item_name}
                          onChange={(e) => updateBudget(i, 'item_name', e.target.value)}
                          className="w-full p-1 border rounded"
                          placeholder="Item name"
                        />
                      </td>
                      <td className="py-2">
                        <select
                          value={b.category}
                          onChange={(e) => updateBudget(i, 'category', e.target.value)}
                          className="p-1 border rounded"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={b.quantity}
                          onChange={(e) => updateBudget(i, 'quantity', e.target.value)}
                          className="w-20 p-1 border rounded"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={b.unit_cost}
                          onChange={(e) => updateBudget(i, 'unit_cost', e.target.value)}
                          className="w-24 p-1 border rounded"
                        />
                      </td>
                      <td className="py-2 font-medium">
                        {formatGHC((parseFloat(b.quantity) || 0) * (parseFloat(b.unit_cost) || 0))}
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeBudgetRow(i)} className="text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" icon={Plus} onClick={addBudgetRow} size="sm">
              Add Line Item
            </Button>

            {/* Live Summary */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-800 mb-2">Budget Summary</p>
              <div className="flex gap-6 flex-wrap">
                <div>
                  <span className="text-slate-600">Direct Impact (Materials + Labor):</span>{' '}
                  <span className="font-semibold">{formatGHC(budgetTotals.direct)}</span>
                </div>
                <div>
                  <span className="text-slate-600">Logistics:</span>{' '}
                  <span className="font-semibold">{formatGHC(budgetTotals.logistics)}</span>
                </div>
                <div>
                  <span className="text-slate-600">Overhead (Admin):</span>{' '}
                  <span className={`font-semibold ${adminPercent > 15 ? 'text-red-600' : ''}`}>
                    {formatGHC(budgetTotals.admin)} ({adminPercent.toFixed(1)}%)
                  </span>
                  {adminPercent > 15 && (
                    <span className="ml-1 text-red-600 text-xs">⚠ Exceeds 15%</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-600">Total:</span>{' '}
                  <span className="font-bold">{formatGHC(budgetTotals.total)}</span>
                </div>
              </div>
              {pieData.length > 0 && (
                <div className="mt-4 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label />
                      <Tooltip formatter={(v) => formatGHC(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!hasMaterialOrTransport && (
                <p className="text-amber-600 text-sm mt-2">Add at least one material or transportation item.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Proof of Capability */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Proof of Capability</h3>
            <p className="text-sm text-slate-600">
              Upload similar past projects or community endorsement letters.
            </p>
            <input type="file" accept="image/*,.pdf" onChange={handleProofUpload} className="block text-sm" />
            {formData.proof_documents?.length > 0 && (
              <ul className="text-sm text-slate-600">
                {formData.proof_documents.map((p, i) => (
                  <li key={i}>✓ Document {i + 1}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Review & Submit</h3>
            <div className="prose prose-sm max-w-none">
              <p><strong>Title:</strong> {formData.title}</p>
              <p><strong>Description:</strong> {formData.description?.slice(0, 200)}...</p>
              <p><strong>Location:</strong> {formData.location || '—'}</p>
              <p><strong>Total Budget:</strong> {formatGHC(budgetTotals.total)}</p>
              <p><strong>Budget Items:</strong> {formData.budgets.filter((b) => b.item_name).length}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
          <div>
            {step > 1 && (
              <Button variant="outline" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <Button
                icon={ArrowRight}
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && (!formData.title || !formData.description)) ||
                  (step === 2 && (!hasMaterialOrTransport || adminPercent > 15 || budgetTotals.total <= 0))
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Project'}
              </Button>
            )}
          </div>
        </div>
        {onCancel && (
          <div className="mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectWizard;
