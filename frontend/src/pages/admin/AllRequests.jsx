// ## All Requests - Admin view of all requests with approve for pending
import React, { useState, useEffect, useCallback } from 'react';
import { Package, Loader2, RefreshCw, CheckCircle, Search, User, MapPin, Clock, FileText, ExternalLink, Download } from 'lucide-react';
import { requestApi, filesApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const AllRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [documentsModalRequest, setDocumentsModalRequest] = useState(null);
  const [downloadingPath, setDownloadingPath] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await requestApi.getAll();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setRequests([]);
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load requests.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useAutoRefresh(loadRequests, ['request'], []);

  const handleApprove = async (requestId) => {
    try {
      setApprovingId(requestId);
      setMessage(null);
      await requestApi.approve(requestId);
      setMessage({ type: 'success', text: 'Request approved successfully.' });
      await loadRequests();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to approve request.',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleViewDocuments = (req) => setDocumentsModalRequest(req);
  const handleCloseDocumentsModal = () => {
    setDocumentsModalRequest(null);
    setDownloadingPath(null);
  };

  const handleDownloadDoc = async (path, openInNewTab = false) => {
    try {
      setDownloadingPath(path);
      await filesApi.downloadOrView(path, openInNewTab);
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to open document.' });
    } finally {
      setDownloadingPath(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-emerald-600" size={28} />
            All Requests
          </h2>
          <p className="text-slate-600 mt-1">
            View and approve requests from requestors. Pending requests require admin approval before donors can fund them.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadRequests} disabled={loading}>
          Refresh
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">
            {requests.filter((r) => r.status === 'approved').length}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Completed</p>
          <p className="text-2xl font-bold text-slate-600">
            {requests.filter((r) => r.status === 'completed').length}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total</p>
          <p className="text-2xl font-bold text-slate-800">{requests.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or requestor..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="claimed">Claimed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Request</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Requestor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No requests found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{req.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{req.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-sm">{req.user?.name || 'Unknown'}</span>
                      </div>
                      {req.user?.email && (
                        <p className="text-xs text-slate-500 mt-0.5">{req.user.email}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-sm">{req.region || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          req.status === 'pending'
                            ? 'Pending Approval'
                            : req.status.charAt(0).toUpperCase() + req.status.slice(1)
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.urgency_level || 'Medium'} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={14} />
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={FileText}
                          onClick={() => handleViewDocuments(req)}
                        >
                          Documents ({(req.supporting_documents?.length ?? 0)})
                        </Button>
                        {req.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={approvingId === req.id ? Loader2 : CheckCircle}
                            onClick={() => handleApprove(req.id)}
                            disabled={approvingId !== null}
                          >
                            {approvingId === req.id ? 'Approving...' : 'Approve'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Documents Modal */}
      {documentsModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseDocumentsModal}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                Supporting Documents — {documentsModalRequest.title}
              </h3>
              <button
                onClick={handleCloseDocumentsModal}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {(!documentsModalRequest.supporting_documents || documentsModalRequest.supporting_documents.length === 0) ? (
                <p className="text-slate-500 text-center py-6">No documents uploaded</p>
              ) : (
                <ul className="space-y-2">
                  {documentsModalRequest.supporting_documents.map((path, i) => {
                    const name = path.split('/').pop() || `Document ${i + 1}`;
                    const loading = downloadingPath === path;
                    return (
                      <li
                        key={path}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <span className="text-sm text-slate-700 truncate flex-1 mr-2">{name}</span>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={loading ? Loader2 : ExternalLink}
                            onClick={() => handleDownloadDoc(path, true)}
                            disabled={loading}
                          >
                            {loading ? 'Opening...' : 'View'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Download}
                            onClick={() => handleDownloadDoc(path, false)}
                            disabled={loading}
                          >
                            Download
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRequests;
