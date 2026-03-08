// ## Organization Setup - Create/Update NGO profile
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { organizationApi } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const OrganizationSetup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    registration_number: '',
    tin: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await organizationApi.get();
        if (res?.organization) {
          setForm({
            name: res.organization.name || '',
            registration_number: res.organization.registration_number || '',
            tin: res.organization.tin || '',
          });
          setIsUpdate(true);
        }
      } catch {
        // No org yet
      } finally {
        setFetching(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isUpdate) {
        await organizationApi.update(form);
      } else {
        await organizationApi.create(form);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <ShieldCheck size={24} />
        {isUpdate ? 'Organization Profile' : 'Create Organization Profile'}
      </h2>
      <p className="text-slate-600 mb-6">
        {isUpdate
          ? 'Update your NGO profile. Upload RG to unlock Tier 2 for projects over GH₵5,000.'
          : 'Set up your NGO profile to publish fundable projects. Upload your Registration (RG) later to unlock Tier 2 for projects over GH₵5,000.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full p-2 border border-slate-200 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number (RG)</label>
          <input
            type="text"
            value={form.registration_number}
            onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">TIN</label>
          <input
            type="text"
            value={form.tin}
            onChange={(e) => setForm((p) => ({ ...p, tin: e.target.value }))}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isUpdate ? 'Update' : 'Create Organization'}
        </Button>
      </form>
    </div>
  );
};

export default OrganizationSetup;
