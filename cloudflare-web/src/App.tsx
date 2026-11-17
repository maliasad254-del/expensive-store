import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { AdminDashboardPage, AdminLoginPage } from './pages/AdminPages';
import {
  CartPage,
  CheckoutPage,
  OrderConfirmationPage,
  TrackOrderPage
} from './pages/CartCheckoutPages';
import {
  CategoriesPage,
  ProductDetailPage,
  SearchPage,
  ShopAllPage
} from './pages/CatalogPages';
import { HomePage } from './pages/HomePage';
import { InfoPage } from './pages/InfoPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <StoreProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopAllPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/product/:slugOrId" element={<ProductDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/about" element={<InfoPage type="about" />} />
                <Route path="/contact" element={<InfoPage type="contact" />} />
                <Route path="/faq" element={<InfoPage type="faq" />} />
                <Route path="/privacy-policy" element={<InfoPage type="privacy" />} />
                <Route path="/return-refund-policy" element={<InfoPage type="returns" />} />
                <Route path="/shipping-policy" element={<InfoPage type="shipping" />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
              </Routes>
            </main>
            <Footer />
            <FloatingWhatsAppButton />
          </div>
        </CartProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
