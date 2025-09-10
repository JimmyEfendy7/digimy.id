"use client";

import { useEffect, useState, ReactNode, useRef } from "react";
import LoadingAnimation from "../components/LoadingAnimation";

interface LoadingProviderProps {
  children: ReactNode;
}

export default function LoadingProvider({ children }: LoadingProviderProps) {
  const [loading, setLoading] = useState(true);
  const initialLoadComplete = useRef(false);
  
  // Efek loading hanya saat pertama kali load website atau refresh
  useEffect(() => {
    // Cek apakah ini adalah initial load atau refresh
    if (!initialLoadComplete.current) {
      // Simulasi loading untuk 2.5 detik
      const timer = setTimeout(() => {
        setLoading(false);
        initialLoadComplete.current = true;
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Tidak lagi memerlukan efek saat navigasi antar halaman
  
  if (loading) {
    return <LoadingAnimation />;
  }
  
  return <>{children}</>;
} 