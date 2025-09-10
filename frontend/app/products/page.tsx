import { Suspense } from "react";
import { fetchProductCategories, fetchAllProducts } from "../lib/api";
import ProductSection from "../components/ProductSection";
import CategorySection from "../components/CategorySection";

export const metadata = {
  title: 'Produk Digital | DIGIPRO',
  description: 'Produk digital berkualitas tinggi untuk berbagai kebutuhan Anda',
};

interface Category {
  id: string;
  name: string;
  icon_url?: string;
  slug?: string;
  description?: string;
  color?: string;
  type?: 'product' | 'service';
  [key: string]: string | number | boolean | undefined;
}

export default async function ProductsPage() {
  // Fetch data
  const categories = await fetchProductCategories();
  const products = await fetchAllProducts(20, 1);

  // Map data for categories
  const mappedCategories = categories.map((category: Category) => ({
    ...category,
    type: 'product'
  }));

  return (
    <div className="pt-10">
      {/* Hero Section */}
      <section className="bg-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Produk Digital</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto text-center mb-8">
            Temukan produk digital berkualitas tinggi untuk berbagai kebutuhan Anda
          </p>
          
          {/* Search Form */}
          <div className="max-w-xl mx-auto">
            <form className="relative">
              <input
                type="text"
                placeholder="Cari produk digital..."
                className="w-full py-3 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 text-gray-600 hover:text-blue-600"
                aria-label="Cari"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat kategori...</div>}>
        <CategorySection
          title="Kategori Produk Digital"
          categories={mappedCategories}
          viewAllLink="/products"
          description="Pilih kategori yang sesuai dengan kebutuhan Anda"
        />
      </Suspense>

      {/* Products Section */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat produk...</div>}>
        <ProductSection
          title="Semua Produk Digital"
          products={products.data || []}
          viewAllLink="/products"
          description="Produk digital berkualitas tinggi yang dapat Anda beli"
        />
      </Suspense>
    </div>
  );
} 