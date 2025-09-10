"use client";

import React from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LoadingProvider from "./providers/LoadingProvider";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoadingProvider>
      <Navbar />
      <main className="flex-grow pt-16">{children}</main>
      <Footer />
    </LoadingProvider>
  );
} 