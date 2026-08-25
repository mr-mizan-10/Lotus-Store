/**
 * Lotus Store - Central Frontend Configuration
 *
 * This file centralizes the backend API URL for the entire application.
 *
 * INSTRUCTIONS FOR DEPLOYMENT:
 * 1. Local Development (Live Server / localhost):
 *    - Automatically points to 'http://localhost:5000' when running on localhost or 127.0.0.1.
 * 
 * 2. Production (e.g. Vercel, Netlify, Custom Domain):
 *    - After deploying your backend to Render / Railway, copy your backend URL and replace
 *      'https://YOUR-BACKEND-URL.onrender.com' in the PRODUCTION_API_URL setting below.
 *      Example: 'https://lotus-store-api.onrender.com'
 */

(function (window) {
  'use strict';

  const CONFIG = {
    // =========================================================================
    // PRODUCTION BACKEND URL PLACEHOLDER
    // Replace this string with your live Render backend URL after deployment
    // Example: 'https://lotus-store-api.onrender.com'
    // =========================================================================
    PRODUCTION_API_URL: 'https://YOUR-BACKEND-URL.onrender.com',

    // Local development backend URL
    LOCAL_API_URL: 'http://localhost:5000',

    /**
     * Resolves the active backend API root URL.
     * Checks if current page is running locally vs deployed on cloud.
     */
    getApiBaseUrl: function () {
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname || '';
        // If loaded via Live Server or local host
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
          return this.LOCAL_API_URL;
        }
      }
      return this.PRODUCTION_API_URL;
    }
  };

  // Expose configuration globally
  window.LOTUS_CONFIG = CONFIG;
  window.API_BASE_URL = CONFIG.getApiBaseUrl();
  window.API_ROOT = window.API_BASE_URL;

})(typeof window !== 'undefined' ? window : this);
