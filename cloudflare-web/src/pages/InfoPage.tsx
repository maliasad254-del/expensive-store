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
  const title = TITLES[type];

  const waUrl = settings?.whatsapp_number
    ? buildWhatsAppUrl(settings.whatsapp_number, `Assalam-o-Alaikum ${settings.store_name}, I need support.`)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>

        {type === 'about' && (
          <div className="space-y-3 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
            <p>{settings?.about_us_text}</p>
            {settings?.registration_details && (
              <p className="font-semibold text-navy">Registration: {settings.registration_details}</p>
            )}
          </div>
        )}

        {type === 'contact' && (
          <div className="space-y-3 text-sm text-gray-700">
            {!settings?.support_phone && !settings?.support_email && !settings?.whatsapp_number && !settings?.store_address ? (
              <p className="text-gray-500">
                Business contact details are managed in Admin Dashboard → Settings.
              </p>
            ) : (
              <>
                {settings?.support_phone && <p><strong>Phone:</strong> {settings.support_phone}</p>}
                {settings?.support_email && <p><strong>Email:</strong> {settings.support_email}</p>}
                {settings?.store_address && <p><strong>Address:</strong> {settings.store_address}</p>}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold"
                  >
                    Message on WhatsApp ({settings?.whatsapp_number})
                  </a>
                )}
              </>
            )}
          </div>
        )}

        {type === 'faq' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.faq_text}</p>}
        {type === 'privacy' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.privacy_policy_text}</p>}
        {type === 'returns' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.return_policy_text}</p>}
        {type === 'shipping' && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{settings?.shipping_policy_text}</p>}
      </div>
    </div>
  );
}
