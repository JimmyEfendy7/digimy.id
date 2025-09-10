"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Package, Plus, Edit, Trash2, Eye, Search, Filter,
  Grid, List, ChevronLeft, ChevronRight, Star, Power, X
} from 'lucide-react';

type ProductReview = {
  id: number;
  file_url: string;
  file_type: 'image' | 'video';
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  poster_url?: string;
  price: number;
  promo_price?: number;
  stock: number;
  category_id?: number;
  category_name?: string;
  is_active: boolean;
  is_appointment?: boolean;
  created_at: string;
  reviews?: ProductReview[];
};

type ProductCategory = {
  id: number;
  name: string;
};

type ProductManagementProps = {
  slug: string;
};

export default function ProductManagement({ slug }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]); // full list for form
  const [filterCategories, setFilterCategories] = useState<ProductCategory[]>([]); // derived for top filter
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    promo_price: '',
    stock: '1'
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [existingReviews, setExistingReviews] = useState<ProductReview[]>([]);
  const [reviewsToDelete, setReviewsToDelete] = useState<number[]>([]); // Track reviews marked for deletion
  const [isProductActive, setIsProductActive] = useState<boolean>(true);
  const [isAppointment, setIsAppointment] = useState<boolean>(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [currentPage]);

  // Reset selectedCategory if it's no longer available in derived filter categories
  useEffect(() => {
    if (!selectedCategory) return;
    const exists = filterCategories.some(c => c.id.toString() === selectedCategory);
    if (!exists) setSelectedCategory('');
  }, [filterCategories]);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const { getStoreProducts } = await import('../../../../lib/api');
      const response = await getStoreProducts(currentPage, 12, token);
      
      if (response.success) {
        setProducts(response.data);
        setTotalPages(response.pagination.totalPages);

        // Derive categories only from products owned by this store (for filter dropdown)
        deriveCategoriesFromProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build category options from current product list
  const deriveCategoriesFromProducts = async (prods: Product[]) => {
    try {
      const ids = Array.from(new Set(prods
        .map(p => p.category_id)
        .filter((v): v is number => typeof v === 'number')));

      // Collect names from product payload when available
      const catMap = new Map<number, string>();
      prods.forEach(p => {
        if (p.category_id && p.category_name) {
          catMap.set(p.category_id, p.category_name);
        }
      });

      // If some names are missing, fetch all categories and map names for used ids only
      if (ids.length > 0 && catMap.size < ids.length) {
        try {
          const { getProductCategories } = await import('../../../../lib/api');
          const res = await getProductCategories();
          if (res?.success && Array.isArray(res.data)) {
            res.data.forEach((c: { id: number; name: string }) => {
              if (ids.includes(c.id) && !catMap.has(c.id)) {
                catMap.set(c.id, c.name);
              }
            });
          }
        } catch (e) {
          console.warn('Gagal memuat nama kategori, menggunakan ID saja');
        }
      }

      const derived: ProductCategory[] = ids.map((id) => ({
        id,
        name: catMap.get(id) || `Kategori ${id}`,
      }));
      setFilterCategories(derived);
    } catch (e) {
      console.error('Error deriving categories:', e);
    }
  };

  const loadCategories = async () => {
    try {
      const { getProductCategories } = await import('../../../../lib/api');
      const response = await getProductCategories();
      
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleReviewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedReviews(files);
      
      // Generate previews
      const previews: string[] = [];
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          previews[index] = reader.result as string;
          if (previews.length === files.length) {
            setReviewPreviews([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReviewFile = (index: number) => {
    const newFiles = selectedReviews.filter((_, i) => i !== index);
    const newPreviews = reviewPreviews.filter((_, i) => i !== index);
    setSelectedReviews(newFiles);
    setReviewPreviews(newPreviews);
  };

  const removeExistingReview = async (reviewId: number) => {
    if (!editingProduct) return;
    
    // Mark review for deletion instead of immediate API call
    setReviewsToDelete(prev => [...prev, reviewId]);
    
    // Hide from UI immediately for better UX
    setExistingReviews(prev => prev.filter(review => review.id !== reviewId));
    
    console.log(`Review ${reviewId} marked for deletion`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      price: '',
      promo_price: '',
      stock: '1'
    });
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedReviews([]);
    setReviewPreviews([]);
    setExistingReviews([]);
    setReviewsToDelete([]); // Clear reviews marked for deletion
    setIsProductActive(true);
    setIsAppointment(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Token tidak ditemukan');

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('category_id', formData.category_id);
      submitData.append('price', formData.price);
      // Always send promo_price, even if empty (will be converted to null in backend)
      submitData.append('promo_price', formData.promo_price || '');
      submitData.append('stock', formData.stock);
      submitData.append('is_active', isProductActive.toString());
      submitData.append('is_appointment', isAppointment.toString());
      if (selectedImage) submitData.append('poster', selectedImage);
      
      // Add review files
      selectedReviews.forEach((file) => {
        submitData.append('reviews', file);
      });

      // Add reviews to delete for batched deletion (only for product updates)
      if (editingProduct && reviewsToDelete.length > 0) {
        submitData.append('reviewsToDelete', JSON.stringify(reviewsToDelete));
      }

      let response;
      if (editingProduct) {
        const { updateProduct } = await import('../../../../lib/api');
        response = await updateProduct(editingProduct.id.toString(), submitData, token);
      } else {
        const { addProduct } = await import('../../../../lib/api');
        response = await addProduct(submitData, token);
      }

      if (response.success) {
        alert(editingProduct ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
        setShowAddForm(false);
        resetForm();
        loadProducts();
      } else {
        throw new Error(response.message || 'Gagal menyimpan produk');
      }
    } catch (error: any) {
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id?.toString() || '',
      price: product.price.toString(),
      promo_price: product.promo_price?.toString() || '',
      stock: product.stock.toString()
    });
    setIsProductActive(product.is_active);
    setIsAppointment(product.is_appointment || false);
    if (product.poster_url) {
      setImagePreview(`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${product.poster_url}`);
    }
    
    // Load full product details with reviews
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const { getProduct } = await import('../../../../lib/api');
        const response = await getProduct(product.id.toString(), token);
        if (response.success && response.data.reviews) {
          setExistingReviews(response.data.reviews);
        }
      }
    } catch (error) {
      console.error('Error loading product reviews:', error);
    }
    
    setShowAddForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Yakin ingin menghapus produk "${product.name}"?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Token tidak ditemukan');

      const { deleteProduct } = await import('../../../../lib/api');
      const response = await deleteProduct(product.id.toString(), token);

      if (response.success) {
        alert('Produk berhasil dihapus!');
        loadProducts();
      } else {
        throw new Error(response.message || 'Gagal menghapus produk');
      }
    } catch (error: any) {
      alert(error.message || 'Terjadi kesalahan');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Token tidak ditemukan');

      const formData = new FormData();
      formData.append('is_active', (!product.is_active).toString());

      const { updateProduct } = await import('../../../../lib/api');
      const response = await updateProduct(product.id.toString(), formData, token);

      if (response.success) {
        loadProducts();
      } else {
        throw new Error(response.message || 'Gagal mengubah status produk');
      }
    } catch (error: any) {
      alert(error.message || 'Terjadi kesalahan');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">Produk ({products.length})</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <input
            type="text"
            aria-label="Cari produk berdasarkan nama"
            placeholder="Cari produk berdasarkan nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchTerm) {
                setSearchTerm('');
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }
            }}
            ref={searchInputRef}
            className="w-full pl-10 pr-9 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-600 bg-white shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => {
                setSearchTerm('');
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white shadow-sm"
        >
          <option value="">Semua Kategori</option>
          {filterCategories.map(category => (
            <option key={category.id} value={category.id.toString()}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Tampilan grid"
            className={`group p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          >
            <Grid className={`h-4 w-4 ${viewMode === 'grid' ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="Tampilan daftar"
            className={`group p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          >
            <List className={`h-4 w-4 ${viewMode === 'list' ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
          </button>
        </div>
      </div>

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto animate-fadeIn">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-xl z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                  </h3>
                  <p className="text-white/90 text-sm mt-1">
                    {editingProduct ? 'Perbarui informasi produk Anda' : 'Lengkapi semua informasi produk dengan benar'}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-white hover:bg-white/10 p-1 rounded-full transition-colors"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column - Image and Toggles */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Product Image */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Gambar Produk</h4>
                    <div className="flex flex-col items-center">
                      <div className="w-40 h-40 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                        {imagePreview ? (
                          <Image src={imagePreview} alt="Preview" width={160} height={160} className="object-cover w-full h-full rounded" />
                        ) : (
                          <div className="text-center">
                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-500">Belum ada gambar</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        id="product-image"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="product-image"
                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                      >
                        {imagePreview ? 'Ganti Gambar' : 'Pilih Gambar'}
                      </label>
                      <p className="text-xs text-gray-600 mt-2 text-center">Max 5MB, PNG/JPG/WebP</p>
                    </div>
                  </div>

                  {/* Product Settings */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Pengaturan Produk</h4>
                    
                    {/* Product Active Toggle */}
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Status Produk</label>
                          <p className="text-xs text-gray-500">
                            {isProductActive ? 'Produk aktif dan dapat dibeli' : 'Produk tidak aktif dan tersembunyi'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsProductActive(!isProductActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            isProductActive ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isProductActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        isProductActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isProductActive ? 'Aktif' : 'Nonaktif'}
                      </div>
                    </div>

                    {/* Appointment Toggle */}
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Mode Appointment</label>
                          <p className="text-xs text-gray-500">
                            {isAppointment ? 'Kirim QR code setelah pembayaran' : 'Produk digital biasa tanpa QR'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAppointment(!isAppointment)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            isAppointment ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isAppointment ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        isAppointment ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isAppointment ? 'Appointment' : 'Normal'}
                      </div>
                      {isAppointment && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          <strong>📅 Mode Appointment:</strong> Setelah pembayaran berhasil, pelanggan akan menerima QR code via WhatsApp untuk di-scan saat datang ke toko.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Product Information */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Informasi Dasar</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Product Name */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Produk *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
                          placeholder="Masukkan nama produk yang menarik"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
                        <select
                          name="category_id"
                          value={formData.category_id}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 bg-white"
                        >
                          <option value="">Pilih kategori</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id.toString()}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stok</label>
                        <input
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
                          placeholder="Jumlah stok"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Harga</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Normal Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Harga Normal *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">Rp</span>
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                            min="0"
                            step="1000"
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
                            placeholder="100000"
                          />
                        </div>
                      </div>

                      {/* Promo Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Harga Promo</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">Rp</span>
                          <input
                            type="number"
                            name="promo_price"
                            value={formData.promo_price}
                            onChange={handleInputChange}
                            min="0"
                            step="1000"
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
                            placeholder="80000 (opsional)"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Kosongkan jika tidak ada promo</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Deskripsi</h4>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
                      placeholder="Deskripsikan produk Anda dengan detail, keunggulan, dan manfaatnya..."
                    ></textarea>
                  </div>

                  {/* Existing Reviews (only show when editing) */}
                  {editingProduct && existingReviews.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Review Media yang Sudah Ada</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingReviews.map((review) => (
                          <div key={review.id} className="relative group bg-white rounded-lg p-2 border">
                            <div className="w-full h-20 bg-gray-100 rounded-lg overflow-hidden">
                              {review.file_type === 'image' ? (
                                <Image
                                  src={(() => {
                                    const { getImageUrl } = require('../../../../lib/api');
                                    return getImageUrl(review.file_url, 'review');
                                  })()}
                                  alt="Review media"
                                  width={80}
                                  height={80}
                                  className="object-cover w-full h-full rounded"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-gray-200 rounded">
                                  <div className="text-center">
                                    <Package className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                    <span className="text-xs text-gray-500">Video</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingReview(review.id)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Hapus review media"
                            >
                              ×
                            </button>
                            <p className="text-xs text-gray-600 mt-1 text-center">
                              {review.file_type === 'image' ? 'Gambar' : 'Video'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Reviews Upload */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">
                      {editingProduct ? 'Tambah Review Media Baru' : 'Review Produk (Gambar/Video)'}
                    </h4>
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <div className="mb-4">
                          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="file"
                            id="review-files"
                            accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/avi,video/mov,video/wmv"
                            onChange={handleReviewFilesChange}
                            multiple
                            className="hidden"
                          />
                          <label
                            htmlFor="review-files"
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                          >
                            Pilih File Review
                          </label>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">Drag & drop file di sini atau klik untuk memilih</p>
                        <p className="text-xs text-gray-600">
                          Max 10MB per file • PNG/JPG/WebP/MP4/AVI/MOV/WMV • Max 10 files
                        </p>
                      </div>
                      
                      {/* Review Previews */}
                      {selectedReviews.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedReviews.map((file, index) => (
                              <div key={index} className="relative group bg-gray-50 rounded-lg p-2">
                                <div className="w-full h-20 bg-white rounded-lg overflow-hidden border">
                                  {file.type.startsWith('image/') ? (
                                    reviewPreviews[index] && (
                                      <Image
                                        src={reviewPreviews[index]}
                                        alt={`Review ${index + 1}`}
                                        width={80}
                                        height={80}
                                        className="object-cover w-full h-full rounded"
                                      />
                                    )
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <div className="text-center">
                                        <Package className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500">Video</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeReviewFile(index)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                                <p className="text-xs text-gray-600 mt-1 truncate text-center" title={file.name}>
                                  {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Actions */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600 order-2 sm:order-1">
                    {editingProduct ? (
                      <span>💡 Perubahan akan langsung disimpan setelah Anda klik Update</span>
                    ) : (
                      <span>💡 Pastikan semua informasi sudah benar sebelum menyimpan</span>
                    )}
                  </div>
                  <div className="flex gap-3 order-1 sm:order-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {editingProduct ? 'Update Produk' : 'Simpan Produk'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {searchTerm || selectedCategory ? 'Tidak ada produk yang sesuai' : 'Belum ada produk'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {searchTerm || selectedCategory 
              ? 'Coba ubah filter pencarian atau tambahkan produk baru.'
              : 'Anda belum menambahkan produk apa pun. Mulai tambahkan produk untuk ditampilkan di toko Anda.'
            }
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Tambah Produk Pertama
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 relative">
                {product.poster_url ? (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${product.poster_url}`}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.category_name}</p>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {product.promo_price ? (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-green-600">
                          Rp {product.promo_price.toLocaleString('id-ID')}
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          Rp {product.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-gray-900">
                        Rp {product.price.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Stok: {product.stock}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => toggleProductStatus(product)}
                    className={`flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                      product.is_active 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    {product.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className={`flex items-center p-4 ${index > 0 ? 'border-t' : ''}`}>
              {/* Product Image */}
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mr-4">
                {product.poster_url ? (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${product.poster_url}`}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category_name}</p>
              </div>

              {/* Price */}
              <div className="text-right mr-4">
                {product.promo_price ? (
                  <>
                    <div className="text-lg font-bold text-green-600">
                      Rp {product.promo_price.toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-gray-500 line-through">
                      Rp {product.price.toLocaleString('id-ID')}
                    </div>
                  </>
                ) : (
                  <div className="text-lg font-bold text-gray-900">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>
                )}
                <div className="text-sm text-gray-500">Stok: {product.stock}</div>
              </div>

              {/* Status */}
              <div className="mr-4">
                <button
                  onClick={() => toggleProductStatus(product)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    product.is_active 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {product.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-700">
            Halaman {currentPage} dari {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
