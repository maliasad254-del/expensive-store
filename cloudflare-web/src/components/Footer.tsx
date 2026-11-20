import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Mail } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/pkr';

export function Footer() {
  const { settings } = useStore();
  const waUrl = settings?.whatsapp_number
    ? buildWhatsAppUrl(
        settings.whatsapp_number,
        `Assalam-o-Alaikum ${settings.store_name}, I have a question.`
      )
    : null;

  return (
    <footer className="bg-navy text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-display text-xl font-bold">{settings?.store_name || 'Expensive Store'}</h3>
          <p className="text-orange-accent text-sm font-medium mt-1">
            {settings?.tagline || 'Shop Smart, Pay Less.'}
          </p>
          <p className="text-sm text-gray-300 mt-3">
            Nationwide Cash on Delivery across Pakistan in PKR.
          </p>
          {settings?.store_address && (
            <p className="text-xs text-gray-400 mt-2">{settings.store_address}</p>
          )}
          {settings?.registration_details && (
            <p className="text-xs text-gray-400 mt-1">{settings.registration_details}</p>
          )}
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-gray-200">
            <li><Link to="/shop" className="hover:text-orange-accent">Shop All</Link></li>
            <li><Link to="/categories" className="hover:text-orange-accent">Categories</Link></li>
            <li><Link to="/search" className="hover:text-orange-accent">Search Products</Link></li>
            <li><Link to="/track-order" className="hover:text-orange-accent">Track Order</Link></li>
            <li><Link to="/my-orders" className="hover:text-orange-accent">My Orders</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Customer Care</h4>
          <ul className="space-y-2 text-sm text-gray-200">
            <li><Link to="/about" className="hover:text-orange-accent">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-orange-accent">Contact Us</Link></li>
            <li><Link to="/faq" className="hover:text-orange-accent">FAQ</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-orange-accent">Shipping Policy</Link></li>
            <li><Link to="/return-refund-policy" className="hover:text-orange-accent">Return & Refund Policy</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-orange-accent">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Contact & Support</h4>
          <div className="space-y-3">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold w-full justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </a>
            )}
            {settings?.support_phone && (
              <a href={`tel:${settings.support_phone}`} className="flex items-center gap-2 text-sm text-gray-200 hover:text-orange-accent">
                <Phone className="w-4 h-4" />
                {settings.support_phone}
              </a>
            )}
            {settings?.support_email && (
              <a href={`mailto:${settings.support_email}`} className="flex items-center gap-2 text-sm text-gray-200 hover:text-orange-accent break-all">
                <Mail className="w-4 h-4" />
                {settings.support_email}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 px-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {settings?.store_name || 'Expensive Store'}. Cash on Delivery Only (PKR).
      </div>
    </footer>
  );
}
