"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Menu, X, User } from "lucide-react";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userDataRaw = localStorage.getItem('userData');
    if (userDataRaw) {
      try {
        const parsed = JSON.parse(userDataRaw);
        if (parsed.store) {
          setDisplayName(parsed.store.name || parsed.store.store_name);
        } else if (parsed.user) {
          setDisplayName(parsed.user.name);
        } else if (parsed.admin) {
          setDisplayName(parsed.admin.name);
        }
      } catch (e) {
        /* ignore parse error */
      }
    }
    const handleStorage = () => {
      const dataRaw = localStorage.getItem('userData');
      if (dataRaw) {
        try {
          const p = JSON.parse(dataRaw);
          if (p.store) {
            setDisplayName(p.store.name || p.store.store_name);
          } else if (p.user) {
            setDisplayName(p.user.name);
          } else if (p.admin) {
            setDisplayName(p.admin.name);
          } else {
            setDisplayName('');
          }
        } catch {
          setDisplayName('');
        }
      } else {
        setDisplayName('');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const navLinks = [
    { name: "Beranda", path: "/" },
    { name: "Produk Digital", path: "/products" },
    { name: "Jasa Digital", path: "/services" },
    { name: "Lelang Digital", path: "/auctions" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white shadow-sm py-3"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="relative w-36 h-10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                DIGIPRO
              </h2>
            </div>
          </Link>

          {/* Centered Nav */}
          <div className="flex-grow flex justify-center">
            {/* Desktop Navigation - Always show on larger screens */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`relative font-medium transition-colors ${
                    pathname === link.path 
                      ? "text-indigo-600" 
                      : "text-gray-700 hover:text-indigo-600"
                  }`}
                >
                  {link.name}
                  {pathname === link.path && (
                    <motion.span
                      layoutId="navIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center">
            {/* Cart and Account */}
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ShoppingCart className="h-5 w-5 text-gray-700" />
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </Link>
              {/* Account dropdown */}
              <div className="relative" onMouseEnter={() => setAccountOpen(true)} onMouseLeave={() => setAccountOpen(false)}>
                <button
                  className="flex items-center space-x-2 hover:bg-gray-100 py-2 px-3 rounded-full transition-colors text-gray-700 focus:outline-none"
                  aria-haspopup="true"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">{displayName || 'Akun'}</span>
                </button>
                {/* Dropdown */}
                {accountOpen && !displayName && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
                    <Link href="/account/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Login Customer
                    </Link>
                    <Link href="/stores/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Login Mitra
                    </Link>
                  </div>
                )}
                {accountOpen && displayName && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userData');
                        setDisplayName('');
                        window.location.href = '/';
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 ml-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t shadow-md text-gray-700"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`py-2 px-4 rounded-md ${
                      pathname === link.path
                        ? "bg-indigo-50 text-indigo-600 font-medium"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="border-t border-gray-200 pt-3 pb-2 flex items-center justify-between">
                  <Link
                    href="/cart"
                    className="flex items-center space-x-2 p-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Keranjang</span>
                  </Link>
                  <Link
                    href="/account"
                    className="flex items-center space-x-2 p-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>Akun</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar; 