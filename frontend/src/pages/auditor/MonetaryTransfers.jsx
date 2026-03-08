// ## Monetary Transfers View
// ## Financial Auditor's interface for viewing all payment transactions from DB
import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import { financialApi } from '../../services/api';
import { formatGHC } from '../../utils/currency';
import { downloadCsv } from '../../utils/exportCsv';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const MonetaryTransfers = () => {
  const [financials, setFinancials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // ## Fetch financials from API
  useEffect(() => {
    const fetchFinancials = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await financialApi.getAll();
        setFinancials(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching financials:', err);
        setError('Failed to load payment transactions.');
        setFinancials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancials();
  }, []);

  // ## Map Financial status to display status
  const mapStatus = (status) => {
    if (status === 'Completed') return 'success';
    if (status === 'Pending') return 'pending';
    if (status === 'Failed' || status === 'Refunded') return 'failed';
    return 'unknown';
  };

  // ## Map transaction_type to payment type for filters
  const mapPaymentType = (transactionType) => {
    if (transactionType === 'Project Funding') return 'project';
    if (transactionType === 'General Support') return 'general';
    if (transactionType === 'Donation') return 'general';
    return 'other';
  };

  // ## Compute stats from financials
  const stats = useMemo(() => {
    const completed = financials.filter((f) => f.status === 'Completed');
    return {
      total: financials.length,
      successful: completed.length,
      failed: financials.filter((f) => f.status === 'Failed' || f.status === 'Refunded').length,
      pending: financials.filter((f) => f.status === 'Pending').length,
      totalAmount: completed.reduce((sum, f) => sum + (f.amount || 0), 0),
      totalGeneral:
        completed
          .filter((f) => ['Donation', 'General Support'].includes(f.transaction_type))
          .reduce((sum, f) => sum + (f.amount || 0), 0),
      totalProject:
        completed
          .filter((f) => f.transaction_type === 'Project Funding')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
      averageAmount: completed.length > 0
        ? completed.reduce((sum, f) => sum + (f.amount || 0), 0) / completed.length
        : 0,
    };
  }, [financials]);

  // ## Filter financials
  const filteredPayments = useMemo(() => {
    let filtered = [...financials];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          (f.payment_reference && f.payment_reference.toLowerCase().includes(q)) ||
          (f.user?.name && f.user.name.toLowerCase().includes(q)) ||
          (f.user?.email && f.user.email.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      const target = statusFilter === 'success' ? 'Completed' : statusFilter === 'pending' ? 'Pending' : ['Failed', 'Refunded'];
      filtered =
        statusFilter === 'failed'
          ? filtered.filter((f) => ['Failed', 'Refunded'].includes(f.status))
          : filtered.filter((f) => f.status === target);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((f) => mapPaymentType(f.transaction_type) === typeFilter);
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter((f) => (f.payment_method || '').toLowerCase() === paymentMethodFilter);
    }

    if (dateRange.start) {
      const start = new Date(dateRange.start);
      filtered = filtered.filter((f) => new Date(f.transaction_date || f.created_at) >= start);
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((f) => new Date(f.transaction_date || f.created_at) <= end);
    }

    return filtered.sort(
      (a, b) => new Date(b.transaction_date || b.created_at) - new Date(a.transaction_date || a.created_at)
    );
  }, [financials, searchQuery, statusFilter, typeFilter, paymentMethodFilter, dateRange]);

  const getStatusConfig = (status) => {
    const s = mapStatus(status);
    if (s === 'success')
      return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Success' };
    if (s === 'failed')
      return { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Failed' };
    if (s === 'pending')
      return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' };
    return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock, label: status || 'Unknown' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = () => {
    const headers = ['Reference', 'Supplier', 'Type', 'Amount (GHS)', 'Payment Method', 'Date', 'Status'];
    const rows = [
      headers,
      ...filteredPayments.map((f) => [
        f.payment_reference || '—',
        f.user?.name || '—',
        f.transaction_type || '—',
        f.amount ?? '',
        f.payment_method || '—',
        formatDate(f.transaction_date || f.created_at),
        f.status || '—',
      ]),
    ];
    downloadCsv(`monetary-transfers-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading payment transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Monetary Transfers</h2>
          <p className="text-slate-600 mt-1">View and audit all payment transactions</p>
        </div>
        <Button icon={Download} onClick={handleExport} variant="outline">
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Transactions</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Successful</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.successful}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Amount</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatGHC(stats.totalAmount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Average Amount</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatGHC(stats.averageAmount)}</p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">General Support / Donations</p>
          <p className="text-xl font-bold text-slate-800">{formatGHC(stats.totalGeneral)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {financials.filter((f) => ['Donation', 'General Support'].includes(f.transaction_type) && f.status === 'Completed').length} transactions
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">Project Funding</p>
          <p className="text-xl font-bold text-emerald-600">{formatGHC(stats.totalProject)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {financials.filter((f) => f.transaction_type === 'Project Funding' && f.status === 'Completed').length} transactions
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">Failed / Pending</p>
          <p className="text-xl font-bold text-red-600">{stats.failed + stats.pending}</p>
          <p className="text-xs text-slate-500 mt-1">transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reference, supplier, description..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="general">General Support</option>
              <option value="project">Project Funding</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Methods</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paystack">Paystack</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No payment transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((f) => {
                  const statusConfig = getStatusConfig(f.status);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {f.payment_reference || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{f.user?.name || '—'}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <User size={12} />
                            {f.user?.email || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            f.transaction_type === 'Project Funding' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {f.transaction_type || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">{formatGHC(f.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{f.payment_method || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-700 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(f.transaction_date || f.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPayments.length > 0 && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-800">{filteredPayments.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{financials.length}</span> transactions
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Filtered Total: {formatGHC(filteredPayments.filter((f) => f.status === 'Completed').reduce((sum, f) => sum + (f.amount || 0), 0))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonetaryTransfers;
