import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, ShieldCheck, Star, Tag } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl, LABELS } from '../lib/pkr';

export function HomePage() {
  const { settings, categories, products, reviews, loading, error, language } = useStore();
  const t = LABELS[language];

  if (loading && products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading Expensive Store...
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
          {error}
        </div>
      </div>
    );
  }

  const featuredCategories = categories.filter((c) => c.is_featured === 1);
  const bestSellers = products.filter((p) => p.is_best_seller);
  const newArrivals = products.filter((p) => p.is_new_arrival);
  const specialOffers = products.filter(
    (p) =>
      !p.is_best_seller &&
      (p.is_on_sale ||
        (p.discount_price_pkr && p.discount_price_pkr < p.regular_price_pkr))
  );
  const whyShop = (settings?.why_shop_items || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const waUrl = settings?.whatsapp_number
    ? buildWhatsAppUrl(
        settings.whatsapp_number,
        `Assalam-o-Alaikum ${settings.store_name}, I need assistance.`
      )
    : null;

  return (
    <div className="space-y-14">
      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="relative rounded-3xl overflow-hidden bg-navy text-white min-h-[360px] flex items-center">
          <img
            src="/images/img_hero_banner.jpg"
            alt="Expensive Store Showcase"
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy/85 to-transparent" />
          <div className="relative z-10 max-w-2xl p-8 sm:p-12 space-y-5">
            <span className="inline-block px-3 py-1 rounded-full bg-orange-accent text-xs font-bold tracking-wide uppercase">
              {settings?.hero_offer_badge || 'CASH ON DELIVERY • PAKISTAN'}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              {settings?.hero_title || 'Smart Choices. Everyday Value.'}
            </h1>
            <p className="text-gray-200 text-sm sm:text-base max-w-xl">
              {settings?.hero_subtitle}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/shop"
                className="px-6 py-3 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm transition"
              >
                {t.shopNow}
              </Link>
              <Link
                to="/track-order"
                className="px-6 py-3 rounded-xl border border-white/40 hover:bg-white/10 text-white font-semibold text-sm transition"
              >
                {t.trackOrder}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-navy">{t.featuredCategories}</h2>
          <Link to="/categories" className="text-sm font-semibold text-orange-accent hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {featuredCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.id)}`}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-lg text-navy">{cat.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Selling Products */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-navy">{t.bestSellers}</h2>
            <Link to="/shop" className="text-sm font-semibold text-orange-accent hover:underline">
              Shop All
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Promotional Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-orange-soft border border-orange-accent/25 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-accent text-white flex items-center justify-center shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-navy">
                {settings?.promo_banner_title || 'Nationwide Cash on Delivery'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {settings?.promo_banner_subtitle}
              </p>
            </div>
          </div>
          <Link
            to="/shop"
            className="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light shrink-0"
          >
            Browse Deals
          </Link>
        </div>
      </section>

      {/* Special Offers */}
      {specialOffers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-navy">{t.specialOffers}</h2>
            <Link to="/shop" className="text-sm font-semibold text-orange-accent hover:underline">
              All Offers
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {specialOffers.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-navy">{t.newArrivals}</h2>
            <Link to="/shop?sort=newest" className="text-sm font-semibold text-orange-accent hover:underline">
              View Newest
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Why Shop With Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy mb-6">Why Shop With Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {whyShop.map((reason) => (
            <div
              key={reason}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-orange-accent shrink-0" />
              <span className="font-medium text-sm text-navy">{reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Genuine Customer Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy mb-6">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <div className="bg-gray-100 rounded-2xl p-6 flex items-center gap-3 text-sm text-gray-600">
            <ShieldCheck className="w-5 h-5 text-navy shrink-0" />
            Verified customer reviews added through Admin Settings will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <div className="flex gap-1">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-orange-accent text-orange-accent" />
                  ))}
                </div>
                <p className="text-sm text-gray-700">"{rev.comment}"</p>
                <div className="text-xs font-semibold text-gray-500">
                  {rev.customer_name} {rev.city ? `• ${rev.city}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WhatsApp Support Banner */}
      {waUrl && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-navy">Need Help on WhatsApp?</h3>
              <p className="text-sm text-gray-600">
                Message our support desk directly for Cash on Delivery order assistance.
              </p>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
