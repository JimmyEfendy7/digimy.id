"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Store, Settings, Package, DollarSign, Users, Image as ImageIcon, 
  LogOut, AlertCircle, ShoppingBag, Award, CheckCircle, X, Code, Link2
} from 'lucide-react';
import ProductManagement from './components/ProductManagement';
import OrderManagement from './components/OrderManagement';
import FinanceManagement from './components/FinanceManagement';
import EmbedCodeManagement from './components/EmbedCodeManagement';
import QRScanner from './components/QRScanner';
import LinkOrderManagement from './components/LinkOrderManagement';
import AddonManagement from './components/AddonManagement';

type StoreData = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone_number: string;
  email: string;
  address?: string;
  is_verified: boolean;
  is_active: boolean;
  balance: number;
};

type UserData = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  profile_picture?: string;
};

export default function MitraDashboardPage() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [store, setStore] = useState<StoreData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    address: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<{
    logo: File | null;
    banner: File | null;
  }>({ logo: null, banner: null });
  
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        // Cek apakah user login dan memiliki akses ke halaman ini
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('authToken');
        
        if (!userData || !token) {
          setError('Silakan login terlebih dahulu');
          setIsLoading(false);
          return;
        }
        
        // Set auth token to state
        setAuthToken(token);
        
        const parsed = JSON.parse(userData);
        
        if (!parsed.store || parsed.store.slug !== slug) {
          setError('Anda tidak memiliki akses ke halaman ini');
          setIsLoading(false);
          return;
        }
        
        // Set initial data from localStorage
        setUser(parsed.user);
        
        // Fetch fresh store data from API
        const { getStoreProfile } = await import('../../../lib/api');
        const response = await getStoreProfile(slug as string);
        
        if (response.success) {
          // Update store data with fresh data from API
          setStore(response.data);
          
          // Update localStorage with fresh data
          const updatedUserData = {
            ...parsed,
            store: response.data
          };
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
        } else {
          // Fallback to localStorage data if API fails
          setStore(parsed.store);
          console.warn('Failed to fetch fresh store data:', response.message);
        }
        
      } catch (error) {
        console.error('Error fetching store data:', error);
        setError('Terjadi kesalahan saat memuat data toko');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStoreData();
  }, [slug]);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        email: store.email || '',
        address: store.address || ''
      });
    }
  }, [store]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        email: store.email || '',
        address: store.address || ''
      });
    }
    setSelectedFiles({ logo: null, banner: null });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (type: 'logo' | 'banner', file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Token tidak ditemukan');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('email', formData.email);
      formDataToSend.append('address', formData.address || '');
      
      if (selectedFiles.logo) {
        formDataToSend.append('logo', selectedFiles.logo);
      }
      if (selectedFiles.banner) {
        formDataToSend.append('banner', selectedFiles.banner);
      }

      const { updateStoreProfile } = await import('../../../lib/api');
      const response = await updateStoreProfile(slug as string, formDataToSend, token);
      
      if (response.success) {
        setStore(response.data);
        setIsEditing(false);
        setSelectedFiles({ logo: null, banner: null });
        
        // Update localStorage with new store data
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          parsed.store = response.data;
          localStorage.setItem('userData', JSON.stringify(parsed));
        }
        
        alert('Profil toko berhasil diupdate!');
      } else {
        throw new Error(response.message || 'Gagal mengupdate profil');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Terjadi kesalahan saat mengupdate profil');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/account/login';
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Akses Ditolak</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link 
            href="/account/login"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-white p-2 rounded-lg mr-4">
                <Store className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{store?.name || 'Dashboard Mitra'}</h1>
                <p className="text-indigo-100/90 text-sm">
                  {store?.is_verified ? 
                    <span className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Terverifikasi</span> : 
                    <span className="flex items-center"><X className="h-3 w-3 mr-1" /> Belum Terverifikasi</span>}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
          {/* Tab Navigation */}
          <div className="flex overflow-x-auto border-b">
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              Profil Toko
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'products' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('products')}
            >
              Produk
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'addons' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('addons')}
            >
              Addon
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'orders' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Pesanan
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'finance' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('finance')}
            >
              Keuangan
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'embed' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('embed')}
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Embed Code
              </div>
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'qr-scanner' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('qr-scanner')}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Scan QR
              </div>
            </button>
            <button
              className={`px-6 py-4 font-medium whitespace-nowrap ${
                activeTab === 'link-order' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('link-order')}
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link Order
              </div>
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">Informasi Toko</h2>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Edit Profil
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Status verifikasi */}
                  {!store?.is_verified && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-amber-800">Menunggu Verifikasi</h3>
                          <p className="text-sm text-amber-800/90">
                            Toko Anda sedang dalam proses verifikasi oleh tim kami. 
                            Anda sudah dapat menambahkan produk, tetapi produk tidak akan 
                            ditampilkan sampai toko Anda diverifikasi.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Form Profil Toko */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-900 font-medium mb-2">
                        Logo Toko
                      </label>
                      <div className="flex items-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden mr-4 border border-gray-200">
                          {store?.logo ? (
                            <Image 
                              src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${store.logo}`} 
                              alt={store.name} 
                              width={96} 
                              height={96} 
                              className="object-cover w-full h-full" 
                            />
                          ) : (
                            <Store className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            id="logo-upload"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            onChange={(e) => handleFileChange('logo', e.target.files?.[0] || null)}
                            className="hidden"
                            disabled={!isEditing}
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isEditing
                                ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {selectedFiles.logo ? selectedFiles.logo.name : 'Ubah Logo'}
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Nama Toko */}
                    <div>
                      <label className="block text-gray-900 font-medium mb-2">
                        Nama Toko
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={isEditing ? formData.name : (store?.name || '')}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm ${
                          isEditing
                            ? 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                            : 'border border-gray-200 bg-white cursor-default select-text'
                        }`}
                        placeholder="Nama Toko"
                        readOnly={!isEditing}
                      />
                    </div>
                    
                    {/* Slug */}
                    <div>
                      <label className="block text-gray-900 font-medium mb-2">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={store?.slug || ''}
                        className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm border border-gray-200 bg-white cursor-default"
                        placeholder="slug-toko"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-600">
                        URL toko: digipro.id/stores/{store?.slug}
                      </p>
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label className="block text-gray-900 font-medium mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={isEditing ? formData.email : (store?.email || '')}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm ${
                          isEditing
                            ? 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                            : 'border border-gray-200 bg-white cursor-default select-text'
                        }`}
                        placeholder="email@example.com"
                        readOnly={!isEditing}
                      />
                      <p className="mt-1 text-xs text-gray-600">Kami akan mengirimkan notifikasi penting ke email ini.</p>
                    </div>
                    
                    {/* Nomor Telepon */}
                    <div>
                      <label className="block text-gray-900 font-medium mb-2">
                        Nomor Telepon
                      </label>
                      <input
                        type="tel"
                        value={store?.phone_number || ''}
                        className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm border border-gray-200 bg-white cursor-default"
                        placeholder="08xxxxxxxxxx"
                        readOnly
                      />
                      <p className="mt-1 text-xs text-gray-600">Hubungi admin untuk mengubah nomor telepon.</p>
                    </div>
                    
                    {/* Alamat */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-900 font-medium mb-2">
                        Alamat
                      </label>
                      <textarea
                        name="address"
                        value={isEditing ? formData.address : (store?.address || '')}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm ${
                          isEditing
                            ? 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                            : 'border border-gray-200 bg-white cursor-default select-text'
                        }`}
                        rows={3}
                        readOnly={!isEditing}
                        placeholder="Alamat lengkap toko"
                      ></textarea>
                    </div>
                    
                    {/* Deskripsi */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-900 font-medium mb-2">
                        Deskripsi Toko
                      </label>
                      <textarea
                        name="description"
                        value={isEditing ? formData.description : (store?.description || '')}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-colors shadow-sm ${
                          isEditing
                            ? 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                            : 'border border-gray-200 bg-white cursor-default select-text'
                        }`}
                        rows={5}
                        readOnly={!isEditing}
                        placeholder="Deskripsi tentang toko dan produk yang dijual"
                      ></textarea>
                    </div>
                    
                    {/* Banner */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-900 font-medium mb-2">
                        Banner Toko
                      </label>
                      <div className="border border-gray-300 border-dashed rounded-xl p-6 text-center bg-gray-50">
                        {store?.banner ? (
                          <div className="relative w-full h-48">
                            <Image 
                              src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${store.banner}`}
                              alt="Banner toko" 
                              layout="fill" 
                              objectFit="cover" 
                              className="rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="text-gray-600">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            <p>Tingkatkan tampilan profil toko Anda dengan banner.</p>
                            <p className="text-sm text-gray-500 mt-1">Ukuran yang disarankan: 1200 x 400 pixel</p>
                          </div>
                        )}
                        {isEditing && (
                          <div className="mt-4">
                            <input
                              type="file"
                              id="banner-upload"
                              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                              onChange={(e) => handleFileChange('banner', e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <label
                              htmlFor="banner-upload"
                              className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {selectedFiles.banner ? selectedFiles.banner.name : 'Pilih Banner'}
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
{/* Products Tab */}
            {activeTab === 'products' && (
              <ProductManagement slug={slug as string} />
            )}
            
            {/* Addons Tab */}
            {activeTab === 'addons' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Addon Produk</h2>
                <AddonManagement />
              </div>
            )}
            
            {/* Orders Tab */}
            {activeTab === 'orders' && store && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pesanan</h2>
                <OrderManagement storeId={store.id} />
              </div>
            )}
            
            {/* QR Scanner Tab */}
            {activeTab === 'qr-scanner' && store && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Scan QR</h2>
                <QRScanner storeId={store.id.toString()} />
              </div>
            )}
            
            {/* Link Order Tab */}
            {activeTab === 'link-order' && store && authToken && (
              <div>
                <LinkOrderManagement storeId={String(store.id)} token={authToken} />
              </div>
            )}
            
            {/* Finance Tab */}
            {activeTab === 'finance' && store && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Keuangan</h2>
                <FinanceManagement storeId={store.id} currentBalance={store.balance} />
              </div>
            )}
            
            {/* Embed Code Tab */}
            {activeTab === 'embed' && store && authToken && (
              <EmbedCodeManagement storeId={store.id.toString()} token={authToken} />
            )}
            
            
          </div>
        </div>
      </div>
    </div>
  );
} 