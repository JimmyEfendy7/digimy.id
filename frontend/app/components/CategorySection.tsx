"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, FolderOpen } from "lucide-react";

interface CategoryProps {
  id: string;
  name: string;
  icon_url?: string;
  slug?: string;
  description?: string;
  color?: string;
  type: 'product' | 'service';
}

interface CategorySectionProps {
  title: string;
  categories: CategoryProps[];
  viewAllLink: string;
  description?: string;
}

// Gradien yang lebih sesuai dengan tema indigo-purple-blue
const colors = [
  'from-indigo-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-indigo-600',
  'from-purple-600 to-blue-600',
  'from-indigo-600 to-purple-600',
  'from-blue-600 to-purple-600',
  'from-indigo-500 to-purple-500',
  'from-purple-500 to-blue-500',
];

const icons = {
  default: "/icons/category-default.svg",
  product: "/icons/product-icon.svg",
  service: "/icons/service-icon.svg"
};

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

const CategorySection = ({ title, categories, viewAllLink, description }: CategorySectionProps) => {
  // Get link base based on first category type
  const basePath = categories.length > 0 ? (categories[0].type === 'product' ? '/products' : '/services') : '';
  
  // Determine icon and color scheme based on category type
  const isProductCategory = categories.length > 0 && categories[0].type === 'product';
  const sectionColor = isProductCategory ? 'from-indigo-700 via-blue-700 to-purple-700' : 'from-indigo-700 via-purple-700 to-blue-700';
  const buttonGradient = isProductCategory ? 'from-indigo-600 to-blue-600' : 'from-indigo-600 to-purple-600';

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 -z-10"></div>
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 -z-10"></div>
      
      {/* Animated shine effect */}
      <motion.div 
        className="absolute -inset-10 bg-gradient-to-r from-transparent via-purple-200/20 to-transparent -z-10"
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div className="relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-1 bg-gradient-to-r ${buttonGradient} rounded absolute top-0 left-0`}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="pt-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="text-indigo-500 w-5 h-5" />
                <h2 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${sectionColor} bg-clip-text text-transparent`}>{title}</h2>
              </div>
              {description && (
                <p className="text-gray-600 max-w-2xl mt-2">
                  {description}
                </p>
              )}
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link 
              href={viewAllLink}
              className={`mt-3 md:mt-0 group inline-flex items-center gap-1 bg-gradient-to-r ${buttonGradient} hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1`}
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {categories.map((category, index) => (
            <motion.div
              key={category.id} 
              variants={item}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <CategoryCard 
                category={category}
                color={colors[index % colors.length]}
                basePath={basePath}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const CategoryCard = ({ 
  category, 
  color,
  basePath
}: { 
  category: CategoryProps; 
  color: string;
  basePath: string;
}) => {
  const { id, name, icon_url, slug, description } = category;
  const url = slug ? `${basePath}/${slug}` : `${basePath}/category/${id}`;
  const iconSrc = icon_url || (category.type === 'product' ? icons.product : icons.service);

  return (
    <Link href={url}>
      <div className={`bg-gradient-to-br ${color} rounded-xl overflow-hidden h-36 relative p-5 flex flex-col justify-between text-white shadow-lg hover:shadow-xl transition-all duration-300`}>
        <div className="absolute top-0 right-0 opacity-20 -mr-4 -mt-4">
          <Image 
            src={iconSrc}
            alt={name}
            width={96}
            height={96}
            className="w-24 h-24"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = icons.default;
            }}
          />
        </div>
        
        <h3 className="font-bold text-xl z-10 mb-1">{name}</h3>
        
        {description && (
          <p className="text-white/90 text-sm z-10 line-clamp-2 mb-2">{description}</p>
        )}
        
        <div className="flex items-center mt-auto text-sm z-10 bg-white/20 self-start py-1.5 px-3 rounded-full">
          <span>Jelajahi</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

export default CategorySection;

 