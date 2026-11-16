import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPkr, getDiscountPercent, getEffectivePrice } from '../lib/pkr';
import { Product } from '../types/store';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercent(product);
  const inStock = product.is_available && product.stock_quantity > 0;
  const primaryImage = product.images[0] || '/images/img_cat_electronics.jpg';

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition flex flex-col">
      <Link to={`/product/${product.slug || product.id}`} className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-orange-accent text-white text-xs font-bold">
            -{discountPct}%
          </span>
        )}
        {!inStock && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">
            OUT OF STOCK
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {product.category_name}
        </div>
        <Link
          to={`/product/${product.slug || product.id}`}
          className="font-semibold text-navy mt-1 line-clamp-2 hover:text-orange-accent"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-lg text-navy">
              {formatPkr(effectivePrice)}
            </span>
            {discountPct > 0 && (
              <span className="text-xs text-gray-400 line-through">
                {formatPkr(product.regular_price_pkr)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!inStock}
            onClick={() => addToCart(product.id, 1)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light disabled:bg-gray-200 disabled:text-gray-500 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
