import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/pkr';

type InfoSlug = 'about' | 'contact' | 'faq' | 'privacy' | 'returns' | 'shipping';

const TITLES: Record<InfoSlug, string> = {
  about: 'About Us',
  contact: 'Contact Us',
  faq: 'Frequently Asked Questions',
  privacy: 'Privacy Policy',
  returns: 'Return & Refund Policy',
  shipping: 'Shipping Policy'
};

export function InfoPage({ type }: { type: InfoSlug }) {
  const { settings } = useStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const title = TITLES[type];

  const faqItems = (settings?.faq_text || '').split(/\r?\n/).reduce<Array<{ question: string; answer: string }>>((items, line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('Q:')) {
      items.push({ question: trimmed.slice(2).trim(), answer: '' });
    } else if (trimmed.startsWith('A:') && items.length > 0) {
      items[items.length - 1].answer = trimmed.slice(2).trim();
    } else if (trimmed && items.length > 0) {
      items[items.length - 1].answer += (items[items.length - 1].answer ? '\n' : '') + trimmed;
    }
    return items;
  }, []);

  const waUrl = settings?.whatsapp_number
    ? buildWhatsAppUrl(settings.whatsapp_number, `Assalam-o-Alaikum ${settings.store_name}, I need support.`)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>

        {type === 'about' && (
          <div className="space-y-6 text-sm leading-relaxed">
            <p className="text-gray-600 whitespace-pre-line">
              {settings?.about_us_text || 'Expensive Store is a Pakistani online shopping store offering carefully selected products for everyday needs.'}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-navy mb-1">Our Products</h3>
                <p className="text-gray-600">Explore electronics, watches, and lifestyle essentials in one place.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-navy mb-1">Nationwide Delivery</h3>
                <p className="text-gray-600">Shop from anywhere in Pakistan with Cash on Delivery.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-navy mb-1">Customer Focus</h3>
                <p className="text-gray-600">We aim to make your online shopping experience simple and convenient.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-navy mb-1">WhatsApp Support</h3>
                <p className="text-gray-600">Have a question? Reach out to us through WhatsApp.</p>
              </div>
            </div>

            {settings?.registration_details && (
              <p className="font-semibold text-navy">Registration: {settings.registration_details}</p>
            )}
          </div>
        )}

        {type === 'contact' && (
          <div className="space-y-5 text-sm text-gray-700">
            <p className="text-gray-600 leading-relaxed">
              Have a question about an order or product? Contact our support team.
              We're happy to help you.
            </p>

            <div className="space-y-4">
              {settings?.support_phone && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Phone Support</p>
                  <a href={`tel:${settings.support_phone}`} className="font-medium text-navy hover:text-orange-accent">
                    {settings.support_phone}
                  </a>
                </div>
              )}

              {settings?.support_email && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Email Support</p>
                  <a href={`mailto:${settings.support_email}`} className="font-medium text-navy hover:text-orange-accent break-all">
                    {settings.support_email}
                  </a>
                </div>
              )}

              {settings?.store_address && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Address</p>
                  <p>{settings.store_address}</p>
                </div>
              )}

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Contact us on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div className="space-y-3">
            {faqItems.length > 0 ? faqItems.map((item, index) => (
              <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  aria-expanded={openFaqIndex === index}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left font-semibold text-navy hover:bg-gray-50"
                >
                  <span>{item.question}</span>
                  <span className="text-xl text-orange-accent">{openFaqIndex === index ? '−' : '+'}</span>
                </button>
                {openFaqIndex === index && (
                  <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </div>
                )}
              </div>
            )) : (
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {settings?.faq_text || 'Frequently asked questions will be available here soon.'}
              </p>
            )}
          </div>
        )}
        {type === 'privacy' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.privacy_policy_text}</p>}
        {type === 'returns' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.return_policy_text}</p>}
        {type === 'shipping' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.shipping_policy_text}</p>}
      </div>
    </div>
  );
}
