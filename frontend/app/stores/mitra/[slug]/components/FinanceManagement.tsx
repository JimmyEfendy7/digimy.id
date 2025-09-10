"use client";

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CreditCard,
  Download,
  Plus,
  Loader2,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend
} from 'recharts';
import { 
  getStoreFinance, 
  getTransactionHistory, 
  createWithdrawal, 
  getRevenueAnalytics,
  fetchStoreDetails,
  getImageUrl
} from '../../../../lib/api';

interface FinancialSummary {
  total_revenue: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  total_refunds: number;
  total_transactions: number;
  pending_transactions: number;
}

interface Transaction {
  id: number;
  transaction_code: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  item_name: string;
  subtotal: number;
  quantity: number;
}

interface Withdrawal {
  id: number;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  notes: string;
  created_at: string;
  processed_at: string;
}

interface RevenueAnalytics {
  period: string;
  revenue: number;
  transactions: number;
  items_sold: number;
}

interface TopProduct {
  product_name: string;
  poster_url: string;
  total_sold: number;
  total_revenue: number;
}

interface FinanceManagementProps {
  storeId: number;
  currentBalance: number;
}

const FinanceManagement: React.FC<FinanceManagementProps> = ({ storeId, currentBalance }) => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [analytics, setAnalytics] = useState<RevenueAnalytics[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [balance, setBalance] = useState<number>(currentBalance || 0);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [rangeError, setRangeError] = useState<string>('');

  const todayStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const nextDayStr = (dStr: string) => {
    try {
      const d = new Date(dStr);
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      if (dateFrom >= dateTo) {
        setRangeError('Tanggal before harus lebih kecil dari tanggal after.');
      } else {
        setRangeError('');
      }
    } else {
      setRangeError('');
    }
  }, [dateFrom, dateTo]);
  const [storeInfo, setStoreInfo] = useState<{ name?: string; email?: string; address?: string; logo_url?: string } | null>(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const response = await getStoreFinance(storeId);
      if (response.success) {
        const s = response.data.summary;
        const normalizedSummary = s ? {
          total_revenue: Number(s.total_revenue) || 0,
          today_revenue: Number(s.today_revenue) || 0,
          week_revenue: Number(s.week_revenue) || 0,
          month_revenue: Number(s.month_revenue) || 0,
          total_refunds: Number(s.total_refunds) || 0,
          total_transactions: Number(s.total_transactions) || 0,
          pending_transactions: Number(s.pending_transactions) || 0,
        } : null;
        setSummary(normalizedSummary);
        setWithdrawals(response.data.withdrawals);
        // MySQL DECIMAL may come as string; coerce to number
        const apiBalance = Number(response.data.balance);
        if (!Number.isNaN(apiBalance)) setBalance(apiBalance);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build 12-month dataset for current calendar year
  const monthlyRevenueData = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const year = now.getFullYear();
    const map: Record<string, { revenue: number; transactions: number; items_sold: number }> = {};
    for (const a of analytics) {
      let y = year;
      let mIndex = -1;
      // Try to parse formats like '2025-08', '2025/08', 'Aug 2025', '2025 Aug'
      const p = String(a.period || '').trim();
      const ymMatch = p.match(/^(\d{4})[-\/]?(\d{1,2})$/);
      if (ymMatch) {
        y = parseInt(ymMatch[1], 10);
        mIndex = Math.max(0, Math.min(11, parseInt(ymMatch[2], 10) - 1));
      } else {
        const dt = new Date(p);
        if (!isNaN(dt.getTime())) {
          y = dt.getFullYear();
          mIndex = dt.getMonth();
        } else {
          // Try month name presence
          const idx = months.findIndex((mm) => p.toLowerCase().includes(mm.toLowerCase()));
          if (idx >= 0) mIndex = idx;
        }
      }
      if (y === year && mIndex >= 0) {
        const key = `${year}-${mIndex}`;
        map[key] = {
          revenue: Number(a.revenue) || 0,
          transactions: Number(a.transactions) || 0,
          items_sold: Number(a.items_sold) || 0,
        };
      }
    }
    return months.map((label, idx) => {
      const key = `${year}-${idx}`;
      const v = map[key] || { revenue: 0, transactions: 0, items_sold: 0 };
      return { month: label, revenue: v.revenue, transactions: v.transactions, items_sold: v.items_sold };
    });
  })();

  // Initial loads
  useEffect(() => {
    fetchFinanceData();
    fetchTransactionHistory();
    fetchStoreInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Ensure transactions are current when tab becomes active
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactionHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchStoreInfo = async () => {
    try {
      const data = await fetchStoreDetails(String(storeId));
      if (data) {
        // Normalize common fields
        const normalized = {
          name: data.store_name || data.name || data.nama_toko || '',
          email: data.email || data.contact_email || '',
          address: data.address || data.alamat || '',
          logo_url: data.logo_url || data.logo || data.logo_path || data.avatar_url || ''
        } as { name?: string; email?: string; address?: string; logo_url?: string };
        setStoreInfo(normalized);
      }
    } catch (e) {
      console.error('Failed to fetch store info:', e);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await getTransactionHistory(storeId, 1, 20, 'all', dateFrom, dateTo);
      if (response.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  };

  const handleApplyDateFilter = () => {
    fetchTransactionHistory();
  };

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    fetchTransactionHistory();
  };

  const handleDownloadReport = () => {
    // Generate a printable report window (users can save as PDF)
    const title = 'Laporan Riwayat Transaksi';
    const periodLine = (dateFrom || dateTo) ? `Periode: ${dateFrom || '-'} s/d ${dateTo || '-'}` : 'Periode: Semua';
    const now = new Date();
    const generatedAt = now.toLocaleString('id-ID');

    let logo = storeInfo?.logo_url ? getImageUrl(storeInfo.logo_url, 'store') : '';
    // If getImageUrl returns a relative path because BACKEND_URL is empty, prefix with backend origin or API origin
    const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (logo && logo.startsWith('/')) {
      const origin = backendOrigin || window.location.origin;
      logo = `${origin}${logo}`;
    }
    // Attempt to avoid mixed-content in HTTPS by upgrading http->https for same host
    try {
      const pageIsHttps = window.location.protocol === 'https:';
      if (pageIsHttps && logo.startsWith('http://')) {
        const url = new URL(logo);
        logo = `https://${url.host}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {}
    const storeName = storeInfo?.name || 'Toko/Mitra';
    const storeEmail = storeInfo?.email || '';
    const storeAddress = storeInfo?.address || '';

    const currency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    const rows = transactions.map(t => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">#${t.transaction_code}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">
          <div style="font-weight:600;color:#111827">${t.customer_name || '-'}</div>
          <div style="color:#6b7280;font-size:12px">${t.customer_phone || '-'}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">
          <div>${t.item_name}</div>
          <div style="color:#6b7280;font-size:12px">Qty: ${t.quantity}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${currency(t.subtotal)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${t.payment_status}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${new Date(t.created_at).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title></title>
        <style>
          /* Try to suppress browser print headers/footers by removing page margins */
          @page { margin: 0; }
          body{font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"; color:#111827}
          /* Add internal margins instead of page margins */
          .container{ padding: 6mm 12mm 14mm 12mm; }
          .kop { display:flex; align-items:center; gap:16px; padding-bottom:12px; border-bottom:2px solid #11182710; }
          .kop .logo { width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid #e5e7eb; display:block; }
          .kop .meta { line-height:1.3; }
          .kop .name { font-size:18px; font-weight:700; color:#111827; }
          .kop .sub { color:#374151; font-size:12px; }
          .header { display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px; }
          .title { font-size:16px; font-weight:700; }
          .muted { color:#6b7280; font-size:12px; }
          table{border-collapse:collapse;width:100%; margin-top:12px}
          th{background:#f9fafb;text-align:left}
          th,td{font-size:12px}
          th{padding:10px;border-bottom:1px solid #e5e7eb}
        </style>
      </head>
      <body>
        <div class="container">
        <div class="kop">
          ${logo ? `<img src="${logo}" class="logo" />` : `<div class="logo" style="display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#6b7280;font-weight:700">${(storeName||'M').slice(0,1)}</div>`}
          <div class="meta">
            <div class="name">${storeName}</div>
            ${storeAddress ? `<div class="sub">${storeAddress}</div>` : ''}
            ${storeEmail ? `<div class="sub">${storeEmail}</div>` : ''}
          </div>
        </div>
        <div class="header">
          <div>
            <div class="title">${title}</div>
            <div class="muted">${periodLine}</div>
          </div>
          <div class="muted">Dibuat: ${generatedAt}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Transaksi</th>
              <th>Pelanggan</th>
              <th>Produk</th>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        </div>
        <script>
          function imagesReady() {
            const imgs = Array.from(document.images || []);
            if (imgs.length === 0) return Promise.resolve();
            return Promise.all(imgs.map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise(res => { img.onload = img.onerror = () => res(null); });
            }));
          }
          window.onload = async () => {
            try { await imagesReady(); } catch (e) {}
            window.print();
            setTimeout(() => window.close(), 500);
          }
        <\/script>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await getRevenueAnalytics(storeId, 'monthly');
      if (response.success) {
        setAnalytics(response.data.analytics);
        setTopProducts(response.data.top_products);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    fetchTransactionHistory();
    fetchAnalytics();
  }, [storeId]);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWithdrawal(true);
    
    try {
      const response = await createWithdrawal(storeId, {
        amount: parseFloat(withdrawalForm.amount),
        bank_name: withdrawalForm.bank_name,
        account_number: withdrawalForm.account_number,
        account_name: withdrawalForm.account_name
      });

      if (response.success) {
        alert('Permintaan penarikan berhasil dibuat!');
        setShowWithdrawalForm(false);
        setWithdrawalForm({
          amount: '',
          bank_name: '',
          account_number: '',
          account_name: ''
        });
        // Refresh data
        fetchFinanceData();
      } else {
        alert(response.message || 'Gagal membuat permintaan penarikan');
      }
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      alert('Terjadi kesalahan saat membuat permintaan penarikan');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="ml-2 text-gray-600">Memuat data keuangan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 mb-1">Saldo Tersedia</p>
            <h3 className="text-3xl font-bold mb-2">{formatCurrency(balance)}</h3>
            {summary && (
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-indigo-200">Hari Ini</p>
                  <p className="font-semibold">{formatCurrency(summary.today_revenue)}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Minggu Ini</p>
                  <p className="font-semibold">{formatCurrency(summary.week_revenue)}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Bulan Ini</p>
                  <p className="font-semibold">{formatCurrency(summary.month_revenue)}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Total Pendapatan</p>
                  <p className="font-semibold">{formatCurrency(summary.total_revenue)}</p>
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <button 
              onClick={() => setShowWithdrawalForm(true)}
              className="inline-flex items-center px-5 py-2.5 bg-white/90 hover:bg-white text-indigo-700 rounded-xl text-sm font-semibold shadow-sm transition-colors"
              aria-label="Tarik saldo"
            >
              <Download className="h-4 w-4 mr-2" />
              Tarik Saldo
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { key: 'transactions', label: 'Transaksi', icon: CreditCard },
              { key: 'withdrawals', label: 'Penarikan', icon: Download },
              { key: 'analytics', label: 'Analitik', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab removed per request */}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <input
                        type="date"
                        value={dateFrom}
                        max={todayStr}
                        onChange={(e) => {
                          let v = e.target.value;
                          if (v && v > todayStr) v = todayStr; // lock future
                          setDateFrom(v);
                          // If after becomes invalid, try adjust to next day if possible
                          if (dateTo && v && dateTo <= v) {
                            const nd = nextDayStr(v);
                            if (nd && nd <= todayStr) {
                              setDateTo(nd);
                            } else {
                              setDateTo('');
                            }
                          }
                        }}
                        className="text-sm outline-none text-blue-700 placeholder-blue-400"
                        aria-label="Tanggal before"
                        title="Before"
                      />
                    </div>
                    <span className="text-sm text-gray-500">s/d</span>
                    <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white focus-within:ring-1 focus-within:ring-green-500 focus-within:border-green-500">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom ? nextDayStr(dateFrom) : undefined}
                        max={todayStr}
                        onChange={(e) => {
                          let v = e.target.value;
                          if (v && v > todayStr) v = todayStr; // lock future
                          // enforce strictly greater than dateFrom when dateFrom exists
                          if (dateFrom && v && v <= dateFrom) {
                            // ignore or adjust; we'll set error via effect and still set value
                          }
                          setDateTo(v);
                        }}
                        className="text-sm outline-none text-green-700 placeholder-green-400"
                        aria-label="Tanggal after"
                        title="After"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyDateFilter}
                      disabled={Boolean(rangeError)}
                      aria-disabled={Boolean(rangeError)}
                      className={`px-3 py-2 text-sm rounded-md ${rangeError ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >Terapkan</button>
                    <button onClick={handleClearDateFilter} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Hapus</button>
                    <button onClick={handleDownloadReport} className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                  {rangeError && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {rangeError}
                    </div>
                  )}
                </div>
              </div>
              
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Belum ada transaksi</h3>
                  <p className="text-gray-500">Riwayat transaksi akan muncul di sini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaksi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pelanggan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jumlah
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{transaction.transaction_code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.payment_method}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="text-sm text-gray-900">{transaction.customer_name}</div>
                            <div className="text-xs text-gray-500">{transaction.customer_phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{transaction.item_name}</div>
                            <div className="text-sm text-gray-500">Qty: {transaction.quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(transaction.subtotal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              transaction.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : transaction.payment_status === 'refunded'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}>
                              {transaction.payment_status === 'paid' ? 'Dibayar' : transaction.payment_status === 'refunded' ? 'Refund' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Riwayat Penarikan</h3>
                <button
                  onClick={() => setShowWithdrawalForm(true)}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tarik Saldo
                </button>
              </div>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Belum ada penarikan</h3>
                  <p className="text-gray-500">Riwayat penarikan saldo akan muncul di sini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Download className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {formatCurrency(withdrawal.amount)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {withdrawal.bank_name} - {withdrawal.account_number}
                            </p>
                            <p className="text-sm text-gray-500">
                              a.n. {withdrawal.account_name}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(withdrawal.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(withdrawal.status)}`}>
                            {getStatusText(withdrawal.status)}
                          </span>
                          {withdrawal.notes && (
                            <p className="text-xs text-gray-500 mt-1 max-w-xs">
                              {withdrawal.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Analitik Pendapatan</h3>
              
              {/* Revenue Chart - 12 months of current calendar year */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">Pendapatan Bulanan (Tahun Berjalan)</h4>
                    <p className="text-xs text-gray-500">Grafik pendapatan 12 bulan dengan jumlah transaksi sebagai garis bantu</p>
                  </div>
                </div>
                <div className="w-full h-80">
                  <ResponsiveContainer>
                    <ComposedChart data={monthlyRevenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6B7280" />
                      <YAxis yAxisId="left" tickFormatter={(v: number) => (v >= 1000000 ? `${Math.round(v/1000000)}jt` : `${Math.round(v/1000)}rb`)} allowDecimals={false} stroke="#6B7280" />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} stroke="#6B7280" />
                      <RechartsTooltip formatter={(val: any, name: string) => {
                        if (name === 'Pendapatan') return [formatCurrency(Number(val)), 'Pendapatan'];
                        if (name === 'Transaksi') return [String(val), 'Transaksi'];
                        return [val, name];
                      }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <RechartsLegend />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" name="Pendapatan" stroke="#6366F1" fill="url(#revFill)" strokeWidth={2} animationDuration={800} />
                      <Bar yAxisId="right" dataKey="transactions" name="Transaksi" barSize={24} fill="#10B981" radius={[4,4,0,0]} animationDuration={700} />
                      <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transaksi (garis)" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} hide />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products */}
              {topProducts.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Produk Terlaris (30 Hari Terakhir)</h4>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="text-sm text-gray-900">{product.product_name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">{product.total_sold} terjual</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.total_revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Form Modal */}
      {showWithdrawalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Tarik Saldo</h3>
                  <p className="mt-1 text-sm text-gray-600">Ajukan penarikan ke rekening bank Anda</p>
                </div>
                <button
                  onClick={() => setShowWithdrawalForm(false)}
                  className="rounded-full p-1.5 text-gray-500 hover:bg-white hover:text-gray-700"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Jumlah Penarikan
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="10000"
                    max={balance}
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-lg border-0 ring-1 ring-inset ring-gray-200 pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Minimal 10.000"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Saldo tersedia: {formatCurrency(balance)}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Nama Bank</label>
                  <input
                    type="text"
                    value={withdrawalForm.bank_name}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, bank_name: e.target.value }))}
                    className="w-full rounded-lg border-0 ring-1 ring-inset ring-gray-200 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
                    placeholder="BCA, Mandiri, BRI"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Nomor Rekening</label>
                  <input
                    type="text"
                    value={withdrawalForm.account_number}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, account_number: e.target.value }))}
                    className="w-full rounded-lg border-0 ring-1 ring-inset ring-gray-200 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nomor rekening bank"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={withdrawalForm.account_name}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, account_name: e.target.value }))}
                  className="w-full rounded-lg border-0 ring-1 ring-inset ring-gray-200 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nama sesuai rekening"
                  required
                />
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">Informasi Penting</p>
                    <ul className="mt-1 space-y-1 text-yellow-800">
                      <li>• Penarikan diproses 1–3 hari kerja</li>
                      <li>• Pastikan data rekening sudah benar</li>
                      <li>• Minimum penarikan Rp 10.000</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalForm(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdrawal}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingWithdrawal ? 'Memproses...' : 'Ajukan Penarikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceManagement;
