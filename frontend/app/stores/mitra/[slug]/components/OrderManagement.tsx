"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  X, 
  Package, 
  User,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  Globe,
  Code,
  Search
} from 'lucide-react';
import { getStoreOrders, updateOrderItemStatus, getOrderStats, getImageUrl, refundOrderItem } from '../../../../lib/api';

interface OrderItem {
  item_id: number;
  product_id: number;
  item_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
  item_status: string;
  product_image: string;
}

interface Order {
  transaction_id: number;
  transaction_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  transaction_status: string;
  payment_method: string;
  payment_status: string;
  source?: string; // 'embed' for embed purchases, null/undefined for main site
  embed_form_data?: any; // Custom form data from embed purchases
  order_date: string;
  items: OrderItem[];
}

interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  canceled_orders: number;
  total_revenue: number;
}

interface OrderManagementProps {
  storeId: number;
}

const OrderManagement: React.FC<OrderManagementProps> = ({ storeId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [refundingItem, setRefundingItem] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getStoreOrders(storeId, currentPage, 10, statusFilter, debouncedSearch, dateFilter);
      if (response.success) {
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.total_pages);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (itemId: number, amount: number) => {
    if (!confirm(`Yakin ingin melakukan refund item ini sebesar ${formatCurrency(amount)}?`)) return;
    setRefundingItem(itemId);
    try {
      const response = await refundOrderItem(storeId, itemId);
      if (response.success) {
        await fetchOrders();
        await fetchStats();
        alert('Refund berhasil diproses');
      } else {
        alert(response.message || 'Gagal memproses refund');
      }
    } catch (error) {
      console.error('Error refunding item:', error);
      alert('Terjadi kesalahan saat memproses refund');
    } finally {
      setRefundingItem(null);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getOrderStats(storeId);
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [storeId, currentPage, statusFilter, debouncedSearch, dateFilter]);

  // Debounce search input to prevent frequent re-fetch and potential input blur
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 when search query, status filter, or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFilter]);

  useEffect(() => {
    fetchStats();
  }, [storeId]);

  const handleStatusUpdate = async (itemId: number, newStatus: string) => {
    setUpdatingStatus(itemId);
    try {
      const response = await updateOrderItemStatus(storeId, itemId, newStatus);
      if (response.success) {
        // Refresh orders and stats
        await fetchOrders();
        await fetchStats();
      } else {
        alert('Gagal mengupdate status pesanan');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Terjadi kesalahan saat mengupdate status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancel':
      case 'canceled': // backward compatibility
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'processing':
        return 'Diproses';
      case 'completed':
        return 'Selesai';
      case 'cancel':
      case 'canceled': // backward compatibility
        return 'Dibatalkan';
      default:
        return status;
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceBadge = (source: string | undefined) => {
    if (source === 'embed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          <Code className="w-3 h-3 mr-1" />
          Embed Code
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <Globe className="w-3 h-3 mr-1" />
        Website
      </span>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="ml-2 text-gray-600">Memuat pesanan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-indigo-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-lg font-semibold text-gray-900">{stats.total_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Menunggu</p>
                <p className="text-lg font-semibold text-gray-900">{stats.pending_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Diproses</p>
                <p className="text-lg font-semibold text-gray-900">{stats.processing_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Selesai</p>
                <p className="text-lg font-semibold text-gray-900">{stats.completed_orders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <X className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Dibatalkan</p>
                <p className="text-lg font-semibold text-gray-900">{stats.canceled_orders}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Menunggu' },
              { key: 'processing', label: 'Diproses' },
              { key: 'completed', label: 'Selesai' },
              { key: 'cancel', label: 'Dibatalkan' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar and Date Filter */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  // Allow only digits
                  const onlyDigits = e.target.value.replace(/\D/g, '');
                  setSearchQuery(onlyDigits);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Prevent form submit or blur on Enter; keep focus for continued typing
                    e.preventDefault();
                  }
                }}
                ref={searchInputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                className="block w-full pl-10 pr-9 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Cari berdasarkan nomor WhatsApp..."
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => {
                    setSearchQuery('');
                    requestAnimationFrame(() => searchInputRef.current?.focus());
                  }}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Menampilkan hasil pencarian untuk: <strong>{searchQuery}</strong>
              </p>
            )}
          </div>
          
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                title="Hapus filter tanggal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-gray-200">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {statusFilter === 'all' ? 'Belum ada pesanan' : `Belum ada pesanan ${getStatusText(statusFilter).toLowerCase()}`}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Pesanan dari pelanggan akan muncul di sini setelah toko Anda terverifikasi dan produk Anda dibeli.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.transaction_id} className="p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          #{order.transaction_code}
                        </h3>
                        {getSourceBadge(order.source)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(order.order_date)}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {order.customer_name}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {order.customer_phone}
                        </div>
                      </div>

                      {/* Custom Form Data for Embed Purchases */}
                      {order.source === 'embed' && order.embed_form_data && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Code className="h-4 w-4 mr-1 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Data Form Kustom (Embed)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(order.embed_form_data).map(([key, value]) => {
                              // Skip basic customer info as it's already displayed above
                              if (['customer_name', 'customer_phone'].includes(key)) {
                                return null;
                              }
                              
                              return (
                                <div key={key} className="flex">
                                  <span className="font-medium text-gray-700 mr-2 capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-gray-600">
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      order.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {order.payment_status === 'paid' ? 'Dibayar' : 'Belum Dibayar'}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.item_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={getImageUrl(item.product_image, 'product')}
                            alt={item.item_name}
                            width={60}
                            height={60}
                            className="rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/product-placeholder.jpg";
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.item_price)} x {item.quantity}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            Subtotal: {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.item_status)}`}>
                          {getStatusText(item.item_status)}
                        </span>
                        
                        {item.item_status !== 'completed' && item.item_status !== 'cancel' && item.item_status !== 'canceled' && order.payment_status === 'paid' && (
                          <div className="flex space-x-2">
                            {item.item_status === 'pending' && (
                              <button
                                onClick={() => handleStatusUpdate(item.item_id, 'processing')}
                                disabled={updatingStatus === item.item_id}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                              >
                                {updatingStatus === item.item_id ? 'Loading...' : 'Proses'}
                              </button>
                            )}
                            
                            {item.item_status === 'processing' && (
                              <button
                                onClick={() => handleStatusUpdate(item.item_id, 'completed')}
                                disabled={updatingStatus === item.item_id}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                {updatingStatus === item.item_id ? 'Loading...' : 'Selesai'}
                              </button>
                            )}
                            
                            {(item.item_status === 'pending' || item.item_status === 'processing') && (
                              <button
                                onClick={() => handleStatusUpdate(item.item_id, 'cancel')}
                                disabled={updatingStatus === item.item_id}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                              >
                                {updatingStatus === item.item_id ? 'Loading...' : 'Batalkan'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Refund button: show when item canceled and transaction paid */}
                        {(order.payment_status === 'paid') && (item.item_status === 'cancel' || item.item_status === 'canceled') && (
                          <button
                            onClick={() => handleRefund(item.item_id, item.subtotal)}
                            disabled={refundingItem === item.item_id}
                            className="ml-2 px-3 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                          >
                            {refundingItem === item.item_id ? 'Memproses...' : 'Refund'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              
              <span className="text-sm text-gray-700">
                Halaman {currentPage} dari {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
