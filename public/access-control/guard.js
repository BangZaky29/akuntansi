// =========================================
// FILE: access-control/guard.js
// Page Protection Middleware
// Include this script at the TOP of protected pages
// =========================================

(function () {
    'use strict';

    // =========================================
    // CONFIGURATION - MUST MATCH verify.js
    // =========================================
    const CONFIG = {
        // Session expiry time (1 hour in milliseconds)
        SESSION_EXPIRY_MS: 60 * 60 * 1000,

        // LocalStorage key prefix
        STORAGE_KEY_PREFIX: 'ns_access_',

        // Default feature slug (can be overridden by URL param or data attribute)
        DEFAULT_FEATURE_SLUG: 'akuntansi',

        // Verification page URL (relative or absolute)
        VERIFY_URL: 'verify.html'
    };

    // =========================================
    // UTILITIES
    // =========================================

    /**
     * Get feature slug from:
     * 1. Script data attribute: <script src="guard.js" data-feature="akuntansi">
     * 2. URL param: ?feature=akuntansi
     * 3. Config default
     */
    function getFeatureSlug() {
        // Check script data attribute
        const currentScript = document.currentScript;
        if (currentScript && currentScript.dataset.feature) {
            return currentScript.dataset.feature;
        }

        // Check URL param
        const urlParams = new URLSearchParams(window.location.search);
        const featureParam = urlParams.get('feature');
        if (featureParam) {
            return featureParam;
        }

        return CONFIG.DEFAULT_FEATURE_SLUG;
    }

    /**
     * Get storage key for current feature
     */
    function getStorageKey() {
        return CONFIG.STORAGE_KEY_PREFIX + getFeatureSlug();
    }

    /**
     * Get session from localStorage
     */
    function getSession() {
        try {
            const data = localStorage.getItem(getStorageKey());
            if (!data) return null;

            const session = JSON.parse(data);

            // Check if session is expired
            if (session.expiresAt && Date.now() > session.expiresAt) {
                localStorage.removeItem(getStorageKey());
                return null;
            }

            return session;
        } catch (e) {
            localStorage.removeItem(getStorageKey());
            return null;
        }
    }

    /**
     * Check if user has valid session
     */
    function hasValidSession() {
        return getSession() !== null;
    }

    /**
     * Redirect to verification page
     */
    function redirectToVerify() {
        const featureSlug = getFeatureSlug();
        const verifyUrl = new URL(CONFIG.VERIFY_URL, window.location.href);
        verifyUrl.searchParams.set('feature', featureSlug);
        verifyUrl.searchParams.set('redirect', window.location.href);
        window.location.replace(verifyUrl.toString());
    }

    // =========================================
    // GUARD CHECK
    // =========================================

    function checkAccess() {
        if (!hasValidSession()) {
            // No valid session - redirect to verification
            redirectToVerify();
            return false;
        }
        return true;
    }

    // =========================================
    // AUTO-EXECUTE GUARD CHECK
    // =========================================

    // Check access immediately
    const hasAccess = checkAccess();

    // If no access, prevent page from rendering
    if (!hasAccess) {
        // Stop page rendering
        document.documentElement.style.display = 'none';
    }

    // =========================================
    // EXPORTS
    // =========================================
    window.NuansaGuard = {
        getSession,
        hasValidSession,
        getFeatureSlug,
        redirectToVerify,
        checkAccess,
        CONFIG
    };

})();
