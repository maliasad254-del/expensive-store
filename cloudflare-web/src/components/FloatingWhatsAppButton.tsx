import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/pkr';

export function FloatingWhatsAppButton() {
  const { settings } = useStore();
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const rawNumber = settings ? settings.whatsapp_number : '03037626960';
  if (!rawNumber || !rawNumber.trim()) {
    return null;
  }

  const waUrl = buildWhatsAppUrl(
    rawNumber,
    `Assalam-o-Alaikum ${settings?.store_name || 'Expensive Store'}, I need assistance.`
  );
  if (!waUrl) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 group">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/40 animate-whatsapp-pulse group-hover:animate-none"
      />
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Chat on WhatsApp (${rawNumber})`}
        title="Chat on WhatsApp"
        className="relative inline-flex items-center gap-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-3.5 shadow-lg shadow-emerald-900/25 transition-all"
      >
        <MessageCircle className="w-6 h-6 shrink-0" />
        <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
      </a>
    </div>
  );
}
