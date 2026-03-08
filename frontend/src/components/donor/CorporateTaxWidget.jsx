// ## Corporate Tax Widget
// ## Displays assessable income, 10% tax deductible limit, YTD donations, remaining cap
// ## For donor_institution (Corporate) donors only
import React, { useState, useEffect } from 'react';
import { Calculator, Edit2, Save, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { donationApi } from '../../services/api';

const formatGHC = (n) => `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CorporateTaxWidget = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationApi.getCorporateTaxStats();
      setStats(data);
      setIncomeValue(String(data.assessable_annual_income || ''));
    } catch (err) {
      if (err.response?.status === 403) {
        setStats(null);
        setError(null);
      } else {
        setError(err.response?.data?.message || 'Failed to load tax stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveIncome = async () => {
    const val = parseFloat(incomeValue);
    if (isNaN(val) || val < 0) {
      setError('Enter a valid amount');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await donationApi.updateTaxProfile(val);
      await fetchStats();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (!stats && !error) return null;

  if (error && !stats) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">{error}</p>
      </div>
    );
  }

  const limit = stats.max_deductible_limit || 0;
  const ytd = stats.donations_ytd || 0;
  const remaining = stats.remaining_deductible_cap ?? 0;
  const isOver = stats.is_over_limit || false;
  const progress = limit > 0 ? Math.min(100, (ytd / limit) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calculator size={20} />
          Tax Deductible Limit (GRA 10%)
        </h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <Edit2 size={14} />
            Edit Income
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveIncome}
              disabled={saving}
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setIncomeValue(String(stats.assessable_annual_income || '')); }}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Editable Assessable Income */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-600">Total Assessable Income (GHS)</label>
        {editing ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={incomeValue}
            onChange={(e) => setIncomeValue(e.target.value)}
            className="mt-1 w-full max-w-[200px] p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="Enter amount"
          />
        ) : (
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {formatGHC(stats.assessable_annual_income || 0)}
          </p>
        )}
      </div>

      {/* Tax Deductible Limit (10%) */}
      <div className="mb-4">
        <p className="text-sm text-slate-600">Tax Deductible Limit (10%)</p>
        <p className="text-xl font-bold text-emerald-700">{formatGHC(limit)}</p>
      </div>

      {/* Total Donations YTD */}
      <div className="mb-4">
        <p className="text-sm text-slate-600">Total Donations YTD</p>
        <p className="text-lg font-semibold text-slate-900">{formatGHC(ytd)}</p>
      </div>

      {/* Remaining Deductible Cap */}
      <div className="mb-4">
        <p className="text-sm text-slate-600">Remaining Deductible Cap</p>
        <p className={`text-lg font-semibold ${remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {formatGHC(remaining)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Usage</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isOver ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          {isOver ? (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} />
              Limit exceeded
            </span>
          ) : progress >= 80 ? (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle size={14} />
              Approaching limit
            </span>
          ) : (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle size={14} />
              Within limit
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CorporateTaxWidget;
