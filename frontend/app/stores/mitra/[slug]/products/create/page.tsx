"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, Save, Upload, AlertCircle, X, Plus
} from 'lucide-react';

type Category = {
  id: number;
  name: string;
  slug: string;
};

export default function CreateProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    promo_price: '',
    stock: '1',
    category_id: '',
  });
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  // Load categories and check authentication
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('userData');
      
      if (!userData) {
        router.push('/account/login');
        return false;
      }
      
      try {
        const parsed = JSON.parse(userData);
        if (!parsed.store || parsed.store.slug !== slug) {
          router.push('/account/login');
          return false;
        }
        return true;
      } catch (e) {
        router.push('/account/login');
        return false;
      }
    };
    
    const loadCategories = async () => {
      try {
        // Fetch categories from API
        // const response = await fetch('/api/product-categories');
        // const data = await response.json();
        // setCategories(data);
        
        // Mock categories for now
        setCategories([
          { id: 1, name: 'Mobile Legends', slug: 'mobile-legends' },
          { id: 2, name: 'PUBG Mobile', slug: 'pubg-mobile' },
          { id: 3, name: 'Valorant', slug: 'valorant' },
          { id: 4, name: 'Genshin Impact', slug: 'genshin-impact' },
          { id: 5, name: 'Free Fire', slug: 'free-fire' },
        ]);
      } catch (error) {
        console.error('Error loading categories:', error);
        setError('Gagal memuat kategori produk');
      }
    };
    
    if (checkAuth()) {
      loadCategories();
    }
    setIsLoading(false);
  }, [slug, router]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      setFormData({
        ...formData,
        [name]: value,
        slug: generateSlug(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle poster image upload
  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPosterImage(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  // Handle additional images upload
  const handleAdditionalImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAdditionalImages([...additionalImages, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setAdditionalPreviews([...additionalPreviews, ...newPreviews]);
    }
  };

  // Remove an additional image
  const removeAdditionalImage = (index: number) => {
    const newImages = [...additionalImages];
    newImages.splice(index, 1);
    setAdditionalImages(newImages);
    
    const newPreviews = [...additionalPreviews];
    newPreviews.splice(index, 1);
    setAdditionalPreviews(newPreviews);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name) {
      setError('Nama produk wajib diisi');
      return;
    }
    
    if (!formData.price || isNaN(Number(formData.price))) {
      setError('Harga produk wajib diisi dengan angka valid');
      return;
    }
    
    if (!formData.category_id) {
      setError('Kategori produk wajib dipilih');
      return;
    }
    
    if (!posterImage) {
      setError('Gambar utama produk wajib diunggah');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Create FormData object for file uploads
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('slug', formData.slug);
      formDataObj.append('description', formData.description);
      formDataObj.append('price', formData.price);
      formDataObj.append('category_id', formData.category_id);
      formDataObj.append('stock', formData.stock);
      
      if (formData.promo_price) {
        formDataObj.append('promo_price', formData.promo_price);
      }
      
      if (posterImage) {
        formDataObj.append('poster', posterImage);
      }
      
      additionalImages.forEach((image, index) => {
        formDataObj.append('additional_images', image);
      });
      
      // In a real implementation, you would send this to an API endpoint
      // const response = await fetch('/api/stores/mitra/products', {
      //   method: 'POST',
      //   body: formDataObj
      // });
      // const data = await response.json();
      
      // For now, simulate a successful response
      console.log('Product data to be submitted:', {
        ...formData,
        posterImage: posterImage?.name,
        additionalImages: additionalImages.map(img => img.name)
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Produk berhasil ditambahkan!');
      router.push(`/stores/mitra/${slug}`);
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Gagal menambahkan produk. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link 
              href={`/stores/mitra/${slug}`} 
              className="mr-4 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Tambah Produk Baru</h1>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Form Fields */}
                <div className="md:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Informasi Dasar</h2>
                    
                    {/* Kategori */}
                    <div className="mb-4">
                      <label htmlFor="category_id" className="block text-gray-700 font-medium mb-2">
                        Kategori <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Pilih Kategori</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id.toString()}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Nama Produk */}
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                        Nama Produk <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Nama produk"
                        required
                      />
                    </div>
                    
                    {/* Slug */}
                    <div className="mb-4">
                      <label htmlFor="slug" className="block text-gray-700 font-medium mb-2">
                        Slug
                      </label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                        placeholder="slug-produk"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        URL produk: digipro.id/products/{formData.slug}
                      </p>
                    </div>
                    
                    {/* Deskripsi */}
                    <div>
                      <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                        Deskripsi
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Deskripsi detail tentang produk"
                      ></textarea>
                    </div>
                  </div>
                  
                  {/* Pricing */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Harga & Stok</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Harga */}
                      <div>
                        <label htmlFor="price" className="block text-gray-700 font-medium mb-2">
                          Harga (Rp) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">Rp</span>
                          </div>
                          <input
                            type="text"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="100000"
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Harga Promo */}
                      <div>
                        <label htmlFor="promo_price" className="block text-gray-700 font-medium mb-2">
                          Harga Promo (Rp)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">Rp</span>
                          </div>
                          <input
                            type="text"
                            id="promo_price"
                            name="promo_price"
                            value={formData.promo_price}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="90000"
                          />
                        </div>
                      </div>
                      
                      {/* Stock */}
                      <div>
                        <label htmlFor="stock" className="block text-gray-700 font-medium mb-2">
                          Stok
                        </label>
                        <input
                          type="number"
                          id="stock"
                          name="stock"
                          value={formData.stock}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Images */}
                <div className="space-y-6">
                  {/* Main Image */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Gambar Utama <span className="text-red-500">*</span></h2>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {posterPreview ? (
                        <div className="relative">
                          <Image 
                            src={posterPreview} 
                            alt="Product preview"
                            width={500}
                            height={300}
                            className="mx-auto rounded-lg object-contain h-40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPosterImage(null);
                              setPosterPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 mb-4">
                            Klik untuk mengunggah gambar utama produk
                          </p>
                          <p className="text-xs text-gray-400">
                            Format: JPG, PNG (Maks. 5MB)
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        id="poster"
                        name="poster"
                        accept="image/*"
                        onChange={handlePosterUpload}
                        className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${
                          posterPreview ? 'hidden' : 'block'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* Additional Images */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Gambar Tambahan</h2>
                    
                    {/* Preview grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {additionalPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={preview}
                            alt={`Product image ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Upload button */}
                      <label className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center h-24 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="text-center">
                          <Plus className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Tambah Gambar</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdditionalImagesUpload}
                          className="hidden"
                          multiple
                        />
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Tambahkan gambar detail produk (maks. 5 gambar)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-4">
              <Link 
                href={`/stores/mitra/${slug}`}
                className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    <span>Simpan Produk</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 