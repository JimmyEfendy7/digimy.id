"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { ChevronRight, Briefcase } from "lucide-react";
import ServiceCard from "./ServiceCard";
import { motion } from "framer-motion";
import { fetchAllServices } from '../lib/api';

// Definisi tipe Service
interface Service {
  id: string;
  name: string;
  price: number;
  poster_url: string;
  delivery_time: number;
  rating?: number;
  review_count?: number;
  store_name?: string;
}

interface ServiceSectionProps {
  title: string;
  viewAllLink: string;
  description?: string;
  emptyMessage?: string;
  limit?: number;
  services?: Service[]; // Prop opsional untuk menerima data services dari luar
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ServiceSection = ({ 
  title, 
  viewAllLink, 
  description,
  emptyMessage = "Belum ada jasa yang tersedia",
  limit = 8,
  services: initialServices, // Menerima services dari prop jika ada
}: ServiceSectionProps) => {
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [loading, setLoading] = useState<boolean>(!initialServices);

  useEffect(() => {
    console.log("[ServiceSection] Received services:", initialServices);
    
    // Jika services sudah disediakan melalui props, tidak perlu fetch lagi
    if (initialServices && initialServices.length > 0) {
      setServices(initialServices);
      setLoading(false);
      return;
    }

    const getServices = async () => {
      try {
        setLoading(true);
        const response = await fetchAllServices(limit);
        console.log("[ServiceSection] Fetched services response:", response);
        // Mengakses properti data dari response
        setServices(response.data || []);
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    getServices();
  }, [limit, initialServices]);

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
                <Briefcase className="text-indigo-500 w-5 h-5" />
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-700 bg-clip-text text-transparent">{title}</h2>
              </div>
              {description && (
                <p className="text-gray-600 max-w-2xl mt-2">
                  {description}
                </p>
              )}
            </motion.div>
          </div>
          
          {!loading && services.length > 0 && (
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

        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : services.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            {services.map((service) => (
              <motion.div 
                key={service.id} 
                variants={item}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="transform transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl h-full"
              >
                <ServiceCard {...service} />
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
        
        {/* Featured Services Banner */}
        {!loading && services.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="p-0 flex flex-col md:flex-row">
              <div className="md:w-2/3 p-8 flex flex-col justify-center">
                <h3 className="text-2xl font-bold mb-3 text-white">Perlukan Jasa Professional?</h3>
                <p className="text-indigo-100 mb-6">
                  Temukan jasa digital dari para ahli di bidangnya untuk membantu menyelesaikan kebutuhan Anda dengan cepat dan hasil berkualitas.
                </p>
                <div>
                  <Link 
                    href="/services"
                    className="px-6 py-3 bg-white text-indigo-700 rounded-full font-medium inline-flex items-center gap-2 hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 shadow-md"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Jelajahi Jasa Digital</span>
                  </Link>
                </div>
              </div>
              <div className="md:w-1/3 bg-gradient-to-br from-indigo-700 to-blue-700 flex items-center justify-center p-8">
                <div className="text-white text-center">
                  <div className="text-6xl font-bold mb-2">1000+</div>
                  <div className="text-indigo-100">Jasa Profesional Tersedia</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ServiceSection; 