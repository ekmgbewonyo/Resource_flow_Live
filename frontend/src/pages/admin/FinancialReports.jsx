// ## Financial Reports Component
// ## Comprehensive financial reporting from donations + warehouses API
import React, { useMemo, useState, useEffect } from 'react';
import { Package, Download, Filter, Loader2 } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { donationApi, warehouseApi } from '../../services/api';
import { downloadCsv } from '../../utils/exportCsv';
import { ResourceValueChart } from '../../components/charts/ResourceValueChart';
import { Button } from '../../components/ui/Button';

// Derive category from donation item name
const deriveCategory = (item) => {
  if (!item) return 'Other';
  const lower = String(item).toLowerCase();
  if (lower.includes('rice') || lower.includes('maize') || lower.includes('food') || lower.includes('oil') || lower.includes('grain')) return 'Food';
  if (lower.includes('medicine') || lower.includes('medical') || lower.includes('paracetamol') || lower.includes('antibiotic')) return 'Medicine';
  if (lower.includes('equipment') || lower.includes('pump') || lower.includes('solar')) return 'Equipment';
  return 'Other';
};

const FinancialReports = () => {
  const [donations, setDonations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // ## Fetch donations and warehouses from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [donationsData, warehousesData] = await Promise.all([
          donationApi.getAll({ receipt_confirmed: true }),
          warehouseApi.getAll(),
        ]);
        setDonations(Array.isArray(donationsData) ? donationsData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError('Failed to load financial data.');
        setDonations([]);
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ## Goods donations only (inventory value)
  const inventory = useMemo(
    () => donations.filter((d) => d.type === 'Goods'),
    [donations]
  );

  // ## Calculate financial metrics from donations
  const financialMetrics = useMemo(() => {
    const totalLockedValue = inventory
      .filter((d) => d.price_status === 'Locked' && (d.audited_price || d.value))
      .reduce((sum, d) => sum + ((d.audited_price || d.value || 0) * (d.quantity || 0)), 0);

    const totalEstimatedValue = inventory.reduce((sum, d) => {
      const price = d.market_price || d.audited_price || d.value;
      return sum + (price ? price * (d.quantity || 0) : 0);
    }, 0);

    const valueByCategory = inventory.reduce((acc, d) => {
      const category = deriveCategory(d.item);
      const value = d.price_status === 'Locked' && (d.audited_price || d.value)
        ? (d.audited_price || d.value) * (d.quantity || 0)
        : (d.market_price || d.audited_price || d.value || 0) * (d.quantity || 0);

      if (!acc[category]) acc[category] = { locked: 0, estimated: 0, total: 0 };
      if (d.price_status === 'Locked' && (d.audited_price || d.value)) {
        acc[category].locked += (d.audited_price || d.value) * (d.quantity || 0);
      } else if (d.market_price || d.audited_price || d.value) {
        acc[category].estimated += (d.market_price || d.audited_price || d.value) * (d.quantity || 0);
      }
      acc[category].total += value;
      return acc;
    }, {});

    const valueByStatus = {
      Locked: inventory
        .filter((d) => d.price_status === 'Locked' && (d.audited_price || d.value))
        .reduce((sum, d) => sum + ((d.audited_price || d.value) * (d.quantity || 0)), 0),
      'Pending Review': inventory
        .filter((d) => d.price_status === 'Pending Review' && (d.market_price || d.audited_price || d.value))
        .reduce((sum, d) => sum + ((d.market_price || d.audited_price || d.value || 0) * (d.quantity || 0)), 0),
      Estimated: inventory
        .filter((d) => d.price_status === 'Estimated' && (d.market_price || d.audited_price || d.value))
        .reduce((sum, d) => sum + ((d.market_price || d.audited_price || d.value || 0) * (d.quantity || 0)), 0),
    };

    const valueByWarehouse = warehouses.map((w) => {
      const warehouseItems = inventory.filter(
        (d) => d.warehouse?.name === w.name || d.colocation_facility === w.name
      );
      const lockedValue = warehouseItems
        .filter((d) => d.price_status === 'Locked' && (d.audited_price || d.value))
        .reduce((sum, d) => sum + ((d.audited_price || d.value) * (d.quantity || 0)), 0);
      const estimatedValue = warehouseItems
        .filter((d) => d.price_status !== 'Locked' && (d.market_price || d.audited_price || d.value))
        .reduce((sum, d) => sum + ((d.market_price || d.audited_price || d.value || 0) * (d.quantity || 0)), 0);
      return {
        name: w.name,
        region: w.region || '',
        lockedValue,
        estimatedValue,
        totalValue: lockedValue + estimatedValue,
        itemCount: warehouseItems.length,
      };
    });

    const itemsByStatus = {
      Locked: inventory.filter((d) => d.price_status === 'Locked').length,
      'Pending Review': inventory.filter((d) => d.price_status === 'Pending Review').length,
      Estimated: inventory.filter((d) => d.price_status === 'Estimated').length,
    };

    return {
      totalLockedValue,
      totalEstimatedValue,
      totalValue: totalLockedValue + totalEstimatedValue,
      valueByCategory,
      valueByStatus,
      valueByWarehouse,
      itemsByStatus,
    };
  }, [inventory, warehouses]);

  // ## Prepare chart data
  const chartData = useMemo(() => {
    return Object.entries(financialMetrics.valueByCategory).map(([category, values]) => ({
      category,
      value: values.total,
      locked: values.locked,
      estimated: values.estimated,
    }));
  }, [financialMetrics.valueByCategory]);

  // ## Filter warehouse data by category
  const filteredWarehouses =
    selectedCategory === 'All'
      ? financialMetrics.valueByWarehouse
      : financialMetrics.valueByWarehouse.filter((wh) => {
          const items = inventory.filter(
            (d) =>
              (d.warehouse?.name === wh.name || d.colocation_facility === wh.name) &&
              deriveCategory(d.item) === selectedCategory
          );
          return items.length > 0;
        });

  // ## Export financial report as CSV
  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const rows = [];

    // Summary metrics
    rows.push(['Financial Report Summary', date]);
    rows.push([]);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Locked Value', formatGHC(financialMetrics.totalLockedValue)]);
    rows.push(['Total Estimated Value', formatGHC(financialMetrics.totalEstimatedValue)]);
    rows.push(['Total Asset Value', formatGHC(financialMetrics.totalValue)]);
    rows.push(['Verification Rate', `${inventory.length > 0 ? safePercent((financialMetrics.itemsByStatus.Locked / inventory.length) * 100) : 0}%`]);
    rows.push([]);

    // Value by status
    rows.push(['Value by Status']);
    rows.push(['Locked', formatGHC(financialMetrics.valueByStatus.Locked)]);
    rows.push(['Pending Review', formatGHC(financialMetrics.valueByStatus['Pending Review'])]);
    rows.push(['Estimated', formatGHC(financialMetrics.valueByStatus.Estimated)]);
    rows.push([]);

    // Value by category
    rows.push(['Value by Category', 'Locked', 'Estimated', 'Total']);
    Object.entries(financialMetrics.valueByCategory).forEach(([cat, vals]) => {
      rows.push([cat, formatGHC(vals.locked), formatGHC(vals.estimated), formatGHC(vals.total)]);
    });
    rows.push([]);

    // Value by warehouse
    rows.push(['Warehouse', 'Region', 'Locked Value', 'Estimated Value', 'Total Value', 'Items']);
    filteredWarehouses
      .sort((a, b) => b.totalValue - a.totalValue)
      .forEach((wh) => {
        rows.push([wh.name, wh.region, formatGHC(wh.lockedValue), formatGHC(wh.estimatedValue), formatGHC(wh.totalValue), `${wh.itemCount} items`]);
      });

    downloadCsv(`financial-report-${date}`, rows);
  };

  // Capped percentage helper (never exceeds 100)
  const safePercent = (value) => Math.min(Math.round(value || 0), 100);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading financial data...</p>
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
    <div className="p-6 bg-white min-h-screen overflow-y-auto pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Reports</h2>
          <p className="text-slate-600 mt-1">Comprehensive financial analytics and reporting</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Categories</option>
              <option value="Food">Food</option>
              <option value="Medicine">Medicine</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Button icon={Download} onClick={handleExport}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Locked Value</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatGHC(financialMetrics.totalLockedValue)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Estimated Value</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {formatGHC(financialMetrics.totalEstimatedValue)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Asset Value</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatGHC(financialMetrics.totalValue)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Verification Rate</p>
          <p className="text-xl font-bold text-purple-600 mt-1">
            {inventory.length > 0
              ? safePercent((financialMetrics.itemsByStatus.Locked / inventory.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Value by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700 font-semibold">Locked Assets</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus.Locked)}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700 font-semibold">Pending Review</p>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus['Pending Review'])}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700 font-semibold">Estimated</p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus.Estimated)}
          </p>
        </div>
      </div>

      {/* Chart - Value by Category */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Asset Value by Category</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600">Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-slate-600">Estimated</span>
            </div>
          </div>
        </div>
        <ResourceValueChart data={chartData} />
      </div>

      {/* Value by Warehouse */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Asset Value by Warehouse</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Locked Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Estimated Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Items
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No warehouse data found</p>
                  </td>
                </tr>
              ) : (
                filteredWarehouses
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .map((warehouse) => (
                    <tr key={warehouse.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{warehouse.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{warehouse.region}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatGHC(warehouse.lockedValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-amber-600">
                          {formatGHC(warehouse.estimatedValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">
                          {formatGHC(warehouse.totalValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{warehouse.itemCount} items</span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4">Financial Health Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Verification Coverage</span>
              <span className="text-sm font-bold text-slate-900">
                {inventory.length > 0
                  ? safePercent((financialMetrics.itemsByStatus.Locked / inventory.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Locked vs Estimated Ratio</span>
              <span className="text-sm font-bold text-slate-900">
                {financialMetrics.totalEstimatedValue > 0
                  ? safePercent((financialMetrics.totalLockedValue / financialMetrics.totalEstimatedValue) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Average Item Value</span>
              <span className="text-sm font-bold text-slate-900">
                {inventory.length > 0
                  ? formatGHC(financialMetrics.totalValue / inventory.length)
                  : formatGHC(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4">Audit Alerts</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {financialMetrics.itemsByStatus['Pending Review']} items pending audit
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Estimated value: {formatGHC(financialMetrics.valueByStatus['Pending Review'])}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {financialMetrics.itemsByStatus.Estimated} items with auto-pricing
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Estimated value: {formatGHC(financialMetrics.valueByStatus.Estimated)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
