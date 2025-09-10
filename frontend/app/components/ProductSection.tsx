"use client";

import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import ProductCard from "./ProductCard";
import { motion } from "framer-motion";

interface ProductProps {
  id: string;
  name: string;
  price: number;
  promo_price?: number | null;
  poster_url: string;
  is_official: boolean;
  rating?: number;
  sales_count?: number;
  store_name?: string;
  description?: string;
  category_name?: string;
  stock?: number;
}

interface ProductSectionProps {
  title: string;
  products: ProductProps[];
  viewAllLink: string;
  description?: string;
  emptyMessage?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ProductSection = ({ 
  title, 
  products = [], 
  viewAllLink, 
  description,
  emptyMessage = "Belum ada produk yang tersedia"
}: ProductSectionProps) => {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 -z-10"></div>
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 -z-10"></div>
      
      {/* Animated shine effect */}
      <motion.div 
        className="absolute -inset-10 bg-gradient-to-r from-transparent via-indigo-200/20 to-transparent -z-10"
        animate={{
          x: ["100%", "-100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="container mx-auto px-4">
        {/* Heading with animated highlight */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div className="relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded absolute top-0 left-0"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="pt-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="text-indigo-500 w-5 h-5" />
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-700 bg-clip-text text-transparent">{title}</h2>
              </div>
              {description && (
                <p className="text-gray-600 max-w-2xl mt-2">
                  {description}
                </p>
              )}
            </motion.div>
          </div>
          
          {products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link 
                href={viewAllLink}
                className="mt-3 md:mt-0 group inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}
        </div>

        {products.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            {products.map((product) => (
              <motion.div 
                key={product.id} 
                variants={item}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="transform transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl h-full"
              >
                <ProductCard 
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  promo_price={product.promo_price}
                  poster_url={product.poster_url}
                  is_official={product.is_official}
                  rating={product.rating}
                  sales_count={product.sales_count}
                  store_name={product.store_name}
                  description={product.description}
                  category_name={product.category_name}
                  stock={product.stock}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg p-8 text-center shadow-md"
          >
            <p className="text-gray-500">{emptyMessage}</p>
          </motion.div>
        )}

        {/* Featured Products Banner */}
        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-8 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 text-white">
                <h3 className="text-2xl font-bold mb-2">Temukan Produk Digital Berkualitas</h3>
                <p className="text-indigo-100">Pilihan produk digital terlengkap dengan harga terbaik</p>
              </div>
              <Link 
                href="/products"
                className="px-6 py-3 bg-white text-indigo-700 rounded-full font-medium hover:bg-indigo-50 transform hover:scale-105 transition-all duration-300 shadow-md"
              >
                Jelajahi Produk
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ProductSection; 