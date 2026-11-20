import { Env } from './types';
import {
  getAdminSetupStatus,
  handleAdminLogin,
  handleAdminLogout,
  handleFirstAdminSetup,
  requireAdmin
} from './lib/auth';
import { errorResponse, jsonResponse } from './lib/http';
import {
  handleAdminAddReview,
  handleAdminAnalytics,
  handleAdminDeleteCategory,
  handleAdminDeleteProduct,
  handleAdminDeleteReview,
  handleAdminGetOrder,
  handleAdminGetPriceAlerts,
  handleAdminListOrders,
  handleAdminListReviews,
  handleAdminMarkPriceAlertSent,
  handleAdminModerateReview,
  handleAdminSaveCategory,
  handleAdminSaveProduct,
  handleAdminSaveSettings,
  handleAdminUpdateOrderStatus,
  handleAdminUploadImage
} from './routes/admin';
import { handleCustomerCancelOrder, handlePlaceCodOrder } from './routes/orders';
import {
  handleGetProduct,
  handleGetStorefront,
  handleListProducts,
  handleServeR2Image,
  handleSubmitProductReview,
  handleSubscribePriceDrop,
  handleTrackOrder
} from './routes/public';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    try {
      // --- Public API Routes ---
      if (method === 'GET' && path === '/api/health') {
        return jsonResponse({ ok: true, service: 'expensive-store', environment: env.ENVIRONMENT });
      }
      if (method === 'GET' && path === '/api/storefront') {
        return await handleGetStorefront(env);
      }
      if (method === 'GET' && path === '/api/products') {
        return await handleListProducts(request, env);
      }
      if (
        method === 'POST' &&
        path.startsWith('/api/products/') &&
        path.endsWith('/reviews')
      ) {
        const slugOrId = decodeURIComponent(
          path.slice('/api/products/'.length, -'/reviews'.length)
        );
        return await handleSubmitProductReview(slugOrId, request, env);
      }
      if (method === 'GET' && path.startsWith('/api/products/')) {
        const slugOrId = decodeURIComponent(path.slice('/api/products/'.length));
        return await handleGetProduct(slugOrId, env);
      }
      if (method === 'POST' && path === '/api/orders') {
        return await handlePlaceCodOrder(request, env);
      }
      if (method === 'POST' && path === '/api/orders/track') {
        return await handleTrackOrder(request, env);
      }
      if (method === 'POST' && path === '/api/orders/cancel') {
        return await handleCustomerCancelOrder(request, env);
      }
      if (method === 'POST' && path === '/api/price-alerts') {
        return await handleSubscribePriceDrop(request, env);
      }
      if (method === 'GET' && path.startsWith('/api/images/')) {
        const key = path.slice('/api/images/'.length);
        return await handleServeR2Image(key, env);
      }

      // --- Admin Auth Routes ---
      if (method === 'GET' && path === '/api/admin/setup-status') {
        return await getAdminSetupStatus(env);
      }
      if (method === 'POST' && path === '/api/admin/setup') {
        return await handleFirstAdminSetup(request, env);
      }
      if (method === 'POST' && path === '/api/admin/login') {
        return await handleAdminLogin(request, env);
      }
      if (method === 'POST' && path === '/api/admin/logout') {
        return await handleAdminLogout(request, env);
      }
      if (method === 'GET' && path === '/api/admin/me') {
        const auth = await requireAdmin(request, env, false);
        if (!auth.ok) return auth.response;
        return jsonResponse({
          admin: {
            id: auth.session.adminId,
            username: auth.session.username,
            role: auth.session.role
          },
          csrfToken: auth.session.csrfToken
        });
      }

      // --- Protected Admin API Routes ---
      if (path.startsWith('/api/admin/')) {
        const requiresCsrf = method !== 'GET' && method !== 'HEAD';
        const auth = await requireAdmin(request, env, requiresCsrf);
        if (!auth.ok) return auth.response;

        if (method === 'GET' && path === '/api/admin/analytics') {
          return await handleAdminAnalytics(env);
        }
        if (method === 'POST' && path === '/api/admin/categories') {
          return await handleAdminSaveCategory(request, env);
        }
        if (method === 'DELETE' && path.startsWith('/api/admin/categories/')) {
          const id = decodeURIComponent(path.slice('/api/admin/categories/'.length));
          return await handleAdminDeleteCategory(id, env);
        }
        if (method === 'POST' && path === '/api/admin/products') {
          return await handleAdminSaveProduct(request, env);
        }
        if (method === 'DELETE' && path.startsWith('/api/admin/products/')) {
          const id = decodeURIComponent(path.slice('/api/admin/products/'.length));
          return await handleAdminDeleteProduct(id, env);
        }
        if (method === 'POST' && path === '/api/admin/upload') {
          return await handleAdminUploadImage(request, env);
        }
        if (method === 'GET' && path === '/api/admin/orders') {
          return await handleAdminListOrders(request, env);
        }
        if (method === 'GET' && path.startsWith('/api/admin/orders/')) {
          const orderNumber = decodeURIComponent(path.slice('/api/admin/orders/'.length));
          return await handleAdminGetOrder(orderNumber, env);
        }
        if (
          method === 'PATCH' &&
          path.startsWith('/api/admin/orders/') &&
          path.endsWith('/status')
        ) {
          const orderNumber = decodeURIComponent(
            path.slice('/api/admin/orders/'.length, -'/status'.length)
          );
          return await handleAdminUpdateOrderStatus(orderNumber, request, env);
        }
        if (method === 'PUT' && path === '/api/admin/settings') {
          return await handleAdminSaveSettings(request, env);
        }
        if (method === 'GET' && path === '/api/admin/reviews') {
          return await handleAdminListReviews(request, env);
        }
        if (method === 'POST' && path === '/api/admin/reviews') {
          return await handleAdminAddReview(request, env);
        }
        if (
          method === 'PATCH' &&
          path.startsWith('/api/admin/reviews/') &&
          path.endsWith('/moderate')
        ) {
          const id = decodeURIComponent(
            path.slice('/api/admin/reviews/'.length, -'/moderate'.length)
          );
          return await handleAdminModerateReview(id, request, env);
        }
        if (method === 'DELETE' && path.startsWith('/api/admin/reviews/')) {
          const id = decodeURIComponent(path.slice('/api/admin/reviews/'.length));
          return await handleAdminDeleteReview(id, env);
        }
        if (method === 'GET' && path === '/api/admin/price-alerts') {
          return await handleAdminGetPriceAlerts(env);
        }
        if (
          method === 'PATCH' &&
          path.startsWith('/api/admin/price-alerts/') &&
          path.endsWith('/sent')
        ) {
          const id = decodeURIComponent(
            path.slice('/api/admin/price-alerts/'.length, -'/sent'.length)
          );
          return await handleAdminMarkPriceAlertSent(id, env);
        }

        return errorResponse('Admin endpoint not found.', 404);
      }

      // --- Static Assets & SPA Routing Fallback ---
      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }
      return errorResponse('Not found.', 404);
    } catch (err) {
      return errorResponse('Internal server error.', 500);
    }
  }
};
