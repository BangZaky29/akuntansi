// =========================================
// FILE: access-control/verify.js
// Verification Logic for Access Control
// =========================================

(function () {
    'use strict';

    // =========================================
    // CONFIGURATION - Change these as needed
    // =========================================
    const CONFIG = {
        // API endpoint for access check
        // 🔧 LOCAL: 'http://localhost:5000/api/access/check'
        // 🌐 PRODUCTION: 'https://payment.nuansasolution.id/api/access/check'
        API_URL: 'http://localhost:5000/api/access/check',

        // Payment/subscription page URL
        PAYMENT_URL: 'https://payment.nuansasolution.id/',

        // Session expiry time (1 hour in milliseconds)
        SESSION_EXPIRY_MS: 60 * 60 * 1000,

        // LocalStorage key prefix
        STORAGE_KEY_PREFIX: 'ns_access_',

        // Default feature slug (can be overridden by URL param)
        DEFAULT_FEATURE_SLUG: 'akuntansi',

        // Redirect URL after successful verification (null = current page)
        REDIRECT_URL: null
    };

    // =========================================
    // UTILITIES
    // =========================================

    /**
     * Get feature slug from URL or config
     * URL param: ?feature=akuntansi
     */
    function getFeatureSlug() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('feature') || CONFIG.DEFAULT_FEATURE_SLUG;
    }

    /**
     * Get storage key for current feature
     */
    function getStorageKey() {
        return CONFIG.STORAGE_KEY_PREFIX + getFeatureSlug();
    }

    /**
     * Normalize phone number to 62xxx format
     */
    function normalizePhone(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        } else if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }
        return cleaned;
    }

    /**
     * Show message to user
     */
    function showMessage(text, type = 'error') {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = text;
        messageBox.className = `message ${type}`;
    }

    /**
     * Hide message
     */
    function hideMessage() {
        const messageBox = document.getElementById('messageBox');
        messageBox.className = 'message';
    }

    /**
     * Set loading state
     */
    function setLoading(isLoading) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const btnLoading = document.getElementById('btnLoading');

        submitBtn.disabled = isLoading;
        btnText.textContent = isLoading ? 'Memverifikasi...' : 'Verifikasi';
        btnLoading.classList.toggle('hidden', !isLoading);
    }

    /**
     * Show subscribe button
     */
    function showSubscribeButton() {
        document.getElementById('subscribeBtn').classList.remove('hidden');
    }

    // =========================================
    // SESSION MANAGEMENT
    // =========================================

    /**
     * Save session to localStorage
     */
    function saveSession(phone, expiredAt) {
        const session = {
            phone: phone,
            feature: getFeatureSlug(),
            expiredAt: expiredAt,
            createdAt: Date.now(),
            expiresAt: Date.now() + CONFIG.SESSION_EXPIRY_MS
        };
        localStorage.setItem(getStorageKey(), JSON.stringify(session));
        return session;
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
                clearSession();
                return null;
            }

            return session;
        } catch (e) {
            clearSession();
            return null;
        }
    }

    /**
     * Clear session from localStorage
     */
    function clearSession() {
        localStorage.removeItem(getStorageKey());
    }

    /**
     * Check if user has valid session
     */
    function hasValidSession() {
        return getSession() !== null;
    }

    // =========================================
    // API CALLS
    // =========================================

    /**
     * Check access via API
     */
    async function checkAccess(phone) {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: normalizePhone(phone),
                feature_slug: getFeatureSlug()
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.json();
    }

    // =========================================
    // EVENT HANDLERS
    // =========================================

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        hideMessage();

        const phoneInput = document.getElementById('phone');
        const phone = phoneInput.value.trim();

        if (!phone || phone.length < 9) {
            showMessage('Masukkan nomor WhatsApp yang valid');
            return;
        }

        setLoading(true);

        try {
            const result = await checkAccess(phone);

            if (result.status === true) {
                // Access granted - save session and redirect
                saveSession(phone, result.expired_at);
                showMessage('Akses berhasil! Mengalihkan...', 'success');

                setTimeout(() => {
                    const redirectUrl = CONFIG.REDIRECT_URL || getMainPageUrl();
                    window.location.href = redirectUrl;
                }, 1000);
            } else {
                // Access denied
                showMessage(result.message || 'Subscription tidak aktif atau tidak ditemukan');
                showSubscribeButton();
            }
        } catch (error) {
            console.error('Verification error:', error);
            showMessage('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Get main page URL (remove verify.html from path)
     */
    function getMainPageUrl() {
        const currentUrl = window.location.href;
        return currentUrl.replace(/\/verify\.html.*$/, '/index.html');
    }

    /**
     * Redirect to payment page
     */
    window.redirectToPayment = function () {
        window.location.href = CONFIG.PAYMENT_URL;
    };

    // =========================================
    // INITIALIZATION
    // =========================================

    function init() {
        // Update feature badge
        const featureBadge = document.getElementById('featureBadge');
        const featureSlug = getFeatureSlug();
        featureBadge.textContent = featureSlug.replace(/-/g, ' ').toUpperCase();

        // Check if already has valid session
        if (hasValidSession()) {
            const session = getSession();
            showMessage(`Sudah terverifikasi sebagai ${session.phone}`, 'success');

            setTimeout(() => {
                const redirectUrl = CONFIG.REDIRECT_URL || getMainPageUrl();
                window.location.href = redirectUrl;
            }, 1500);
            return;
        }

        // Attach form handler
        const form = document.getElementById('verifyForm');
        form.addEventListener('submit', handleSubmit);

        // Phone input - numbers only
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', function (e) {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // =========================================
    // EXPORTS (for guard.js)
    // =========================================
    window.NuansaAccess = {
        getSession,
        hasValidSession,
        clearSession,
        getFeatureSlug,
        CONFIG
    };

})();
