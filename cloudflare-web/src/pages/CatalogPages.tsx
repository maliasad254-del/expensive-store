import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  Bolt,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { formatPkr, getDiscountPercent, getEffectivePrice } from '../lib/pkr';
import { Product, ProductReviewStats, Review } from '../types/store';

export function ShopAllPage() {
  const { categories, products: allProducts } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'featured';
  const [products, setProducts] = useState<Product[]>(allProducts);

  useEffect(() => {
    api
      .listProducts({ category: selectedCategory, sort })
      .then((res) => setProducts(res.products))
      .catch(() => setProducts(allProducts));
  }, [selectedCategory, sort, allProducts]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Shop All Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} products • Cash on Delivery across Pakistan</p>
        </div>

        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-navy"
        >
          <option value="featured">Featured</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="newest">Newest Arrivals</option>
        </select>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateParam('category', '')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
            !selectedCategory
              ? 'bg-navy text-white border-navy'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => updateParam('category', c.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              selectedCategory === c.id
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { categories, products } = useStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-navy">Product Categories</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          return (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.id)}`}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              <img src={cat.image_url} alt={cat.name} className="w-full h-48 object-cover" />
              <div className="p-5">
                <span className="text-xs font-bold text-orange-accent uppercase">{count} Products</span>
                <h2 className="font-display text-xl font-bold text-navy mt-1">{cat.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .listProducts({ q: initialQ })
      .then((res) => setResults(res.products))
      .finally(() => setLoading(false));
  }, [initialQ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-navy">Search Products</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, SKU, or specs..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-gray-500 text-sm">Searching catalog...</div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
          No products matched "{initialQ}".
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetailPage() {
  const { slugOrId } = useParams();
  const navigate = useNavigate();
  const { settings } = useStore();
  const { addToCart, clearCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats>({ averageRating: 0, reviewCount: 0 });
  const [activeImg, setActiveImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showPriceAlertForm, setShowPriceAlertForm] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewOrderNumber, setReviewOrderNumber] = useState('');
  const [reviewMobile, setReviewMobile] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    setShowPriceAlertForm(false);
    setAlertSuccess(null);
    setAlertError(null);
    setShowReviewForm(false);
    setReviewError(null);
    setReviewSuccess(null);
    api
      .getProduct(slugOrId)
      .then((res) => {
        setProduct(res.product);
        setRelated(res.related);
        setProductReviews(res.reviews ?? []);
        setReviewStats(res.reviewStats ?? { averageRating: 0, reviewCount: 0 });
        setActiveImg(0);
        setQuantity(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">Loading product...</div>;
  }
  if (!product) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">Product not found.</div>;
  }

  const effective = getEffectivePrice(product);
  const discountPct = getDiscountPercent(product);
  const inStock = product.is_available && product.stock_quantity > 0;
  const images = product.images.length > 0 ? product.images : ['/images/img_cat_electronics.jpg'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl bg-gray-100 overflow-hidden border border-gray-200">
            <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImg(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 ${
                    activeImg === idx ? 'border-orange-accent' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>{product.category_name} • SKU: {product.sku}</span>
            <span className={inStock ? 'text-emerald-600' : 'text-red-600'}>
              {inStock ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold text-navy">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-navy">{formatPkr(effective)}</span>
            {discountPct > 0 && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPkr(product.regular_price_pkr)}</span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-accent text-white text-xs font-bold">
                  SAVE {discountPct}%
                </span>
              </>
            )}
          </div>

          <div className="rounded-xl bg-orange-soft border border-orange-accent/25 p-3.5 flex items-center gap-3 text-sm text-navy">
            <Truck className="w-5 h-5 text-orange-accent shrink-0" />
            <span>
              <span className="block font-semibold">Delivery: {formatPkr(settings?.delivery_charge_pkr ?? 250)}</span>
              <span className="block">Free delivery on orders of {formatPkr(settings?.free_delivery_threshold_pkr ?? 5000)} or more.</span>
              <span className="block font-semibold text-green-700">Cash on Delivery • No Extra COD Charges</span>
              <span className="block">Estimated Delivery: 3–7 Days</span>
            </span>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-navy">Quantity</span>
            <div className="inline-flex items-center border border-gray-200 rounded-xl bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2.5 text-navy hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-semibold text-navy">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                className="p-2.5 text-navy hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => addToCart(product.id, quantity)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-navy text-navy font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
            <button
              type="button"
              disabled={!inStock}
              onClick={() => {
                clearCart();
                addToCart(product.id, quantity);
                navigate('/checkout');
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold disabled:opacity-50"
            >
              <Bolt className="w-4 h-4" />
              Buy Now (COD)
            </button>
          </div>

          {/* Notify Me on Price Drop */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setShowPriceAlertForm((prev) => !prev);
                setAlertError(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white text-navy font-semibold text-sm hover:bg-gray-50 transition"
            >
              <BellRing className="w-4 h-4 text-orange-accent" />
              Notify Me on Price Drop
            </button>

            {showPriceAlertForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAlertError(null);
                  setAlertSuccess(null);
                  setAlertSubmitting(true);
                  try {
                    const res = await api.subscribePriceDrop(product.id, alertEmail);
                    setAlertSuccess(
                      `Subscribed ${res.subscription.email} for price drops below ${formatPkr(res.subscription.subscribedPricePkr)} (Product ID: ${res.subscription.productId}).`
                    );
                    setAlertEmail('');
                  } catch (err) {
                    setAlertError(
                      err instanceof Error ? err.message : 'Could not save price drop alert.'
                    );
                  } finally {
                    setAlertSubmitting(false);
                  }
                }}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
              >
                <div className="text-xs text-gray-600">
                  We will track <span className="font-semibold text-navy">{product.name}</span>{' '}
                  (current price: <span className="font-semibold text-navy">{formatPkr(effective)}</span>) and send an alert when the price drops.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-navy"
                  />
                  <button
                    type="submit"
                    disabled={alertSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white font-semibold text-sm disabled:opacity-50"
                  >
                    {alertSubmitting ? 'Saving...' : 'Alert Me'}
                  </button>
                </div>
                {alertError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    {alertError}
                  </div>
                )}
                {alertSuccess && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{alertSuccess}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-3">
            <h2 className="font-semibold text-navy">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            {product.specifications && (
              <>
                <h2 className="font-semibold text-navy pt-2">Specifications</h2>
                <div className="rounded-xl bg-gray-100 p-4 text-sm text-navy whitespace-pre-line">
                  {product.specifications}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">Customer Reviews</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(reviewStats.averageRating)
                        ? 'fill-orange-accent text-orange-accent'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-navy">
                {reviewStats.reviewCount > 0 ? `${reviewStats.averageRating} / 5.0` : 'No reviews yet'}
              </span>
              <span>• {reviewStats.reviewCount} verified {reviewStats.reviewCount === 1 ? 'review' : 'reviews'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowReviewForm((prev) => !prev);
              setReviewError(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white text-sm font-semibold transition"
          >
            <Star className="w-4 h-4 text-orange-accent fill-orange-accent" />
            {showReviewForm ? 'Close Review Form' : 'Write a Review'}
          </button>
        </div>

        {reviewSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{reviewSuccess}</span>
          </div>
        )}

        {showReviewForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setReviewError(null);
              setReviewSuccess(null);
              setReviewSubmitting(true);
              try {
                await api.submitProductReview(product.id, {
                  orderNumber: reviewOrderNumber,
                  mobileNumber: reviewMobile,
                  rating: reviewRating,
                  comment: reviewComment
                });
                setReviewSuccess(
                  'Thank you! Your verified review has been submitted and is awaiting admin moderation.'
                );
                setReviewOrderNumber('');
                setReviewMobile('');
                setReviewRating(5);
                setReviewComment('');
                setShowReviewForm(false);
              } catch (err) {
                setReviewError(
                  err instanceof Error ? err.message : 'Unable to submit review.'
                );
              } finally {
                setReviewSubmitting(false);
              }
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4"
          >
            <div className="text-xs text-gray-600">
              Verified buyers can rate and review this product using their Order ID and registered Pakistani mobile number.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={reviewOrderNumber}
                onChange={(e) => setReviewOrderNumber(e.target.value)}
                placeholder="Order ID (e.g. EXP-20261115-1234)"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-navy"
              />
              <input
                type="tel"
                required
                value={reviewMobile}
                onChange={(e) => setReviewMobile(e.target.value)}
                placeholder="Order Mobile Number (03XXXXXXXXX)"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-navy"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-navy">Your Rating</div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} out of 5 stars`}
                    onClick={() => setReviewRating(star)}
                    className="p-1.5 rounded-lg hover:bg-white transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? 'fill-orange-accent text-orange-accent'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold text-gray-600">
                  {reviewRating} / 5
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <textarea
                required
                minLength={5}
                maxLength={500}
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this product (short review, max 500 chars)..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-navy"
              />
              <div className="text-[11px] text-gray-500 text-right">
                {reviewComment.length} / 500
              </div>
            </div>

            {reviewError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {reviewError}
              </div>
            )}

            <button
              type="submit"
              disabled={reviewSubmitting}
              className="px-6 py-2.5 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm disabled:opacity-50"
            >
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {productReviews.length === 0 ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-sm text-gray-500">
            No approved reviews for this product yet. Purchased this item? Leave the first verified review above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productReviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-gray-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating
                            ? 'fill-orange-accent text-orange-accent'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.verified_purchase && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">"{rev.comment}"</p>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span className="font-semibold text-navy">
                    {rev.customer_name}
                    {rev.city ? ` • ${rev.city}` : ''}
                  </span>
                  <span>{new Date(rev.created_at).toLocaleDateString('en-PK')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-navy mb-5">Related Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
