import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, ShoppingCart, Truck, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { LABELS } from '../lib/pkr';

export function Header() {
  const { settings, language, toggleLanguage } = useStore();
  const { itemCount } = useCart();
  const [searchText, setSearchText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const t = LABELS[language];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchText.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      {/* COD Top Strip */}
      <div className="bg-navy text-white text-xs font-semibold py-2 px-4 text-center tracking-wide">
        <span className="inline-flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-orange-accent" />
          {t.codBanner}
        </span>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-navy hover:bg-gray-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="w-9 h-9 rounded-lg object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5 text-orange-accent" />
              </div>
            )}
            <div className="leading-tight">
              <div className="font-display font-bold text-lg text-navy">
                {settings?.store_name || 'Expensive Store'}
              </div>
              <div className="text-[11px] text-gray-500 hidden sm:block">
                {settings?.tagline || 'Shop Smart, Pay Less.'}
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link to="/" className="hover:text-navy">Home</Link>
          <Link to="/shop" className="hover:text-navy">Shop All</Link>
          <Link to="/categories" className="hover:text-navy">Categories</Link>
          <Link to="/track-order" className="hover:text-navy">Track Order</Link>
          <Link to="/contact" className="hover:text-navy">Contact</Link>
        </nav>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm relative">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-navy focus:bg-white"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-navy hover:bg-gray-50"
          >
            {language === 'en' ? 'اردو' : 'EN'}
          </button>

          <Link
            to="/search"
            className="md:hidden p-2 rounded-lg text-navy hover:bg-gray-100"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light transition"
          >
            <ShoppingCart className="w-4 h-4 text-orange-accent" />
            <span className="hidden sm:inline">Cart</span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-accent text-white text-xs font-bold">
              {itemCount}
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm font-medium">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">Home</Link>
            <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">Shop All</Link>
            <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">Categories</Link>
            <Link to="/track-order" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">Track Order</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">About Us</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-lg bg-gray-50 text-navy">Contact Us</Link>
          </div>
        </div>
      )}
    </header>
  );
}
