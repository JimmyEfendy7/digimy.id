import { Suspense } from "react";
import { fetchServiceCategories } from "../lib/api";
import CategorySection from "../components/CategorySection";

export const metadata = {
  title: 'Jasa Digital | DIGIPRO',
  description: 'Jasa digital berkualitas tinggi untuk berbagai kebutuhan Anda',
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

export default async function ServicesPage() {
  // Fetch data
  const categories = await fetchServiceCategories();

  // Map data for categories
  const mappedCategories = categories.map((category: Category) => ({
    ...category,
    type: 'service'
  }));

  return (
    <div className="pt-10">
      {/* Hero Section */}
      <section className="bg-teal-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Jasa Digital</h1>
          <p className="text-xl text-teal-100 max-w-2xl mx-auto text-center mb-8">
            Temukan jasa digital berkualitas dari profesional terbaik untuk berbagai kebutuhan Anda
          </p>
          
          {/* Search Form */}
          <div className="max-w-xl mx-auto">
            <form className="relative">
              <input
                type="text"
                placeholder="Cari jasa digital..."
                className="w-full py-3 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 text-gray-600 hover:text-teal-600"
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

      {/* Service Categories Section */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat kategori...</div>}>
        <CategorySection
          title="Kategori Jasa Digital"
          categories={mappedCategories}
          viewAllLink="/services"
          description="Pilih kategori jasa yang sesuai dengan kebutuhan Anda"
        />
      </Suspense>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Bagaimana Cara Kerjanya</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cari Jasa</h3>
              <p className="text-gray-600">
                Telusuri berbagai kategori jasa digital atau gunakan pencarian untuk menemukan jasa yang Anda butuhkan
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pilih Penawaran</h3>
              <p className="text-gray-600">
                Bandingkan penawaran, harga, dan ulasan untuk menemukan penyedia jasa terbaik untuk kebutuhan Anda
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pesan & Terima</h3>
              <p className="text-gray-600">
                Lakukan pembayaran dengan aman, komunikasikan kebutuhan Anda, dan terima hasil pekerjaan berkualitas
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 