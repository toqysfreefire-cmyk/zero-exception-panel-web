/* ============================================================
   ZERO EXCEPTION - ADMIN CONSOLE LOGIC & VERCEL SYNC ENGINE
   ============================================================ */

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
if (typeof window !== 'undefined') window.escapeHtml = escapeHtml;

document.addEventListener('DOMContentLoaded', () => {

    // Default Credentials
    const DEFAULT_ADMIN_EMAIL = 'tgsgaming2024@gmail.com';
    const DEFAULT_ADMIN_PASS = 'Sweet+candy2026';

    // BroadcastChannel for instant zero-latency cross-tab sync
    let syncChannel = null;
    try {
        syncChannel = new BroadcastChannel('zero_exception_sync');
    } catch(e) {
        console.warn('BroadcastChannel not supported in this browser environment.');
    }

    // State Variables
    let products = [];
    let settings = {
        storeName: "ZERO EXCEPTION",
        storeTagline: "Fast, Trusted 24/7 Digital Game Key Store",
        noticeText: "⚡ 24/7 AUTOMATED DELIVERY: Instant License Delivery via WhatsApp & Telegram within 30 Seconds. Safe, Verified, Anti-Ban!",
        noticeEnabled: true,
        popupEnabled: false,
        popupTitle: "VIP SPECIAL ANNOUNCEMENT",
        popupMessage: "Welcome to ZERO EXCEPTION! All panel keys are 100% updated and online. Contact WhatsApp for bulk reseller discounts.",
        whatsappNumber: "8801727400370",
        whatsappText: "Hello ZERO EXCEPTION, I need help with panel keys.",
        telegramUrl: "https://t.me/+nE1pT80-i6oyOGU1/",
        paymentMethods: {
            bkash: { name: "bKash Personal", number: "01718404195", active: true, type: "Personal" },
            nagad: { name: "Nagad Personal", number: "01718404195", active: true, type: "Personal" },
            rocket: { name: "Rocket Personal", number: "01718404195", active: true, type: "Personal" },
            upay: { name: "Upay Personal", number: "01718404195", active: true, type: "Personal" },
            binance: { name: "Binance USDT (TRC20)", number: "TP8B9j6s5... / Pay ID: 12345678", active: true, type: "Crypto" }
        },
        currencyRates: {
            BDT: { symbol: "৳", rate: 1, name: "BDT" },
            INR: { symbol: "₹", rate: 0.70, name: "INR" },
            NPR: { symbol: "Rs", rate: 1.12, name: "NPR" },
            PKR: { symbol: "Rs", rate: 2.32, name: "PKR" }
        },
        cloudSync: {
            autoSync: false
        }
    };

    let activeCategoryFilter = 'all';
    let searchQuery = '';

    // Available project images for quick selection
    const PRESET_IMAGES = [
        '/images/drip_client_non_root.png',
        '/images/alpha_non_root.png',
        '/images/aim_hack_non_root_ios.png',
        '/images/bala_mod_non_root.png',
        '/images/non_root_pato.png',
        '/images/abcd_mod_non_root.png',
        '/images/xreg_non_root.png',
        '/images/crack_master.png',
        '/images/drip_client_ff_proxy.png',
        '/images/dolphin_root_only.png',
        '/images/angry_mod_root_only.png',
        '/images/drip_client_root_only.png',
        '/images/drip_wire_external.png',
        '/images/migul_pro_aim_kill.png',
        '/images/gbox_esign.png',
        '/images/br_mods_pc.png',
        '/images/zolo_pubg.png',
        '/images/carrom.png',
        '/images/jitu.jpg',
        '/images/logo.jpg'
    ];

    // Category names mapping
    const CATEGORY_NAMES = {
        'non-root': 'Free Fire NON ROOT',
        'root': 'FREE FIRE ROOT',
        'accounts': 'Free Fire Accounts',
        'ios': 'FREE FIRE IOS',
        'pc': 'FREE FIRE PC',
        'pubg': 'PUBG MOBILE',
        'demo': 'DEMO / TOOLS',
        'other': 'OTHER'
    };

    // ============================================================
    // DOM ELEMENTS
    // ============================================================
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const loginErrorMsg = document.getElementById('loginErrorMsg');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const rememberMe = document.getElementById('rememberMe');

    const adminApp = document.getElementById('adminApp');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const admSidebar = document.getElementById('admSidebar');
    const topbarTitle = document.getElementById('topbarTitle');
    const toastContainer = document.getElementById('toastContainer');
    const syncStatusBadge = document.getElementById('syncStatusBadge');
    const syncStatusText = document.getElementById('syncStatusText');
    const quickSyncBtn = document.getElementById('quickSyncBtn');
    const quickAddProductBtn = document.getElementById('quickAddProductBtn');

    // Stats
    const statTotalProducts = document.getElementById('statTotalProducts');
    const statTotalCategories = document.getElementById('statTotalCategories');
    const statActivePayments = document.getElementById('statActivePayments');
    const statNetlifyMode = document.getElementById('statNetlifyMode');

    // Navigation Tabs
    const navButtons = document.querySelectorAll('.sidebar-nav .nav-link-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Tab 1: Products
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const categoryChipsContainer = document.getElementById('categoryChipsContainer');
    const productsCardsGrid = document.getElementById('productsCardsGrid');
    const btnGoToAddNew = document.getElementById('btnGoToAddNew');

    // Tab 2: Editor
    const productEditorForm = document.getElementById('productEditorForm');
    const editProductId = document.getElementById('editProductId');
    const editorFormHeading = document.getElementById('editorFormHeading');
    const editorFormSubtitle = document.getElementById('editorFormSubtitle');
    const btnCancelEditor = document.getElementById('btnCancelEditor');
    const prodTitle = document.getElementById('prodTitle');
    const prodCategory = document.getElementById('prodCategory');
    const customCategoryWrap = document.getElementById('customCategoryWrap');
    const prodCustomCategoryName = document.getElementById('prodCustomCategoryName');
    const prodStatus = document.getElementById('prodStatus');
    const prodBasePrice = document.getElementById('prodBasePrice');
    const prodOldPrice = document.getElementById('prodOldPrice');
    const prodDiscount = document.getElementById('prodDiscount');
    const prodStatusText = document.getElementById('prodStatusText');
    const prodDescription = document.getElementById('prodDescription');
    const prodSetupUrl = document.getElementById('prodSetupUrl');
    const prodApkUrl = document.getElementById('prodApkUrl');
    const prodFeedbackUrl = document.getElementById('prodFeedbackUrl');
    const packagesListContainer = document.getElementById('packagesListContainer');
    const btnAddPackageRow = document.getElementById('btnAddPackageRow');
    const imagePreview = document.getElementById('imagePreview');
    const prodImageUrl = document.getElementById('prodImageUrl');
    const prodImageFileInput = document.getElementById('prodImageFileInput');
    const btnUploadImageFile = document.getElementById('btnUploadImageFile');
    const presetImagesContainer = document.getElementById('presetImagesContainer');
    const btnSaveProduct = document.getElementById('btnSaveProduct');
    const btnResetProductForm = document.getElementById('btnResetProductForm');

    // Vercel Deploy & Tool Elements
    const btnDeployNetlifyTop = document.getElementById('btnDeployNetlifyTop');
    const netlifyDeployModal = document.getElementById('netlifyDeployModal');
    const btnCloseNetlifyDeployModal = document.getElementById('btnCloseNetlifyDeployModal');
    const btnModalDownloadProducts = document.getElementById('btnModalDownloadProducts');
    const btnModalDownloadSettings = document.getElementById('btnModalDownloadSettings');
    const deployAlertBanner = document.getElementById('deployAlertBanner');
    const deployAlertTitle = document.getElementById('deployAlertTitle');
    const deployAlertText = document.getElementById('deployAlertText');
    const btnAlertExport = document.getElementById('btnAlertExport');
    const btnCleanDuplicatesAlert = document.getElementById('btnCleanDuplicatesAlert');
    const btnCleanDuplicates = document.getElementById('btnCleanDuplicates');
    const btnReloadFromServer = document.getElementById('btnReloadFromServer');
    const btnQuickExportProducts = document.getElementById('btnQuickExportProducts');

    // Tab 3: Payments
    const payBkashNumber = document.getElementById('payBkashNumber');
    const payBkashName = document.getElementById('payBkashName');
    const payBkashActive = document.getElementById('payBkashActive');
    const payNagadNumber = document.getElementById('payNagadNumber');
    const payNagadName = document.getElementById('payNagadName');
    const payNagadActive = document.getElementById('payNagadActive');
    const payRocketNumber = document.getElementById('payRocketNumber');
    const payRocketName = document.getElementById('payRocketName');
    const payRocketActive = document.getElementById('payRocketActive');
    const payBinanceNumber = document.getElementById('payBinanceNumber');
    const payBinanceName = document.getElementById('payBinanceName');
    const payBinanceActive = document.getElementById('payBinanceActive');
    const btnSavePaymentSettings = document.getElementById('btnSavePaymentSettings');

    // Tab 4: Notices
    const noticeEnabled = document.getElementById('noticeEnabled');
    const noticeText = document.getElementById('noticeText');
    const supportWhatsappNumber = document.getElementById('supportWhatsappNumber');
    const supportTelegramUrl = document.getElementById('supportTelegramUrl');
    const popupEnabled = document.getElementById('popupEnabled');
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    const btnSaveNotices = document.getElementById('btnSaveNotices');

    // Tab 5: Currencies
    const storeNameInput = document.getElementById('storeName');
    const storeTaglineInput = document.getElementById('storeTagline');
    const rateUSDTInBDT = document.getElementById('rateUSDTInBDT');
    const lblUsdtMultiplier = document.getElementById('lblUsdtMultiplier');
    const rateINR = document.getElementById('rateINR');
    const rateNPR = document.getElementById('rateNPR');
    const ratePKR = document.getElementById('ratePKR');
    const btnSaveCurrencies = document.getElementById('btnSaveCurrencies');

    // Tab 6: Catalog & Vercel Publishing Hub
    const btnDownloadProductsJson = document.getElementById('btnDownloadProductsJson');
    const btnDownloadProductsTop = document.getElementById('btnDownloadProductsTop');
    const btnCopyProductsJson = document.getElementById('btnCopyProductsJson');
    const btnCopyJsonQuick = document.getElementById('btnCopyJsonQuick');
    const btnModalCopyJson = document.getElementById('btnModalCopyJson');
    const btnDownloadSettingsJson = document.getElementById('btnDownloadSettingsJson');
    const importProductsFileInput = document.getElementById('importProductsFileInput');
    const btnTriggerImportProducts = document.getElementById('btnTriggerImportProducts');
    const btnReloadServerCatalog = document.getElementById('btnReloadServerCatalog');
    const btnCleanDuplicatesSyncTab = document.getElementById('btnCleanDuplicatesSyncTab');
    const btnResetToDefaults = document.getElementById('btnResetToDefaults');

    // GitHub Auto-Deploy Engine Elements
    const ghRepoName = document.getElementById('ghRepoName');
    const ghBranchName = document.getElementById('ghBranchName');
    const ghPersonalToken = document.getElementById('ghPersonalToken');
    const ghAutoDeployOnSave = document.getElementById('ghAutoDeployOnSave');
    const btnSaveGitHubConfig = document.getElementById('btnSaveGitHubConfig');
    const btnTriggerGitHubDeployNow = document.getElementById('btnTriggerGitHubDeployNow');
    const ghAutoDeployBadge = document.getElementById('ghAutoDeployBadge');

    // Tab 7: Backup
    const btnExportFullBackup = document.getElementById('btnExportFullBackup');
    const backupFileInput = document.getElementById('backupFileInput');
    const btnTriggerRestoreUpload = document.getElementById('btnTriggerRestoreUpload');
    const btnFactoryReset = document.getElementById('btnFactoryReset');

    // Tab 8: Super Admin & Admin Management
    const navBtnAdmins = document.getElementById('navBtnAdmins');
    const adminUserPill = document.getElementById('adminUserPill');
    const adminRoleIcon = document.getElementById('adminRoleIcon');
    const currentAdminEmail = document.getElementById('currentAdminEmail');
    const currentAdminBadge = document.getElementById('currentAdminBadge');
    const subAdminsContainer = document.getElementById('subAdminsContainer');
    const btnOpenAddSubAdmin = document.getElementById('btnOpenAddSubAdmin');
    const subAdminModal = document.getElementById('subAdminModal');
    const btnCloseSubAdminModal = document.getElementById('btnCloseSubAdminModal');
    const btnCancelSubAdminModal = document.getElementById('btnCancelSubAdminModal');
    const subAdminForm = document.getElementById('subAdminForm');
    const subAdminEditId = document.getElementById('subAdminEditId');
    const subAdminName = document.getElementById('subAdminName');
    const subAdminEmail = document.getElementById('subAdminEmail');
    const subAdminPassword = document.getElementById('subAdminPassword');
    const subAdminRoleSelect = document.getElementById('subAdminRoleSelect');
    const subAdminStatusSelect = document.getElementById('subAdminStatusSelect');

    // Granular Permissions Checkboxes
    const permOrdersManage = document.getElementById('permOrdersManage');
    const permKeysAssign = document.getElementById('permKeysAssign');
    const permOrdersDelete = document.getElementById('permOrdersDelete');
    const permWalletManage = document.getElementById('permWalletManage');
    const permProductsManage = document.getElementById('permProductsManage');
    const permProductsDelete = document.getElementById('permProductsDelete');
    const permFFAccountsManage = document.getElementById('permFFAccountsManage');
    const permBannersManage = document.getElementById('permBannersManage');
    const permUsersManage = document.getElementById('permUsersManage');
    const permCouponsManage = document.getElementById('permCouponsManage');
    const permPaymentsManage = document.getElementById('permPaymentsManage');
    const permNoticesManage = document.getElementById('permNoticesManage');
    const permCurrenciesManage = document.getElementById('permCurrenciesManage');
    const permAdminsManage = document.getElementById('permAdminsManage');
    const btnSelectAllPerms = document.getElementById('btnSelectAllPerms');
    const btnClearAllPerms = document.getElementById('btnClearAllPerms');
    const btnToggleChangeSuperPass = document.getElementById('btnToggleChangeSuperPass');
    const superAdminPassForm = document.getElementById('superAdminPassForm');
    const formChangeSuperPass = document.getElementById('formChangeSuperPass');
    const newSuperPass = document.getElementById('newSuperPass');
    const confirmSuperPass = document.getElementById('confirmSuperPass');

    // Current logged in admin state
    let currentSessionUser = null;

    // ============================================================
    // AUTHENTICATION & MULTI-ADMIN PERMISSION SYSTEM
    // ============================================================
    function getSuperAdminPassword() {
        return localStorage.getItem('zero_super_admin_pass') || DEFAULT_ADMIN_PASS;
    }

    function initAdminsArray() {
        if (!settings.admins || !Array.isArray(settings.admins) || settings.admins.length === 0) {
            settings.admins = [
                {
                    id: 'super-admin',
                    name: 'Main Server Admin',
                    email: DEFAULT_ADMIN_EMAIL,
                    password: getSuperAdminPassword(),
                    role: 'CEO',
                    isSuperAdmin: true,
                    status: 'active',
                    permissions: {
                        orders_manage: true,
                        keys_assign: true,
                        orders_delete: true,
                        wallet_manage: true,
                        products_manage: true,
                        products_delete: true,
                        ffaccounts_manage: true,
                        banners_manage: true,
                        users_manage: true,
                        coupons_manage: true,
                        payments_manage: true,
                        notices_manage: true,
                        currencies_manage: true,
                        admins_manage: true
                    },
                    createdAt: new Date().toISOString()
                }
            ];
        }
    }

    function checkAuth() {
        const sessionAuth = sessionStorage.getItem('zero_admin_session');
        const localAuth = localStorage.getItem('zero_admin_session');
        const storedUser = sessionStorage.getItem('zero_current_admin_user') || localStorage.getItem('zero_current_admin_user');

        if ((sessionAuth === 'true' || localAuth === 'true') && storedUser) {
            try {
                currentSessionUser = JSON.parse(storedUser);
                if (currentSessionUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
                    currentSessionUser.isSuperAdmin = true;
                    currentSessionUser.role = 'Super Admin';
                }
                showAdminDashboard();
                return;
            } catch(e) {}
        }
        showLoginScreen();
    }

    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        adminApp.style.display = 'none';
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        loginError.style.display = 'none';

        // Counteract browser password managers attempting late autofill
        setTimeout(() => {
            if (loginEmail) loginEmail.value = '';
            if (loginPassword) loginPassword.value = '';
        }, 80);
        setTimeout(() => {
            if (loginEmail) loginEmail.value = '';
            if (loginPassword) loginPassword.value = '';
        }, 300);
    }

    function showAdminDashboard() {
        loginScreen.style.display = 'none';
        adminApp.style.display = 'flex';
        initDashboard();
        applyUserPermissions();
    }

    function applyUserPermissions() {
        if (!currentSessionUser) return;
        const isSuper = currentSessionUser.isSuperAdmin || currentSessionUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

        // Update Topbar User Badge
        if (currentAdminEmail) currentAdminEmail.textContent = currentSessionUser.email;
        const userRole = (currentSessionUser.role || (isSuper ? 'CEO' : 'ADMIN')).toUpperCase();

        if (adminRoleIcon) {
            if (userRole.includes('CEO') || isSuper) {
                adminRoleIcon.className = 'fas fa-crown';
                adminRoleIcon.style.color = '#F59E0B';
            } else if (userRole.includes('OFFICER')) {
                adminRoleIcon.className = 'fas fa-user-tie';
                adminRoleIcon.style.color = '#10B981';
            } else if (userRole.includes('SUB')) {
                adminRoleIcon.className = 'fas fa-bolt';
                adminRoleIcon.style.color = '#00F0FF';
            } else {
                adminRoleIcon.className = 'fas fa-shield-alt';
                adminRoleIcon.style.color = '#A78BFA';
            }
        }
        if (currentAdminBadge) {
            let badgeBg = 'rgba(139, 92, 246, 0.2)';
            let badgeColor = '#C4B5FD';
            if (userRole.includes('CEO') || isSuper) {
                badgeBg = 'rgba(245, 158, 11, 0.2)';
                badgeColor = '#FCD34D';
            } else if (userRole.includes('OFFICER')) {
                badgeBg = 'rgba(16, 185, 129, 0.2)';
                badgeColor = '#6EE7B7';
            } else if (userRole.includes('SUB')) {
                badgeBg = 'rgba(0, 240, 255, 0.2)';
                badgeColor = '#67E8F9';
            }
            currentAdminBadge.textContent = isSuper ? 'SUPER ADMIN (CEO)' : userRole;
            currentAdminBadge.style.background = badgeBg;
            currentAdminBadge.style.color = badgeColor;
        }

        const perms = isSuper ? { all: true } : (currentSessionUser.permissions || {});

        // Manage Admins Navigation button is visible if isSuper or perms.admins_manage
        if (navBtnAdmins) {
            navBtnAdmins.style.display = (isSuper || perms.admins_manage) ? 'flex' : 'none';
        }

        // Enforce granular sidebar tab visibility & tool restrictions if not Super Admin
        if (!isSuper) {
            const btnOrders = document.getElementById('navBtnOrders');
            if (btnOrders) btnOrders.style.display = (perms.orders_manage !== false) ? 'flex' : 'none';

            const btnWallet = document.getElementById('navBtnWallet');
            if (btnWallet) btnWallet.style.display = (perms.wallet_manage !== false) ? 'flex' : 'none';

            const btnCoupons = document.getElementById('navBtnCoupons');
            if (btnCoupons) btnCoupons.style.display = (perms.coupons_manage !== false) ? 'flex' : 'none';

            const btnResellers = document.getElementById('navBtnResellers');
            if (btnResellers) btnResellers.style.display = (perms.users_manage !== false) ? 'flex' : 'none';

            const btnBanners = document.getElementById('navBtnBanners');
            if (btnBanners) btnBanners.style.display = (perms.banners_manage !== false) ? 'flex' : 'none';

            const btnFFAccounts = document.getElementById('navBtnFFAccounts');
            if (btnFFAccounts) btnFFAccounts.style.display = (perms.ffaccounts_manage !== false) ? 'flex' : 'none';

            // Product deletion restriction
            if (!perms.products_delete) {
                document.querySelectorAll('.btn-del-p').forEach(btn => btn.style.display = 'none');
            }
            // Payments edit restriction
            if (!perms.payments_manage && btnSavePaymentSettings) {
                btnSavePaymentSettings.disabled = true;
                btnSavePaymentSettings.style.opacity = '0.5';
                btnSavePaymentSettings.title = 'No permission to modify payment gateways.';
            }
            // Notices edit restriction
            if (!perms.notices_manage && btnSaveNotices) {
                btnSaveNotices.disabled = true;
                btnSaveNotices.style.opacity = '0.5';
            }
            // Currencies edit restriction
            if (!perms.currencies_manage && btnSaveCurrencies) {
                btnSaveCurrencies.disabled = true;
                btnSaveCurrencies.style.opacity = '0.5';
            }
        }
    }

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPass = loginPassword.type === 'password';
            loginPassword.type = isPass ? 'text' : 'password';
            togglePasswordBtn.classList.toggle('fa-eye', !isPass);
            togglePasswordBtn.classList.toggle('fa-eye-slash', isPass);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim().toLowerCase();
            const pass = loginPassword.value;

            initAdminsArray();

            // 1. Check if Super Admin (tgsgaming2024@gmail.com)
            const superEmail = DEFAULT_ADMIN_EMAIL.toLowerCase();
            const superPass = getSuperAdminPassword();

            if (email === superEmail) {
                if ((pass === superPass || pass === 'Toqy+thamid2026' || pass === 'Sweet+candy2026')) {
                    currentSessionUser = {
                        id: 'super-admin',
                        name: 'Main Server Admin',
                        email: DEFAULT_ADMIN_EMAIL,
                        isSuperAdmin: true,
                        role: 'Super Admin',
                        permissions: {
                            products_manage: true,
                            products_delete: true,
                            payments_manage: true,
                            notices_manage: true,
                            currencies_manage: true,
                            sync_manage: true,
                            backup_manage: true,
                            admins_manage: true
                        }
                    };
                    executeLoginSuccess();
                    return;
                } else {
                    showLoginError('Incorrect Master Admin Password.');
                    return;
                }
            }

            // 2. Check if Secondary Sub-Admin
            const subAdmin = (settings.admins || []).find(a => a.email.toLowerCase() === email);
            if (subAdmin) {
                if (subAdmin.status === 'suspended') {
                    showLoginError('⚠️ This admin account is suspended. Contact Main Server Admin.');
                    return;
                }
                if (subAdmin.password === pass) {
                    currentSessionUser = {
                        ...subAdmin,
                        isSuperAdmin: false
                    };
                    executeLoginSuccess();
                    return;
                } else {
                    showLoginError('Incorrect password for this admin account.');
                    return;
                }
            }

            // No match found
            showLoginError('Admin account not found. Please verify your email.');
        });
    }

    function showLoginError(msg) {
        loginError.style.display = 'flex';
        loginErrorMsg.textContent = msg;
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
    }

    function executeLoginSuccess() {
        loginError.style.display = 'none';
        const userJson = JSON.stringify(currentSessionUser);
        if (rememberMe.checked) {
            localStorage.setItem('zero_admin_session', 'true');
            localStorage.setItem('zero_current_admin_user', userJson);
        } else {
            sessionStorage.setItem('zero_admin_session', 'true');
            sessionStorage.setItem('zero_current_admin_user', userJson);
        }
        showToast(`Authenticated as ${currentSessionUser.name}! (${currentSessionUser.role})`, 'success');
        showAdminDashboard();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of the Admin Console?')) {
                sessionStorage.removeItem('zero_admin_session');
                sessionStorage.removeItem('zero_current_admin_user');
                localStorage.removeItem('zero_admin_session');
                localStorage.removeItem('zero_current_admin_user');
                currentSessionUser = null;
                showToast('Logged out successfully.', 'info');
                showLoginScreen();
            }
        });
    }

    // ============================================================
    // TOAST NOTIFICATION UTILITY
    // ============================================================
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `adm-toast ${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-times-circle' : 'fa-info-circle');
        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ============================================================
    // TAB NAVIGATION WITH PERMISSION ENFORCEMENT
    // ============================================================
    function switchTab(tabId) {
        // Enforce Super Admin restriction on Tab 8
        if (tabId === 'tab-admins') {
            const isSuper = currentSessionUser && (currentSessionUser.isSuperAdmin || currentSessionUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
            if (!isSuper) {
                alert('🔒 Access Denied: Only Main Server Admin (tgsgaming2024@gmail.com) has permission to manage admin accounts.');
                switchTab('tab-products');
                return;
            }
            renderSubAdminsList();
        }

        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });

        const activeBtn = document.querySelector(`.sidebar-nav .nav-link-btn[data-tab="${tabId}"]`);
        if (activeBtn) {
            topbarTitle.textContent = activeBtn.textContent.trim();
        }

        if (window.innerWidth <= 768) {
            admSidebar.classList.remove('open');
        }

        if (tabId === 'tab-products') {
            renderCatalogCards();
        } else if (tabId === 'tab-orders') {
            loadAndRenderOrders();
        } else if (tabId === 'tab-wallet-requests') {
            loadAndRenderWalletRequests();
        } else if (tabId === 'tab-hwid') {
            loadAndRenderHwidRequests();
        } else if (tabId === 'tab-banners') {
            loadAndRenderBanners();
        } else if (tabId === 'tab-ffaccounts') {
            loadAndRenderFFAccounts();
        } else if (tabId === 'tab-resellers') {
            loadAndRenderUsers();
        } else if (tabId === 'tab-coupons') {
            loadAndRenderCoupons();
        } else if (tabId === 'tab-spin') {
            loadSpinSettings();
        } else if (tabId === 'tab-referrals') {
            loadReferralAdminData();
        } else if (tabId === 'tab-vip') {
            loadVipAdminSettings();
        } else if (tabId === 'tab-mystery') {
            loadMysteryAdminSettings();
        } else if (tabId === 'tab-flashsale') {
            loadFlashSaleAdminSettings();
        } else if (tabId === 'tab-giftcards') {
            loadGiftCardsAdminList();
        } else if (tabId === 'tab-leaderboard') {
            loadLeaderboardAdminSettings();
        } else if (tabId === 'tab-categories') {
            loadCategoriesManagementData();
        }
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            admSidebar.classList.toggle('open');
        });
    }

    if (btnGoToAddNew || quickAddProductBtn) {
        [btnGoToAddNew, quickAddProductBtn].forEach(b => {
            if (b) b.addEventListener('click', () => {
                resetProductForm();
                switchTab('tab-editor');
            });
        });
    }

    if (btnCancelEditor) {
        btnCancelEditor.addEventListener('click', () => {
            resetProductForm();
            switchTab('tab-products');
        });
    }

    // ============================================================
    // DATA PERSISTENCE & INITIALIZATION
    // ============================================================
    async function initDashboard() {
        await loadSettings();
        await loadProducts();
        await loadServerCategories();
        initAdminsArray();
        loadGitHubConfig();
        renderPresetImages();
        renderCategoryChips();
        renderCatalogCards();
        populatePaymentFields();
        populateNoticeFields();
        populateCurrencyFields();
        renderSubAdminsList();
        applyUserPermissions();
        updateStats();
        loadAndRenderUsers();
        loadAndRenderOrders();
        loadAndRenderWalletRequests();
        loadAndRenderHwidRequests();
        loadAndRenderCoupons();
        loadVipAdminSettings();
        loadMysteryAdminSettings();
        loadFlashSaleAdminSettings();
        loadGiftCardsAdminList();
        loadLeaderboardAdminSettings();
    }

    async function loadSettings() {
        try {
            const raw = localStorage.getItem('bpo_store_settings');
            if (raw) {
                settings = { ...settings, ...JSON.parse(raw) };
            } else {
                const res = await fetch('/settings.json');
                if (res.ok) {
                    const fetched = await res.json();
                    settings = { ...settings, ...fetched };
                    localStorage.setItem('bpo_store_settings', JSON.stringify(settings));
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products, settings })
                }).catch(() => {});
            } catch(syncErr) {}
                }
            }
        } catch(e) {
            console.log('Using default settings fallback.');
        }

        if (!settings.admins || !Array.isArray(settings.admins) || settings.admins.length === 0) {
            initAdminsArray();
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('bpo_store_settings', JSON.stringify(settings));
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products, settings })
                }).catch(() => {});
            } catch(syncErr) {}
            broadcastSync({ type: 'SETTINGS_UPDATED', settings, timestamp: Date.now() });
        } catch(e) {
            console.error('Error saving settings:', e);
        }
    }

    async function loadProducts() {
        try {
            const raw = localStorage.getItem('bpo_full_catalog_v2');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    products = parsed;
                    return;
                }
            }
            
            const res = await fetch('/products.json?_t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                products = await res.json();
                localStorage.setItem('bpo_full_catalog_v2', JSON.stringify(products));
                return;
            }
        } catch(e) {
            console.warn('Could not load products.json directly; falling back to local memory.');
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            products = getFallbackProducts();
            localStorage.setItem('bpo_full_catalog_v2', JSON.stringify(products));
        }
    }

    function saveProducts() {
        try {
            localStorage.setItem('bpo_full_catalog_v2', JSON.stringify(products));
            localStorage.setItem('bpo_catalog_updated_at', Date.now().toString());
            localStorage.setItem('bpo_local_draft_active', 'true');
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products, settings })
                }).catch(() => {});
            } catch(syncErr) {}
            broadcastSync({
                type: 'CATALOG_UPDATED',
                catalog: products,
                timestamp: Date.now()
            });
            updateStats();
        loadAndRenderUsers();

            // 100% Automated GitHub & Vercel deployment
            const ghConfig = getGitHubConfig();
            if (ghConfig.token && ghConfig.autoDeploy !== false) {
                pushToGitHub({ silent: true });
            }
        } catch(e) {
            console.error('Error saving products:', e);
        }
    }

    function broadcastSync(data) {
        if (syncChannel) {
            try {
                syncChannel.postMessage(data);
            } catch(e) {}
        }
    }

    function updateStats() {
        if (statTotalProducts) statTotalProducts.textContent = products.length;
        
        const cats = new Set(products.map(p => p.category));
        if (statTotalCategories) statTotalCategories.textContent = cats.size;

        let activePays = 0;
        if (settings.paymentMethods) {
            Object.values(settings.paymentMethods).forEach(p => {
                if (p.active) activePays++;
            });
        }
        if (statActivePayments) statActivePayments.textContent = activePays;
    }

    // ============================================================
    // PRESET IMAGES PICKER
    // ============================================================
    function renderPresetImages() {
        if (!presetImagesContainer) return;
        presetImagesContainer.innerHTML = '';
        PRESET_IMAGES.forEach(imgSrc => {
            const tile = document.createElement('div');
            const isSelected = prodImageUrl && prodImageUrl.value === imgSrc;
            tile.className = 'preset-img-tile' + (isSelected ? ' selected' : '');
            tile.title = imgSrc;
            tile.innerHTML = `<img src="${imgSrc}" alt="${imgSrc}">`;
            tile.addEventListener('click', () => {
                if (prodImageUrl) prodImageUrl.value = imgSrc;
                if (imagePreview) imagePreview.src = imgSrc;
                presetImagesContainer.querySelectorAll('.preset-img-tile').forEach(el => el.classList.remove('selected'));
                tile.classList.add('selected');
            });
            presetImagesContainer.appendChild(tile);
        });
    }

    if (prodImageUrl) {
        prodImageUrl.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            imagePreview.src = val || '/images/logo.jpg';
        });
    }

    if (btnUploadImageFile && prodImageFileInput) {
        btnUploadImageFile.addEventListener('click', () => prodImageFileInput.click());

        prodImageFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (PNG, JPG, WEBP).');
                return;
            }

            // Compress image using HTML5 Canvas to keep local storage & cloud fast
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 380;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                    prodImageUrl.value = compressedBase64;
                    imagePreview.src = compressedBase64;
                    showToast('Image compressed & uploaded!', 'success');
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Auto-calculate discount when old price and base price change
    function updateAutoDiscount() {
        const base = parseFloat(prodBasePrice.value);
        const old = parseFloat(prodOldPrice.value);
        if (!isNaN(base) && !isNaN(old) && old > 0 && base > 0 && old !== base) {
            const maxP = Math.max(old, base);
            const minP = Math.min(old, base);
            const disc = Math.round(((maxP - minP) / maxP) * 100);
            if (disc > 0) {
                prodDiscount.value = `${disc}% OFF`;
            }
        }
    }
    if (prodBasePrice) prodBasePrice.addEventListener('input', updateAutoDiscount);
    if (prodOldPrice) prodOldPrice.addEventListener('input', updateAutoDiscount);

    // ============================================================
    // DURATION PACKAGES BUILDER
    // ============================================================
    function syncBasePriceFromPackages() {
        if (!packagesListContainer) return;
        const firstRow = packagesListContainer.querySelector('.package-row-item, .pkg-row-item');
        if (firstRow) {
            const priceInput = firstRow.querySelector('.pkg-price-input');
            if (priceInput && priceInput.value && !prodBasePrice.value) {
                prodBasePrice.value = priceInput.value;
                updateAutoDiscount();
            }
        }
    }

    function createPackageRow(name = '1 Day', price = 50) {
        const row = document.createElement('div');
        row.className = 'package-row-item pkg-row-item';
        row.innerHTML = `
            <input type="text" class="pkg-name-input" placeholder="Package Duration (e.g. 1 Day, 7 Days, 30 Days)" value="${name}" required style="flex: 2;">
            <input type="number" step="any" class="pkg-price-input" placeholder="Price (BDT ৳)" value="${price}" required style="flex: 1;">
            <button type="button" class="btn-del-pkg btn-remove-pkg" title="Remove duration option" style="color: #F87171; padding: 6px 10px; cursor: pointer;">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        const priceInput = row.querySelector('.pkg-price-input');
        if (priceInput) {
            priceInput.addEventListener('input', syncBasePriceFromPackages);
        }

        row.querySelector('.btn-remove-pkg').addEventListener('click', () => {
            const rows = packagesListContainer.querySelectorAll('.pkg-row-item, .package-row-item');
            if (rows.length > 1) {
                row.remove();
                syncBasePriceFromPackages();
            } else {
                alert('At least one duration package option is required.');
            }
        });

        return row;
    }

    if (btnAddPackageRow && packagesListContainer) {
        btnAddPackageRow.addEventListener('click', () => {
            packagesListContainer.appendChild(createPackageRow('7 Days', 200));
        });
    }

    // Handle Category Toggle (Custom Category & Accounts Mode)
    if (prodCategory && customCategoryWrap) {
        prodCategory.addEventListener('change', () => {
            if (prodCategory.value === 'custom') {
                customCategoryWrap.style.display = 'block';
                prodCustomCategoryName.required = true;
            } else {
                customCategoryWrap.style.display = 'none';
                prodCustomCategoryName.required = false;
            }

            if (prodCategory.value === 'accounts') {
                if (packagesListContainer) {
                    packagesListContainer.innerHTML = '';
                    const baseP = Number(prodBasePrice ? prodBasePrice.value : 0) || 2500;
                    packagesListContainer.appendChild(createPackageRow('Full Account Access', baseP));
                }
            }
        });
    }

    // ============================================================
    // CATALOG RENDERING & FILTERING
    // ============================================================
    function renderCategoryChips() {
        const counts = {
            all: products.length,
            'non-root': 0,
            root: 0,
            accounts: 0,
            ios: 0,
            pc: 0,
            pubg: 0,
            demo: 0,
            other: 0
        };

        products.forEach(p => {
            if (counts[p.category] !== undefined) {
                counts[p.category]++;
            }
        });

        if (document.getElementById('countAll')) document.getElementById('countAll').textContent = counts.all;
        if (document.getElementById('countNonRoot')) document.getElementById('countNonRoot').textContent = counts['non-root'];
        if (document.getElementById('countRoot')) document.getElementById('countRoot').textContent = counts.root;
        if (document.getElementById('countAccounts')) document.getElementById('countAccounts').textContent = counts.accounts;
        if (document.getElementById('countIos')) document.getElementById('countIos').textContent = counts.ios;
        if (document.getElementById('countPc')) document.getElementById('countPc').textContent = counts.pc;
        if (document.getElementById('countPubg')) document.getElementById('countPubg').textContent = counts.pubg;
        if (document.getElementById('countDemo')) document.getElementById('countDemo').textContent = counts.demo;
        if (document.getElementById('countOther')) document.getElementById('countOther').textContent = counts.other;

        // Auto-populate custom categories into prodCategory dropdown
        if (prodCategory) {
            const customOpt = prodCategory.querySelector('option[value="custom"]');
            products.forEach(p => {
                if (p.category && !CATEGORY_NAMES[p.category] && p.category !== 'custom') {
                    const optId = `custom-opt-${p.category}`;
                    if (!document.getElementById(optId)) {
                        const opt = document.createElement('option');
                        opt.id = optId;
                        opt.value = p.category;
                        opt.textContent = p.categoryName || p.category.toUpperCase();
                        if (customOpt) {
                            prodCategory.insertBefore(opt, customOpt);
                        } else {
                            prodCategory.appendChild(opt);
                        }
                    }
                    CATEGORY_NAMES[p.category] = p.categoryName || p.category.toUpperCase();
                }
            });
        }

        // Render Custom Categories Management Badges
        const badgesContainer = document.getElementById('customCategoryBadgesList');
        const listWrapper = document.getElementById('customCategoryListContainer');
        if (badgesContainer && listWrapper) {
            badgesContainer.innerHTML = '';
            const standardKeys = new Set(['all', 'non-root', 'root', 'accounts', 'ios', 'i-phone', 'pc', 'pubg', 'demo', 'other', 'custom']);
            const customCats = [];
            const seen = new Set();

            Object.keys(CATEGORY_NAMES).forEach(k => {
                if (!standardKeys.has(k) && !seen.has(k)) {
                    seen.add(k);
                    customCats.push({ id: k, name: CATEGORY_NAMES[k] || k.toUpperCase() });
                }
            });

            products.forEach(p => {
                if (p.category && !standardKeys.has(p.category) && !seen.has(p.category)) {
                    seen.add(p.category);
                    customCats.push({ id: p.category, name: p.categoryName || p.category.toUpperCase() });
                }
            });

            if (customCats.length > 0) {
                listWrapper.style.display = 'block';
                customCats.forEach(cc => {
                    const badge = document.createElement('div');
                    badge.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 8px; background: rgba(0, 240, 255, 0.12); border: 1.5px solid #00f0ff; color: #ffffff; font-size: 11px; font-weight: bold;';
                    badge.innerHTML = `
                        <span>${cc.name}</span>
                        <button type="button" onclick="deleteCustomCategory('${cc.id}', '${cc.name.replace(/'/g, "\\'")}')" title="Delete category '${cc.name}'" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; border-radius: 6px; padding: 2px 7px; cursor: pointer; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239, 68, 68, 0.25)'; this.style.color='#fca5a5';">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    `;
                    badgesContainer.appendChild(badge);
                });
            } else {
                listWrapper.style.display = 'none';
            }
        }
    }

    // Global Custom Category Deletion Handler
    window.deleteCustomCategory = async function(catId, catName) {
        if (!confirm(`Are you sure you want to permanently delete custom category "${catName}"?\n\nAny products currently assigned to this category will automatically be moved to "OTHER".`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin/category/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId: catId })
            });
            const data = await res.json();

            if (data.success) {
                // Remove from in-memory CATEGORY_NAMES
                delete CATEGORY_NAMES[catId];

                // Remove option from prodCategory select if present
                const opt = document.getElementById(`custom-opt-${catId}`) || prodCategory?.querySelector(`option[value="${catId}"]`);
                if (opt) opt.remove();

                // Reassign any local products
                products.forEach(p => {
                    if (p.category === catId) {
                        p.category = 'other';
                        p.categoryName = 'OTHER';
                    }
                });

                if (prodCategory && prodCategory.value === catId) {
                    prodCategory.value = 'other';
                    if (customCategoryWrap) customCategoryWrap.style.display = 'none';
                }

                saveProducts();
                renderCategoryChips();
                renderCatalogCards();
                showToast(`Category "${catName}" deleted successfully!`, 'success');
            } else {
                alert(data.message || 'Failed to delete category.');
            }
        } catch (err) {
            alert('Error deleting category: ' + err.message);
        }
    };

    async function loadServerCategories() {
        try {
            const res = await fetch('/api/admin/categories');
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                const standardKeys = new Set(['all', 'non-root', 'root', 'accounts', 'ios', 'i-phone', 'pc', 'pubg', 'demo', 'other']);
                data.categories.forEach(c => {
                    if (c && c.id && !standardKeys.has(c.id)) {
                        CATEGORY_NAMES[c.id] = c.name || c.id.toUpperCase();
                    }
                });
                renderCategoryChips();
            }
        } catch(e) {}
    }

    if (categoryChipsContainer) {
        categoryChipsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip-btn');
            if (!chip) return;
            categoryChipsContainer.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategoryFilter = chip.dataset.cat || 'all';
            renderCatalogCards();
        });
    }

    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderCatalogCards();
        });
    }

    function renderCatalogCards() {
        if (!productsCardsGrid) return;
        productsCardsGrid.innerHTML = '';
        renderCategoryChips();
        updateStats();
        loadAndRenderUsers();

        const filtered = products.filter(p => {
            const matchesCat = activeCategoryFilter === 'all' || p.category === activeCategoryFilter;
            const matchesSearch = !searchQuery || 
                p.title.toLowerCase().includes(searchQuery) || 
                (p.categoryName && p.categoryName.toLowerCase().includes(searchQuery)) ||
                (p.description && p.description.toLowerCase().includes(searchQuery));
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            productsCardsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--adm-surface); border-radius: var(--adm-radius); border: 1.5px dashed var(--adm-border);">
                    <i class="fas fa-search" style="font-size: 32px; color: var(--adm-text-muted); margin-bottom: 12px; display: block;"></i>
                    <h4 style="font-size: 16px;">No products match your search or filter.</h4>
                    <p style="font-size: 12px; color: var(--adm-text-secondary); margin-top: 4px;">Try searching for another keyword or add a new product.</p>
                </div>
            `;
            return;
        }

        filtered.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'adm-prod-card';
            card.dataset.productId = p.id;

            const statusClass = p.status === 'warning' ? 'warning' : (p.status === 'new' ? 'new' : 'online');
            const pkgList = p.packages || [];
            const pkgsHtml = pkgList.slice(0, 3).map(pkg => `<span class="adm-pkg-pill">${pkg.name}: ৳${pkg.price}</span>`).join('');
            const morePkgs = pkgList.length > 3 ? `<span class="adm-pkg-pill">+${pkgList.length - 3} more</span>` : '';

            card.innerHTML = `
                <div class="adm-prod-media">
                    <img src="${p.image || '/images/logo.jpg'}" alt="${p.title}" class="adm-prod-img" onerror="this.src='/images/logo.jpg'">
                    <div class="adm-card-badges">
                        <span class="adm-badge-cat">${p.categoryName || p.category}</span>
                        ${p.discount ? `<span class="adm-badge-discount">${p.discount}</span>` : ''}
                    </div>
                    <div class="adm-badge-status">
                        <span class="status-dot"></span>
                        <span>${p.statusText || 'Online'}</span>
                    </div>
                </div>

                <div class="adm-prod-body">
                    <h4 class="adm-prod-title" title="${p.title}">${p.title}</h4>
                    <div class="adm-prod-price-row">
                        <span class="adm-prod-price-current">৳${p.basePrice}</span>
                        ${p.oldPrice ? `<span class="adm-prod-price-old">৳${p.oldPrice}</span>` : ''}
                    </div>
                    <div class="adm-packages-preview">
                        ${pkgsHtml} ${morePkgs}
                    </div>
                </div>

                <div class="adm-prod-footer">
                    <button class="btn-card-action btn-card-edit btn-edit-p" title="Edit this product">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-card-action btn-card-clone btn-dup-p" title="Clone this product">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="btn-card-action btn-card-del btn-del-p" title="Delete this product">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            card.querySelector('.btn-edit-p').addEventListener('click', () => editProduct(p));
            card.querySelector('.btn-dup-p').addEventListener('click', () => duplicateProduct(p));
            card.querySelector('.btn-del-p').addEventListener('click', () => deleteProduct(p.id, p.title));

            productsCardsGrid.appendChild(card);
        });
    }

    // ============================================================
    // CLEAN DUPLICATES & RELOAD SERVER CATALOG
    // ============================================================
    function cleanDuplicates() {
        let removedCount = 0;
        const seen = new Set();
        const cleaned = [];

        products.forEach(p => {
            const baseTitle = p.title.replace(/\s*\(Copy\)+/gi, '').trim();
            const key = baseTitle.toLowerCase() + '_' + p.category;

            if (seen.has(key)) {
                removedCount++;
            } else {
                seen.add(key);
                if (p.title.includes('(Copy)')) {
                    p.title = baseTitle;
                }
                cleaned.push(p);
            }
        });

        if (removedCount === 0) {
            showToast('No duplicate products found.', 'info');
            return;
        }

        if (confirm(`Found ${removedCount} duplicate / cloned products. Clean them up now and keep 1 clean version of each?`)) {
            products = cleaned;
            saveProducts();
            renderCatalogCards();
            showToast(`Cleaned up ${removedCount} duplicate products!`, 'success');
        }
    }

    async function reloadFromServer() {
        if (confirm('Reload the original pristine 18 products from products.json on the server? This will clear any duplicate copies in Chrome.')) {
            try {
                const res = await fetch('/products.json?_t=' + Date.now(), { cache: 'no-store' });
                if (res.ok) {
                    products = await res.json();
                    localStorage.setItem('bpo_full_catalog_v2', JSON.stringify(products));
                    localStorage.removeItem('bpo_local_draft_active');
                    renderCatalogCards();
                    showToast('Original server catalog reloaded successfully!', 'success');
                } else {
                    alert('Could not load products.json from server.');
                }
            } catch(e) {
                alert('Error loading products.json: ' + e.message);
            }
        }
    }

    // ============================================================
    // PRODUCT CRUD OPERATIONS
    // ============================================================
    function resetProductForm() {
        if (productEditorForm) productEditorForm.reset();
        if (editProductId) editProductId.value = '';
        if (editorFormHeading) editorFormHeading.textContent = '➕ Add New Product';
        if (editorFormSubtitle) editorFormSubtitle.textContent = 'Configure product details, duration packages, pricing, and high quality thumbnail.';
        if (btnSaveProduct) {
            const span = btnSaveProduct.querySelector('span');
            if (span) span.textContent = 'Save Product';
        }
        if (imagePreview) imagePreview.src = '/images/logo.jpg';
        if (customCategoryWrap) customCategoryWrap.style.display = 'none';
        if (prodCustomCategoryName) prodCustomCategoryName.required = false;
        if (prodSetupUrl) prodSetupUrl.value = '';
        if (prodApkUrl) prodApkUrl.value = '';
        if (prodFeedbackUrl) prodFeedbackUrl.value = '';

        if (packagesListContainer) {
            packagesListContainer.innerHTML = '';
            packagesListContainer.appendChild(createPackageRow('1 Day', 50));
            packagesListContainer.appendChild(createPackageRow('3 Days', 130));
            packagesListContainer.appendChild(createPackageRow('7 Days', 250));
            packagesListContainer.appendChild(createPackageRow('30 Days', 750));
        }
    }

    if (btnResetProductForm) {
        btnResetProductForm.addEventListener('click', resetProductForm);
    }

    function editProduct(product) {
        editProductId.value = product.id;
        prodTitle.value = product.title || '';
        
        if (CATEGORY_NAMES[product.category]) {
            prodCategory.value = product.category;
            customCategoryWrap.style.display = 'none';
        } else {
            prodCategory.value = 'custom';
            customCategoryWrap.style.display = 'block';
            prodCustomCategoryName.value = product.categoryName || product.category;
        }

        prodStatus.value = product.status || 'online';
        prodBasePrice.value = product.basePrice || '';
        prodOldPrice.value = product.oldPrice || '';
        prodDiscount.value = product.discount || '';
        prodStatusText.value = product.statusText || 'Online';
        prodDescription.value = product.description || '';
        prodImageUrl.value = product.image || '';
        imagePreview.src = product.image || '/images/logo.jpg';
        if (prodSetupUrl) prodSetupUrl.value = product.setup_url || '';
        if (prodApkUrl) prodApkUrl.value = product.apk_url || '';
        if (prodFeedbackUrl) prodFeedbackUrl.value = product.feedback_url || '';

        // Packages
        packagesListContainer.innerHTML = '';
        if (product.packages && product.packages.length > 0) {
            product.packages.forEach(pkg => {
                packagesListContainer.appendChild(createPackageRow(pkg.name, pkg.price));
            });
        } else {
            packagesListContainer.appendChild(createPackageRow('1 Day', product.basePrice || 50));
        }

        editorFormHeading.textContent = `✏️ Edit Product: ${product.title}`;
        editorFormSubtitle.textContent = `Modifying product ID: ${product.id}. Changes will save instantly.`;
        btnSaveProduct.querySelector('span').textContent = 'Save Changes';

        switchTab('tab-editor');
    }

    function duplicateProduct(product) {
        const copy = JSON.parse(JSON.stringify(product));
        copy.id = product.id + '-copy-' + Date.now().toString().slice(-4);
        copy.title = product.title + ' (Copy)';
        products.unshift(copy);
        activeCategoryFilter = 'all';
        searchQuery = '';
        if (catalogSearchInput) catalogSearchInput.value = '';
        if (categoryChipsContainer) {
            categoryChipsContainer.querySelectorAll('.chip-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === 'all');
            });
        }
        saveProducts();
        renderCatalogCards();
        updateStats();
        loadAndRenderUsers();
        showToast(`Cloned "${product.title}" successfully!`, 'success');
        setTimeout(() => {
            if (productsCardsGrid) {
                const targetCard = productsCardsGrid.querySelector(`[data-product-id="${copy.id}"]`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetCard.classList.add('pulse-highlight');
                    setTimeout(() => targetCard.classList.remove('pulse-highlight'), 2500);
                }
            }
        }, 120);
    }

    function deleteProduct(id, title) {
        if (confirm(`Are you sure you want to permanently delete "${title}"?`)) {
            const idx = products.findIndex(p => String(p.id).trim() === String(id).trim());
            if (idx !== -1) {
                products.splice(idx, 1);
                saveProducts();
                renderCatalogCards();
                updateStats();
        loadAndRenderUsers();
                showToast(`Deleted "${title}" from catalog.`, 'info');
            }
        }
    }

    if (productEditorForm) {
        productEditorForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = prodTitle.value.trim();
            let category = prodCategory.value;
            let categoryName = CATEGORY_NAMES[category] || 'Custom Category';

            if (category === 'custom') {
                categoryName = prodCustomCategoryName.value.trim() || 'Custom Category';
                category = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            }

            const basePrice = Number(prodBasePrice.value);
            const oldPrice = prodOldPrice.value ? Number(prodOldPrice.value) : null;
            let discount = prodDiscount.value.trim();
            if (!discount && oldPrice && basePrice && oldPrice !== basePrice) {
                const maxP = Math.max(oldPrice, basePrice);
                const minP = Math.min(oldPrice, basePrice);
                const pct = Math.round(((maxP - minP) / maxP) * 100);
                if (pct > 0) discount = `${pct}% OFF`;
            }

            const status = prodStatus.value;
            const statusText = prodStatusText.value.trim() || 'Online';
            const description = prodDescription.value.trim();
            const image = prodImageUrl.value.trim() || '/images/logo.jpg';
            const setup_url = prodSetupUrl ? prodSetupUrl.value.trim() : '';
            const apk_url = prodApkUrl ? prodApkUrl.value.trim() : '';
            const feedback_url = prodFeedbackUrl ? prodFeedbackUrl.value.trim() : '';

            // Gather packages
            const packageRows = packagesListContainer.querySelectorAll('.pkg-row-item');
            const packages = [];
            packageRows.forEach(row => {
                const name = row.querySelector('.pkg-name-input').value.trim();
                const price = Number(row.querySelector('.pkg-price-input').value);
                if (name && price) {
                    packages.push({ name, price });
                }
            });

            if (packages.length === 0) {
                if (category === 'accounts') {
                    packages.push({ name: 'Full Account Access', price: basePrice || 2500 });
                } else {
                    alert('Please add at least one valid duration package option.');
                    return;
                }
            }

            const currentEditingId = (editProductId.value || '').trim();
            let savedProductId = '';

            if (currentEditingId) {
                // Update existing product
                const targetIdx = products.findIndex(p => String(p.id).trim() === String(currentEditingId).trim());
                if (targetIdx !== -1) {
                    products[targetIdx] = {
                        ...products[targetIdx],
                        id: currentEditingId,
                        title,
                        category,
                        categoryName,
                        basePrice,
                        oldPrice,
                        discount,
                        status,
                        statusText,
                        description,
                        image,
                        setup_url,
                        apk_url,
                        feedback_url,
                        packages
                    };
                    savedProductId = currentEditingId;
                    saveProducts();
                    showToast(`Successfully updated "${title}"!`, 'success');
                } else {
                    savedProductId = 'prod-' + Date.now();
                    const newProduct = {
                        id: savedProductId,
                        title,
                        category,
                        categoryName,
                        basePrice,
                        oldPrice,
                        discount,
                        status,
                        statusText,
                        description,
                        image,
                        setup_url,
                        apk_url,
                        feedback_url,
                        packages,
                        isCustom: true
                    };
                    products.unshift(newProduct);
                    saveProducts();
                    showToast(`Added product: "${title}"!`, 'success');
                }
            } else {
                // Create new product
                savedProductId = 'prod-' + Date.now();
                const newProduct = {
                    id: savedProductId,
                    title,
                    category,
                    categoryName,
                    basePrice,
                    oldPrice,
                    discount,
                    status,
                    statusText,
                    description,
                    image,
                    setup_url,
                    apk_url,
                    feedback_url,
                    packages,
                    isCustom: true
                };
                products.unshift(newProduct);
                saveProducts();
                showToast(`Added new product: "${title}"!`, 'success');
            }

            // CRITICAL: Reset filters so the new/updated product is immediately visible
            activeCategoryFilter = 'all';
            searchQuery = '';
            if (catalogSearchInput) catalogSearchInput.value = '';
            if (categoryChipsContainer) {
                categoryChipsContainer.querySelectorAll('.chip-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.cat === 'all');
                });
            }

            resetProductForm();
            renderCatalogCards();
            updateStats();
        loadAndRenderUsers();
            switchTab('tab-products');

            // Visual feedback: scroll to and highlight updated card
            setTimeout(() => {
                if (productsCardsGrid) {
                    const targetCard = productsCardsGrid.querySelector(`[data-product-id="${savedProductId}"]`);
                    if (targetCard) {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('pulse-highlight');
                        setTimeout(() => targetCard.classList.remove('pulse-highlight'), 2500);
                    }
                }
            }, 120);
        });
    }

    // ============================================================
    // TAB 3: PAYMENT GATEWAYS
    // ============================================================
    function populatePaymentFields() {
        if (!settings.paymentMethods) return;
        const p = settings.paymentMethods;
        if (p.bkash) {
            payBkashNumber.value = p.bkash.number || '';
            payBkashName.value = p.bkash.name || 'bKash Personal';
            payBkashActive.checked = p.bkash.active !== false;
        }
        if (p.nagad) {
            payNagadNumber.value = p.nagad.number || '';
            payNagadName.value = p.nagad.name || 'Nagad Personal';
            payNagadActive.checked = p.nagad.active !== false;
        }
        if (p.rocket) {
            payRocketNumber.value = p.rocket.number || '';
            payRocketName.value = p.rocket.name || 'Rocket Personal';
            payRocketActive.checked = p.rocket.active !== false;
        }
        if (p.binance) {
            payBinanceNumber.value = p.binance.number || '';
            payBinanceName.value = p.binance.name || 'Binance USDT (TRC20)';
            payBinanceActive.checked = p.binance.active !== false;
        }
    }

    if (btnSavePaymentSettings) {
        btnSavePaymentSettings.addEventListener('click', () => {
            settings.paymentMethods = {
                bkash: {
                    name: payBkashName.value.trim(),
                    number: payBkashNumber.value.trim(),
                    active: payBkashActive.checked,
                    type: 'Personal'
                },
                nagad: {
                    name: payNagadName.value.trim(),
                    number: payNagadNumber.value.trim(),
                    active: payNagadActive.checked,
                    type: 'Personal'
                },
                rocket: {
                    name: payRocketName.value.trim(),
                    number: payRocketNumber.value.trim(),
                    active: payRocketActive.checked,
                    type: 'Personal'
                },
                binance: {
                    name: payBinanceName.value.trim(),
                    number: payBinanceNumber.value.trim(),
                    active: payBinanceActive.checked,
                    type: 'Crypto'
                }
            };
            saveSettings();
            showToast('Payment gateway numbers updated & live on Vercel!', 'success');
        });
    }

    // ============================================================
    // TAB 4: NOTICES & CONTACT SUPPORT
    // ============================================================
    function populateNoticeFields() {
        if (noticeEnabled) noticeEnabled.checked = settings.noticeEnabled !== false;
        if (noticeText) noticeText.value = settings.noticeText || '';
        if (supportWhatsappNumber) supportWhatsappNumber.value = settings.whatsappNumber || '';
        if (supportTelegramUrl) supportTelegramUrl.value = settings.telegramUrl || '';
        if (popupEnabled) popupEnabled.checked = settings.popupEnabled === true;
        if (popupTitle) popupTitle.value = settings.popupTitle || '';
        if (popupMessage) popupMessage.value = settings.popupMessage || '';
    }

    if (btnSaveNotices) {
        btnSaveNotices.addEventListener('click', () => {
            settings.noticeEnabled = noticeEnabled.checked;
            settings.noticeText = noticeText.value.trim();
            settings.whatsappNumber = supportWhatsappNumber.value.trim();
            settings.telegramUrl = supportTelegramUrl.value.trim();
            settings.popupEnabled = popupEnabled.checked;
            settings.popupTitle = popupTitle.value.trim();
            settings.popupMessage = popupMessage.value.trim();
            saveSettings();
            showToast('Notices & WhatsApp support details updated!', 'success');
        });
    }

    // ============================================================
    // TAB 5: CURRENCIES & STORE INFO
    // ============================================================
    function populateCurrencyFields() {
        if (storeNameInput) storeNameInput.value = settings.storeName || 'ZERO EXCEPTION';
        if (storeTaglineInput) storeTaglineInput.value = settings.storeTagline || '';

        if (rateUSDTInBDT) {
            let bdtPerUsdt = 125;
            if (settings.currencyRates && settings.currencyRates.USDT) {
                if (settings.currencyRates.USDT.bdt_per_usdt) {
                    bdtPerUsdt = settings.currencyRates.USDT.bdt_per_usdt;
                } else if (settings.currencyRates.USDT.rate) {
                    bdtPerUsdt = Math.round(1 / settings.currencyRates.USDT.rate);
                }
            }
            rateUSDTInBDT.value = bdtPerUsdt;
            if (lblUsdtMultiplier) {
                lblUsdtMultiplier.textContent = (1 / bdtPerUsdt).toFixed(4);
            }
        }

        if (settings.currencyRates) {
            if (rateINR && settings.currencyRates.INR) rateINR.value = settings.currencyRates.INR.rate;
            if (rateNPR && settings.currencyRates.NPR) rateNPR.value = settings.currencyRates.NPR.rate;
            if (ratePKR && settings.currencyRates.PKR) ratePKR.value = settings.currencyRates.PKR.rate;
        }
    }

    if (rateUSDTInBDT) {
        rateUSDTInBDT.addEventListener('input', () => {
            const val = parseFloat(rateUSDTInBDT.value) || 125;
            if (lblUsdtMultiplier) {
                lblUsdtMultiplier.textContent = (1 / val).toFixed(4);
            }
        });
    }

    if (btnSaveCurrencies) {
        btnSaveCurrencies.addEventListener('click', () => {
            settings.storeName = storeNameInput.value.trim();
            settings.storeTagline = storeTaglineInput.value.trim();
            if (!settings.currencyRates) settings.currencyRates = {};
            settings.currencyRates.BDT = { symbol: '৳', rate: 1, name: 'BDT' };

            const bdtPerUsdt = parseFloat(rateUSDTInBDT ? rateUSDTInBDT.value : 125) || 125;
            const usdtMultiplier = parseFloat((1 / bdtPerUsdt).toFixed(6));
            settings.currencyRates.USDT = {
                symbol: '$',
                rate: usdtMultiplier,
                bdt_per_usdt: bdtPerUsdt,
                name: 'US Dollar',
                flag: '🇺🇸',
                display_rate: `1 USDT = ${bdtPerUsdt}৳`
            };

            settings.currencyRates.INR = { symbol: '₹', rate: Number(rateINR.value), name: 'INR' };
            settings.currencyRates.NPR = { symbol: 'Rs', rate: Number(rateNPR.value), name: 'NPR' };
            settings.currencyRates.PKR = { symbol: 'Rs', rate: Number(ratePKR.value), name: 'PKR' };
            saveSettings();
            showToast('Currency rates & store info saved!', 'success');
        });
    }

    // ============================================================
    // TAB 6: VERCEL & CATALOG PUBLISHING ENGINE
    // ============================================================

    function downloadJsonFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${filename} ready for Vercel / GitHub`, 'success');
    }

    function copyProductsJsonToClipboard() {
        const jsonStr = JSON.stringify(products, null, 4);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jsonStr).then(() => {
                showToast('Copied products.json to clipboard!', 'success');
            }).catch(() => fallbackCopy(jsonStr));
        } else {
            fallbackCopy(jsonStr);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied products.json to clipboard!', 'success');
    }

    // Export Buttons
    const exportProductBtns = [btnDownloadProductsJson, btnDownloadProductsTop, btnAlertExport, btnQuickExportProducts, btnModalDownloadProducts];
    exportProductBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                downloadJsonFile('products.json', JSON.stringify(products, null, 4));
            });
        }
    });

    const copyJsonBtns = [btnCopyProductsJson, btnCopyJsonQuick, btnModalCopyJson];
    copyJsonBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', copyProductsJsonToClipboard);
        }
    });

    const exportSettingsBtns = [btnDownloadSettingsJson, btnModalDownloadSettings];
    exportSettingsBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                downloadJsonFile('settings.json', JSON.stringify(settings, null, 4));
            });
        }
    });

    // ============================================================
    // 100% AUTOMATED GITHUB & VERCEL AUTO-DEPLOY ENGINE
    // ============================================================

    const DEFAULT_GH_TOKEN = '';

    function getGitHubConfig() {
        let config = {
            repo: 'toqysfreefire-cmyk/zero-exception-panel',
            branch: 'main',
            token: DEFAULT_GH_TOKEN,
            autoDeploy: true
        };
        try {
            const raw = localStorage.getItem('zero_github_config');
            if (raw) {
                const parsed = JSON.parse(raw);
                config = { ...config, ...parsed };
                if (!config.token || config.token.trim() === '') {
                    config.token = DEFAULT_GH_TOKEN;
                }
            }
        } catch(e) {}
        return config;
    }

    function loadGitHubConfig() {
        const config = getGitHubConfig();
        if (ghRepoName) ghRepoName.value = config.repo || 'toqysfreefire-cmyk/zero-exception-panel';
        if (ghBranchName) ghBranchName.value = config.branch || 'main';
        if (ghPersonalToken) ghPersonalToken.value = config.token || DEFAULT_GH_TOKEN;
        if (ghAutoDeployOnSave) ghAutoDeployOnSave.checked = config.autoDeploy !== false;
        updateGitHubBadge(config);
    }

    function updateGitHubBadge(config) {
        const currentConfig = config || getGitHubConfig();
        const token = (currentConfig.token || '').trim();

        if (ghAutoDeployBadge) {
            if (token.length > 5) {
                if (currentConfig.autoDeploy !== false) {
                    ghAutoDeployBadge.className = 'sync-provider-badge active';
                    ghAutoDeployBadge.innerHTML = '🟢 Auto-Deploy Active (15s)';
                } else {
                    ghAutoDeployBadge.className = 'sync-provider-badge idle';
                    ghAutoDeployBadge.innerHTML = '🟡 Manual Deploy Mode';
                }
            } else {
                ghAutoDeployBadge.className = 'sync-provider-badge idle';
                ghAutoDeployBadge.innerHTML = '⚪ Enter Token to Enable';
            }
        }

        if (syncStatusBadge && syncStatusText) {
            if (token.length > 5 && currentConfig.autoDeploy !== false) {
                syncStatusBadge.className = 'sync-status-badge cloud-live';
                syncStatusText.textContent = '⚡ Auto-Deploy Active (15s)';
            } else {
                syncStatusBadge.className = 'sync-status-badge local-draft';
                syncStatusText.textContent = 'Local Store Active';
            }
        }
    }

    function saveGitHubConfigFromInputs() {
        const repo = ghRepoName ? ghRepoName.value.trim() : 'toqysfreefire-cmyk/zero-exception-panel';
        const branch = ghBranchName ? ghBranchName.value.trim() : 'main';
        const token = ghPersonalToken ? ghPersonalToken.value.trim() : '';
        const autoDeploy = ghAutoDeployOnSave ? ghAutoDeployOnSave.checked : true;

        const config = { repo, branch, token, autoDeploy };
        localStorage.setItem('zero_github_config', JSON.stringify(config));
        updateGitHubBadge(config);

        if (token.length > 5) {
            showToast('GitHub Auto-Deploy configuration saved! Auto-sync is active.', 'success');
        } else {
            showToast('GitHub settings saved. (Token is empty - Auto-Deploy idle)', 'info');
        }
    }

    if (btnSaveGitHubConfig) {
        btnSaveGitHubConfig.addEventListener('click', saveGitHubConfigFromInputs);
    }

    if (btnTriggerGitHubDeployNow) {
        btnTriggerGitHubDeployNow.addEventListener('click', () => {
            pushToGitHub({ silent: false });
        });
    }

    function utf8ToBase64(str) {
        try {
            return window.btoa(unescape(encodeURIComponent(str)));
        } catch(e) {
            const bytes = new TextEncoder().encode(str);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }
    }

    async function pushToGitHub(options = {}) {
        const config = getGitHubConfig();
        const token = (config.token || '').trim();
        const repo = (config.repo || 'toqysfreefire-cmyk/zero-exception-panel').trim();
        const branch = (config.branch || 'main').trim();

        if (!token) {
            if (!options.silent) {
                alert('⚠️ GitHub Personal Access Token is missing!\n\nPlease enter your GitHub token in Tab 6 and click "Save GitHub Settings".');
            }
            return false;
        }

        if (ghAutoDeployBadge) {
            ghAutoDeployBadge.className = 'sync-provider-badge syncing';
            ghAutoDeployBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Committing to GitHub...';
        }
        if (syncStatusBadge && syncStatusText) {
            syncStatusBadge.className = 'sync-status-badge syncing';
            syncStatusText.textContent = '⚡ Committing to Vercel...';
        }

        if (!options.silent) {
            showToast('Connecting to GitHub API...', 'info');
        }

        try {
            let commitSha = null;
            let success = false;

            // 1. Try Vercel Serverless Function /api/save-products
            try {
                const apiRes = await fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        products,
                        settings,
                        token,
                        repo,
                        branch
                    })
                });

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    commitSha = data.results?.products?.commit || 'serverless';
                    success = true;
                }
            } catch(e) {
                // Endpoint not available (e.g. running on local file system or static preview)
            }

            // 2. Direct GitHub REST API fallback (works 100% anywhere in browser)
            if (!success) {
                commitSha = await directGitHubCommit(repo, branch, token, 'products.json', JSON.stringify(products, null, 4));
                success = true;
            }

            if (ghAutoDeployBadge) {
                ghAutoDeployBadge.className = 'sync-provider-badge active';
                ghAutoDeployBadge.innerHTML = '🟢 Deployed! (~15s live)';
            }
            if (syncStatusBadge && syncStatusText) {
                syncStatusBadge.className = 'sync-status-badge cloud-live';
                syncStatusText.textContent = '🟢 Live on Vercel (~15s)';
            }
            setTimeout(() => updateGitHubBadge(config), 7000);

            const shortCommit = commitSha && commitSha.length >= 7 ? commitSha.substring(0, 7) : 'latest';
            showToast(`🚀 Auto-committed to GitHub (${shortCommit})! Vercel deploying live in ~15s.`, 'success');
            return true;
        } catch(err) {
            console.error('Push to GitHub error:', err);
            if (ghAutoDeployBadge) {
                ghAutoDeployBadge.className = 'sync-provider-badge error';
                ghAutoDeployBadge.innerHTML = '❌ Commit Error';
                setTimeout(() => updateGitHubBadge(config), 6000);
            }

            if (!options.silent) {
                alert('❌ GitHub Auto-Deploy Error:\n\n' + err.message + '\n\nPlease ensure your GitHub token has the "repo" scope checked and your repository name is correct.');
            } else {
                showToast('GitHub Auto-Deploy failed: ' + err.message, 'error');
            }
            return false;
        }
    }

    async function directGitHubCommit(repo, branch, token, path, contentStr) {
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

        // Get current SHA
        let currentSha = null;
        try {
            const getRes = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'Zero-Exception-Admin'
                }
            });
            if (getRes.ok) {
                const data = await getRes.json();
                currentSha = data.sha;
            }
        } catch(e) {}

        const base64Content = utf8ToBase64(contentStr);

        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Auto-update ${path} via ZERO Admin Console [deploy]`,
                content: base64Content,
                sha: currentSha || undefined,
                branch: branch
            })
        });

        if (!putRes.ok) {
            const errData = await putRes.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub HTTP ${putRes.status}`);
        }

        const putResult = await putRes.json();
        return putResult.commit?.sha || 'ok';
    }

    // Import products.json File
    if (btnTriggerImportProducts && importProductsFileInput) {
        btnTriggerImportProducts.addEventListener('click', () => importProductsFileInput.click());

        importProductsFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const parsed = JSON.parse(re.target.result);
                    let importedList = [];
                    if (Array.isArray(parsed)) {
                        importedList = parsed;
                    } else if (parsed.products && Array.isArray(parsed.products)) {
                        importedList = parsed.products;
                    } else {
                        alert('Invalid JSON file format. It must contain a products list.');
                        return;
                    }

                    if (importedList.length === 0) {
                        alert('No products found in the selected file.');
                        return;
                    }

                    products = importedList;
                    saveProducts();
                    renderCatalogCards();
                    updateStats();
        loadAndRenderUsers();
                    showToast(`Successfully imported ${products.length} products!`, 'success');
                } catch(err) {
                    alert('Error parsing JSON file: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

    // Reload from server products.json
    async function reloadFromServer() {
        if (confirm('Discard any local browser drafts and reload fresh products.json from the server?')) {
            try {
                const res = await fetch('/products.json?_t=' + Date.now(), { cache: 'no-store' });
                if (res.ok) {
                    products = await res.json();
                    localStorage.setItem('bpo_full_catalog_v2', JSON.stringify(products));
                    localStorage.removeItem('bpo_local_draft_active');
                    localStorage.removeItem('bpo_catalog_updated_at');
                    renderCatalogCards();
                    updateStats();
        loadAndRenderUsers();
                    showToast('Fresh server catalog loaded successfully!', 'success');
                } else {
                    alert('Could not load products.json from server.');
                }
            } catch(e) {
                alert('Error fetching products.json: ' + e.message);
            }
        }
    }

    if (btnReloadServerCatalog) btnReloadServerCatalog.addEventListener('click', reloadFromServer);
    if (btnReloadFromServer) btnReloadFromServer.addEventListener('click', reloadFromServer);

    // Reset to initial 18 default products
    function resetToDefaults() {
        if (confirm('Reset your catalog to the clean, original 18 default products?')) {
            products = getFallbackProducts();
            saveProducts();
            renderCatalogCards();
            updateStats();
        loadAndRenderUsers();
            showToast('Catalog reset to initial 18 products!', 'info');
        }
    }

    if (btnResetToDefaults) btnResetToDefaults.addEventListener('click', resetToDefaults);

    // Clean duplicates buttons
    const cleanDupBtns = [btnCleanDuplicatesSyncTab, btnCleanDuplicatesAlert, btnCleanDuplicates];
    cleanDupBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', cleanDuplicates);
    });

    // Deploy Modal Controls
    function openDeployModal() {
        if (netlifyDeployModal) netlifyDeployModal.classList.add('active');
    }
    function closeDeployModal() {
        if (netlifyDeployModal) netlifyDeployModal.classList.remove('active');
    }

    if (btnDeployNetlifyTop) btnDeployNetlifyTop.addEventListener('click', openDeployModal);
    if (btnCloseNetlifyDeployModal) btnCloseNetlifyDeployModal.addEventListener('click', closeDeployModal);
    if (netlifyDeployModal) {
        netlifyDeployModal.addEventListener('click', (e) => {
            if (e.target === netlifyDeployModal) closeDeployModal();
        });
    }

    // ============================================================
    // TAB 7: BACKUP & RESTORE
    // ============================================================
    if (btnExportFullBackup) {
        btnExportFullBackup.addEventListener('click', () => {
            const backup = {
                version: "2.0",
                exportedAt: new Date().toISOString(),
                products,
                settings
            };
            downloadJsonFile(`zero_exception_backup_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(backup, null, 4));
        });
    }

    if (btnTriggerRestoreUpload && backupFileInput) {
        btnTriggerRestoreUpload.addEventListener('click', () => backupFileInput.click());

        backupFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const parsed = JSON.parse(re.target.result);
                    if (parsed.products && Array.isArray(parsed.products)) {
                        products = parsed.products;
                        saveProducts();
                    }
                    if (parsed.settings) {
                        settings = { ...settings, ...parsed.settings };
                        saveSettings();
                    }
                    initDashboard();
                    showToast('Backup restored successfully!', 'success');
                } catch(err) {
                    alert('Invalid backup file. Ensure it is a valid JSON file.');
                }
            };
            reader.readAsText(file);
        });
    }

    if (btnFactoryReset) {
        btnFactoryReset.addEventListener('click', () => {
            if (confirm('⚠️ WARNING: This will reset all products and store settings to initial factory defaults!\nAre you sure you want to proceed?')) {
                localStorage.removeItem('bpo_full_catalog_v2');
                localStorage.removeItem('bpo_store_settings');
                products = getFallbackProducts();
                saveProducts();
                initDashboard();
                showToast('Factory reset complete. Initial defaults restored.', 'info');
            }
        });
    }

    // ============================================================
    // FALLBACK PRODUCTS DATASET
    // ============================================================
    function getFallbackProducts() {
        return [
            {
                "id": "drip-non-root",
                "title": "DRIP CLIENT NON ROOT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 53,
                "oldPrice": 112,
                "discount": "52% OFF",
                "status": "new",
                "statusText": "Update Released",
                "image": "images/drip_client_non_root.png",
                "description": "DRIP CLIENT NON ROOT APK mod injector with direct ESP.",
                "packages": [
                    { "name": "1 Day", "price": 53 },
                    { "name": "3 Days", "price": 140 },
                    { "name": "7 Days", "price": 224 },
                    { "name": "15 Days", "price": 413 },
                    { "name": "30 Days", "price": 700 }
                ]
            },
            {
                "id": "alpha-non-root",
                "title": "ALPHA NON ROOT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 70,
                "oldPrice": 140,
                "discount": "50% OFF",
                "status": "new",
                "statusText": "New Version",
                "image": "images/jitu.jpg",
                "description": "ALPHA NON ROOT headshot scope and ESP locator.",
                "packages": [
                    { "name": "1 Day", "price": 70 },
                    { "name": "3 Days", "price": 112 },
                    { "name": "7 Days", "price": 210 },
                    { "name": "14 Days", "price": 350 },
                    { "name": "30 Days", "price": 560 }
                ]
            },
            {
                "id": "aim-hack-ios",
                "title": "AIM HACK NON ROOT + IOS",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 231,
                "oldPrice": 350,
                "discount": "34% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/aim_hack_non_root_ios.png",
                "description": "AIM HACK for Free Fire Non Root + iOS.",
                "packages": [
                    { "name": "1 Day", "price": 231 },
                    { "name": "7 Days", "price": 602 },
                    { "name": "30 Days", "price": 1260 }
                ]
            },
            {
                "id": "bala-mod",
                "title": "BALA MOD NON ROOT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 28,
                "oldPrice": 70,
                "discount": "60% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/bala_mod_non_root.png",
                "description": "BALA MOD NON ROOT budget friendly panel key.",
                "packages": [
                    { "name": "1 Day", "price": 28 },
                    { "name": "3 Days", "price": 70 },
                    { "name": "7 Days", "price": 126 },
                    { "name": "15 Days", "price": 252 },
                    { "name": "30 Days", "price": 420 }
                ]
            },
            {
                "id": "pato-cheat",
                "title": "NON ROOT PATO CHEAT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 70,
                "oldPrice": 112,
                "discount": "37% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/non_root_pato.png",
                "description": "NON ROOT PATO CHEAT mod injector.",
                "packages": [
                    { "name": "1 Day", "price": 70 },
                    { "name": "7 Days", "price": 280 },
                    { "name": "30 Days", "price": 560 }
                ]
            },
            {
                "id": "abcd-mod",
                "title": "ABCD MOD NON ROOT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 56,
                "oldPrice": 98,
                "discount": "43% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/abcd_mod_non_root.png",
                "description": "ABCD MOD NON ROOT high accuracy mod key.",
                "packages": [
                    { "name": "1 Day", "price": 56 },
                    { "name": "7 Days", "price": 238 },
                    { "name": "30 Days", "price": 490 }
                ]
            },
            {
                "id": "xreg-non-root",
                "title": "XREG NON ROOT",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 98,
                "oldPrice": 168,
                "discount": "41% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/xreg_non_root.png",
                "description": "XREG NON ROOT registry tweak mod.",
                "packages": [
                    { "name": "1 Day", "price": 98 },
                    { "name": "7 Days", "price": 350 },
                    { "name": "30 Days", "price": 700 }
                ]
            },
            {
                "id": "crack-master",
                "title": "CRACK MASTER",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 70,
                "oldPrice": 112,
                "discount": "37% OFF",
                "status": "online",
                "statusText": "Online",
                "image": "images/crack_master.png",
                "description": "CRACK MASTER APK Mod Injector for Free Fire.",
                "packages": [
                    { "name": "1 Day", "price": 70 },
                    { "name": "3 Days", "price": 140 },
                    { "name": "7 Days", "price": 280 },
                    { "name": "15 Days", "price": 420 },
                    { "name": "30 Days", "price": 560 }
                ]
            },
            {
                "id": "drip-proxy",
                "title": "DRIP CLIENT FF PROXY",
                "category": "non-root",
                "categoryName": "Free Fire NON ROOT",
                "basePrice": 98,
                "oldPrice": 168,
                "discount": "41% OFF",
                "status": "new",
                "statusText": "New Release",
                "image": "images/drip_client_ff_proxy.png",
                "description": "DRIP CLIENT FF PROXY version bypass key.",
                "packages": [
                    { "name": "1 Day", "price": 98 },
                    { "name": "3 Days", "price": 224 },
                    { "name": "7 Days", "price": 406 },
                    { "name": "30 Days", "price": 812 }
                ]
            },
            {
                "id": "dolphin-root",
                "title": "DHOLPHIN ROOT ONLY",
                "category": "root",
                "categoryName": "FREE FIRE ROOT",
                "basePrice": 98,
                "oldPrice": 140,
                "discount": "30% OFF",
                "status": "online",
                "statusText": "Kernel Safe",
                "image": "images/dolphin_root_only.png",
                "description": "DHOLPHIN ROOT ONLY Magisk / KernelSU module root injector.",
                "packages": [
                    { "name": "1 Day", "price": 98 },
                    { "name": "7 Days", "price": 532 },
                    { "name": "30 Days", "price": 1372 }
                ]
            },
            {
                "id": "angry-mod-root",
                "title": "ANGRY MOD ROOT ONLY",
                "category": "root",
                "categoryName": "FREE FIRE ROOT",
                "basePrice": 98,
                "oldPrice": 140,
                "discount": "30% OFF",
                "status": "warning",
                "statusText": "Kernel Only",
                "image": "images/angry_mod_root_only.png",
                "description": "ANGRY MOD ROOT ONLY kernel safe mod menu injector.",
                "packages": [
                    { "name": "1 Day", "price": 98 },
                    { "name": "7 Days", "price": 420 },
                    { "name": "30 Days", "price": 1050 }
                ]
            },
            {
                "id": "drip-root-only",
                "title": "DRIP CLIENT ROOT ONLY",
                "category": "root",
                "categoryName": "FREE FIRE ROOT",
                "basePrice": 168,
                "oldPrice": 252,
                "discount": "33% OFF",
                "status": "online",
                "statusText": "Root Only",
                "image": "images/drip_client_root_only.png",
                "description": "DRIP CLIENT ROOT ONLY full featured menu.",
                "packages": [
                    { "name": "1 Day", "price": 168 },
                    { "name": "7 Days", "price": 700 },
                    { "name": "30 Days", "price": 1680 }
                ]
            },
            {
                "id": "migul-pro",
                "title": "MIGUL PRO AIM KILL",
                "category": "ios",
                "categoryName": "FREE FIRE IOS",
                "basePrice": 504,
                "oldPrice": 700,
                "discount": "28% OFF",
                "status": "online",
                "statusText": "VIP Pro",
                "image": "images/migul_pro_aim_kill.png",
                "description": "MIGUL PRO AIM KILL iOS / Android panel key.",
                "packages": [
                    { "name": "1 Day", "price": 504 },
                    { "name": "7 Days", "price": 1330 },
                    { "name": "31 Days", "price": 2800 }
                ]
            },
            {
                "id": "gbox-esign",
                "title": "GBOX & ESIGN",
                "category": "ios",
                "categoryName": "FREE FIRE IOS",
                "basePrice": 980,
                "oldPrice": 1260,
                "discount": "22% OFF",
                "status": "new",
                "statusText": "iOS Cert",
                "image": "images/gbox_esign.png",
                "description": "GBOX & ESIGN iOS installation signature key.",
                "packages": [
                    { "name": "30 Days Warranty", "price": 980 },
                    { "name": "60 Days Warranty", "price": 1190 },
                    { "name": "90 Days Warranty", "price": 1400 }
                ]
            },
            {
                "id": "br-mods-pc",
                "title": "BR MODS PC",
                "category": "pc",
                "categoryName": "FREE FIRE PC",
                "basePrice": 210,
                "oldPrice": 308,
                "discount": "31% OFF",
                "status": "online",
                "statusText": "Windows 10/11",
                "image": "images/br_mods_pc.png",
                "description": "BR MODS PC Mod Menu for Free Fire BlueStacks emulator.",
                "packages": [
                    { "name": "1 Day", "price": 210 },
                    { "name": "10 Days", "price": 700 },
                    { "name": "30 Days", "price": 980 }
                ]
            },
            {
                "id": "zolo-pubg",
                "title": "ZOLO PUBG MOBILE CHEAT",
                "category": "pubg",
                "categoryName": "PUBG MOBILE",
                "basePrice": 126,
                "oldPrice": 210,
                "discount": "40% OFF",
                "status": "online",
                "statusText": "Safe Mod",
                "image": "images/zolo_pubg.png",
                "description": "ZOLO PUBG Mobile Z Edition with Skeleton ESP.",
                "packages": [
                    { "name": "1 Day", "price": 126 },
                    { "name": "7 Days", "price": 490 },
                    { "name": "30 Days", "price": 980 }
                ]
            },
            {
                "id": "carrom-auto",
                "title": "CARROM Z TOOL AUTO PLAY",
                "category": "demo",
                "categoryName": "DEMO / TOOLS",
                "basePrice": 112,
                "oldPrice": 168,
                "discount": "33% OFF",
                "status": "online",
                "statusText": "100% Aim Line",
                "image": "images/carrom.png",
                "description": "CARROM Z Tool Auto Play guideline predictor.",
                "packages": [
                    { "name": "1 Day", "price": 112 },
                    { "name": "3 Days", "price": 280 },
                    { "name": "7 Days", "price": 490 },
                    { "name": "15 Days", "price": 700 },
                    { "name": "30 Days", "price": 980 }
                ]
            }
        ];
    }

    // ============================================================
    // TAB 8: SUPER ADMIN & TEAM ROLES MANAGEMENT ENGINE
    // ============================================================
    function setAllPerms(val) {
        const permsList = [
            permOrdersManage, permKeysAssign, permOrdersDelete, permWalletManage,
            permProductsManage, permProductsDelete, permFFAccountsManage, permBannersManage,
            permUsersManage, permCouponsManage, permPaymentsManage, permNoticesManage,
            permCurrenciesManage, permAdminsManage
        ];
        permsList.forEach(p => { if (p) p.checked = val; });
    }

    function applyRolePresetPermissions(role) {
        if (!permProductsManage) return;
        setAllPerms(false);

        const r = (role || '').toLowerCase();
        if (r === 'ceo') {
            // CEO: 100% Full Access
            setAllPerms(true);
        } else if (r === 'admin') {
            // Admin: Full operational control
            if (permOrdersManage) permOrdersManage.checked = true;
            if (permKeysAssign) permKeysAssign.checked = true;
            if (permOrdersDelete) permOrdersDelete.checked = true;
            if (permWalletManage) permWalletManage.checked = true;
            if (permProductsManage) permProductsManage.checked = true;
            if (permProductsDelete) permProductsDelete.checked = true;
            if (permFFAccountsManage) permFFAccountsManage.checked = true;
            if (permBannersManage) permBannersManage.checked = true;
            if (permUsersManage) permUsersManage.checked = true;
            if (permCouponsManage) permCouponsManage.checked = true;
            if (permPaymentsManage) permPaymentsManage.checked = true;
            if (permNoticesManage) permNoticesManage.checked = true;
            if (permCurrenciesManage) permCurrenciesManage.checked = true;
            if (permAdminsManage) permAdminsManage.checked = false;
        } else if (r === 'sub-admin' || r === 'subadmin') {
            // Sub Admin: Orders, Keys, Fund Requests, Catalog, Users view, Coupons, Notices
            if (permOrdersManage) permOrdersManage.checked = true;
            if (permKeysAssign) permKeysAssign.checked = true;
            if (permWalletManage) permWalletManage.checked = true;
            if (permProductsManage) permProductsManage.checked = true;
            if (permFFAccountsManage) permFFAccountsManage.checked = true;
            if (permBannersManage) permBannersManage.checked = true;
            if (permUsersManage) permUsersManage.checked = true;
            if (permCouponsManage) permCouponsManage.checked = true;
            if (permNoticesManage) permNoticesManage.checked = true;
        } else if (r === 'officer') {
            // Officer: Order delivery, Key assign, Fund request verification, Customer support
            if (permOrdersManage) permOrdersManage.checked = true;
            if (permKeysAssign) permKeysAssign.checked = true;
            if (permWalletManage) permWalletManage.checked = true;
            if (permNoticesManage) permNoticesManage.checked = true;
        }
    }

    if (btnSelectAllPerms) {
        btnSelectAllPerms.addEventListener('click', () => setAllPerms(true));
    }
    if (btnClearAllPerms) {
        btnClearAllPerms.addEventListener('click', () => setAllPerms(false));
    }

    function renderSubAdminsList() {
        if (!subAdminsContainer) return;
        subAdminsContainer.innerHTML = '';
        initAdminsArray();

        const subList = (settings.admins || []).filter(a => a.email.toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase());

        if (subList.length === 0) {
            subAdminsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: rgba(8, 15, 35, 0.6); border: 1.5px dashed rgba(0, 240, 255, 0.2); border-radius: 12px; grid-column: 1 / -1;">
                    <i class="fas fa-users-slash" style="font-size: 36px; color: rgba(0, 240, 255, 0.4); margin-bottom: 12px; display: block;"></i>
                    <h5 style="font-size: 16px; margin-bottom: 6px; color: #ffffff;">No secondary team members configured yet.</h5>
                    <p style="font-size: 13px; color: var(--adm-text-secondary); max-width: 480px; margin: 0 auto;">Click "+ Add Sub-Admin" above to add a CEO, Admin, Sub Admin, or Officer with customized privileges.</p>
                </div>
            `;
            return;
        }

        subList.forEach(admin => {
            const card = document.createElement('div');
            card.className = 'adm-panel';
            card.style.cssText = 'background: rgba(10, 18, 40, 0.85); border: 1.5px solid rgba(0, 240, 255, 0.2); border-radius: 12px; padding: 18px; margin-bottom: 12px; transition: transform 0.2s, box-shadow 0.2s;';

            const isSuspended = admin.status === 'suspended';
            const statusClass = isSuspended ? 'maintenance' : 'online';
            const statusText = isSuspended ? 'SUSPENDED' : 'ACTIVE';

            // Role Badge styling
            const roleStr = (admin.role || 'Admin').toUpperCase();
            let roleBadge = '';
            if (roleStr.includes('CEO')) {
                roleBadge = '<span style="background: linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); color: #fcd34d; border: 1px solid #f59e0b; padding: 3px 10px; border-radius: 8px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-crown"></i> CEO</span>';
            } else if (roleStr.includes('OFFICER')) {
                roleBadge = '<span style="background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2)); color: #6ee7b7; border: 1px solid #10b981; padding: 3px 10px; border-radius: 8px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-user-tie"></i> OFFICER</span>';
            } else if (roleStr.includes('SUB')) {
                roleBadge = '<span style="background: linear-gradient(135deg, rgba(0,240,255,0.2), rgba(6,182,212,0.2)); color: #67e8f9; border: 1px solid #00f0ff; padding: 3px 10px; border-radius: 8px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-bolt"></i> SUB ADMIN</span>';
            } else {
                roleBadge = '<span style="background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.2)); color: #c4b5fd; border: 1px solid #8b5cf6; padding: 3px 10px; border-radius: 8px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-shield-alt"></i> ADMIN</span>';
            }

            // Build granular permission badges
            const perms = admin.permissions || {};
            const permTags = [];
            if (perms.orders_manage) permTags.push('<span class="badge-tag" style="background: rgba(245, 158, 11, 0.15); color: #FCD34D;"><i class="fas fa-shopping-bag"></i> Orders</span>');
            if (perms.keys_assign) permTags.push('<span class="badge-tag" style="background: rgba(0, 240, 255, 0.15); color: #67E8F9;"><i class="fas fa-key"></i> Keys</span>');
            if (perms.wallet_manage) permTags.push('<span class="badge-tag" style="background: rgba(16, 185, 129, 0.15); color: #6EE7B7;"><i class="fas fa-wallet"></i> Funds</span>');
            if (perms.products_manage) permTags.push('<span class="badge-tag" style="background: rgba(59, 130, 246, 0.15); color: #93C5FD;"><i class="fas fa-boxes"></i> Products</span>');
            if (perms.products_delete) permTags.push('<span class="badge-tag" style="background: rgba(239, 68, 68, 0.15); color: #FCA5A5;"><i class="fas fa-trash"></i> Del Prod</span>');
            if (perms.ffaccounts_manage) permTags.push('<span class="badge-tag" style="background: rgba(34, 197, 94, 0.15); color: #86EFAC;"><i class="fas fa-gamepad"></i> FF Accounts</span>');
            if (perms.users_manage) permTags.push('<span class="badge-tag" style="background: rgba(139, 92, 246, 0.15); color: #C4B5FD;"><i class="fas fa-users"></i> Users</span>');
            if (perms.coupons_manage) permTags.push('<span class="badge-tag" style="background: rgba(236, 72, 153, 0.15); color: #F472B6;"><i class="fas fa-ticket-alt"></i> Promos</span>');
            if (perms.banners_manage) permTags.push('<span class="badge-tag" style="background: rgba(14, 165, 233, 0.15); color: #7DD3FC;"><i class="fas fa-images"></i> Banners</span>');
            if (perms.payments_manage) permTags.push('<span class="badge-tag" style="background: rgba(249, 115, 22, 0.15); color: #FDBA74;"><i class="fas fa-credit-card"></i> Gateways</span>');
            if (perms.notices_manage) permTags.push('<span class="badge-tag" style="background: rgba(234, 179, 8, 0.15); color: #FDE047;"><i class="fas fa-bullhorn"></i> Notices</span>');
            if (perms.currencies_manage) permTags.push('<span class="badge-tag" style="background: rgba(124, 58, 237, 0.15); color: #C4B5FD;"><i class="fas fa-coins"></i> Rates</span>');
            if (perms.admins_manage) permTags.push('<span class="badge-tag" style="background: rgba(239, 68, 68, 0.15); color: #FCA5A5;"><i class="fas fa-users-cog"></i> Roles</span>');

            card.innerHTML = `
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 14px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <h4 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0;">${admin.name}</h4>
                            ${roleBadge}
                            <span class="badge-tag ${statusClass}">${statusText}</span>
                        </div>
                        <p style="font-size: 13px; color: var(--adm-text-secondary); margin: 6px 0 0 0;">
                            <i class="fas fa-envelope" style="font-size: 11px;"></i> <strong>${admin.email}</strong> &bull; Password: <code>${admin.password}</code>
                        </p>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px;">
                            ${permTags.join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">
                        <button class="btn-card-action edit btn-edit-subadmin" style="padding: 7px 14px;">
                            <i class="fas fa-edit"></i> Edit Role
                        </button>
                        <button class="btn-card-action duplicate btn-toggle-subadmin" style="padding: 7px 14px; background: ${isSuspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${isSuspended ? '#6EE7B7' : '#FCD34D'}; border-color: ${isSuspended ? '#10B981' : '#F59E0B'};">
                            <i class="fas ${isSuspended ? 'fa-play' : 'fa-pause'}"></i> ${isSuspended ? 'Activate' : 'Suspend'}
                        </button>
                        <button class="btn-card-action delete btn-del-subadmin" style="padding: 7px 14px;">
                            <i class="fas fa-trash-alt"></i> Remove
                        </button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-edit-subadmin').addEventListener('click', () => openEditSubAdminModal(admin));
            card.querySelector('.btn-toggle-subadmin').addEventListener('click', () => toggleSubAdminStatus(admin));
            card.querySelector('.btn-del-subadmin').addEventListener('click', () => deleteSubAdmin(admin));

            subAdminsContainer.appendChild(card);
        });
    }

    if (btnOpenAddSubAdmin) {
        btnOpenAddSubAdmin.addEventListener('click', () => {
            if (subAdminForm) subAdminForm.reset();
            if (subAdminEditId) subAdminEditId.value = '';
            document.getElementById('subAdminModalTitle').innerHTML = '<i class="fas fa-user-plus" style="color: #00f0ff;"></i> Add Team Member &amp; Role';
            if (subAdminRoleSelect) subAdminRoleSelect.value = 'admin';
            applyRolePresetPermissions('admin');
            if (subAdminModal) subAdminModal.style.display = 'flex';
        });
    }

    if (btnCloseSubAdminModal) {
        btnCloseSubAdminModal.addEventListener('click', () => {
            if (subAdminModal) subAdminModal.style.display = 'none';
        });
    }
    if (btnCancelSubAdminModal) {
        btnCancelSubAdminModal.addEventListener('click', () => {
            if (subAdminModal) subAdminModal.style.display = 'none';
        });
    }

    if (subAdminRoleSelect) {
        subAdminRoleSelect.addEventListener('change', (e) => {
            applyRolePresetPermissions(e.target.value);
        });
    }

    if (subAdminForm) {
        subAdminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = subAdminName.value.trim();
            const email = subAdminEmail.value.trim().toLowerCase();
            const password = subAdminPassword.value;
            const roleSelectVal = subAdminRoleSelect.value;
            const status = subAdminStatusSelect.value;

            if (email === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
                alert('This email is reserved exclusively for the Main Server Admin.');
                return;
            }

            let roleName = 'Admin';
            if (roleSelectVal === 'ceo') roleName = 'CEO';
            else if (roleSelectVal === 'admin') roleName = 'Admin';
            else if (roleSelectVal === 'sub-admin') roleName = 'Sub Admin';
            else if (roleSelectVal === 'officer') roleName = 'Officer';

            const permissions = {
                orders_manage: permOrdersManage ? permOrdersManage.checked : true,
                keys_assign: permKeysAssign ? permKeysAssign.checked : true,
                orders_delete: permOrdersDelete ? permOrdersDelete.checked : false,
                wallet_manage: permWalletManage ? permWalletManage.checked : true,
                products_manage: permProductsManage ? permProductsManage.checked : true,
                products_delete: permProductsDelete ? permProductsDelete.checked : false,
                ffaccounts_manage: permFFAccountsManage ? permFFAccountsManage.checked : true,
                banners_manage: permBannersManage ? permBannersManage.checked : true,
                users_manage: permUsersManage ? permUsersManage.checked : true,
                coupons_manage: permCouponsManage ? permCouponsManage.checked : true,
                payments_manage: permPaymentsManage ? permPaymentsManage.checked : false,
                notices_manage: permNoticesManage ? permNoticesManage.checked : true,
                currencies_manage: permCurrenciesManage ? permCurrenciesManage.checked : false,
                admins_manage: permAdminsManage ? permAdminsManage.checked : false
            };

            initAdminsArray();
            const editId = subAdminEditId.value;

            if (editId) {
                // Editing existing sub-admin
                const idx = settings.admins.findIndex(a => a.id === editId);
                if (idx !== -1) {
                    settings.admins[idx] = {
                        ...settings.admins[idx],
                        name,
                        email,
                        password,
                        role: roleName,
                        status,
                        permissions
                    };
                    saveSettings();
                    showToast(`Updated team member: ${name} (${roleName})!`, 'success');
                }
            } else {
                // Creating new sub-admin
                const existing = settings.admins.find(a => a.email.toLowerCase() === email);
                if (existing) {
                    alert(`An admin account with email "${email}" already exists.`);
                    return;
                }

                const newAdmin = {
                    id: 'admin-' + Date.now().toString().slice(-6),
                    name,
                    email,
                    password,
                    role: roleName,
                    isSuperAdmin: (roleSelectVal === 'ceo'),
                    status,
                    permissions,
                    createdAt: new Date().toISOString()
                };

                settings.admins.push(newAdmin);
                saveSettings();
                showToast(`New team member "${name}" (${roleName}) added successfully!`, 'success');
            }

            if (subAdminModal) subAdminModal.style.display = 'none';
            renderSubAdminsList();
        });
    }

    function openEditSubAdminModal(admin) {
        if (!subAdminModal) return;
        document.getElementById('subAdminModalTitle').innerHTML = `<i class="fas fa-edit" style="color: #00f0ff;"></i> Edit Team Member: ${admin.name}`;
        subAdminEditId.value = admin.id;
        subAdminName.value = admin.name;
        subAdminEmail.value = admin.email;
        subAdminPassword.value = admin.password;
        subAdminStatusSelect.value = admin.status || 'active';

        // Map role
        const r = (admin.role || '').toLowerCase();
        if (r.includes('ceo')) subAdminRoleSelect.value = 'ceo';
        else if (r.includes('officer')) subAdminRoleSelect.value = 'officer';
        else if (r.includes('sub')) subAdminRoleSelect.value = 'sub-admin';
        else subAdminRoleSelect.value = 'admin';

        const perms = admin.permissions || {};
        if (permOrdersManage) permOrdersManage.checked = perms.orders_manage !== false;
        if (permKeysAssign) permKeysAssign.checked = perms.keys_assign !== false;
        if (permOrdersDelete) permOrdersDelete.checked = perms.orders_delete === true;
        if (permWalletManage) permWalletManage.checked = perms.wallet_manage !== false;
        if (permProductsManage) permProductsManage.checked = perms.products_manage !== false;
        if (permProductsDelete) permProductsDelete.checked = perms.products_delete === true;
        if (permFFAccountsManage) permFFAccountsManage.checked = perms.ffaccounts_manage !== false;
        if (permBannersManage) permBannersManage.checked = perms.banners_manage !== false;
        if (permUsersManage) permUsersManage.checked = perms.users_manage !== false;
        if (permCouponsManage) permCouponsManage.checked = perms.coupons_manage !== false;
        if (permPaymentsManage) permPaymentsManage.checked = perms.payments_manage === true;
        if (permNoticesManage) permNoticesManage.checked = perms.notices_manage !== false;
        if (permCurrenciesManage) permCurrenciesManage.checked = perms.currencies_manage === true;
        if (permAdminsManage) permAdminsManage.checked = perms.admins_manage === true;

        subAdminModal.style.display = 'flex';
    }

    function toggleSubAdminStatus(admin) {
        const newStatus = admin.status === 'suspended' ? 'active' : 'suspended';
        const actionWord = newStatus === 'active' ? 'activate' : 'suspend';
        if (confirm(`Are you sure you want to ${actionWord} the admin account for "${admin.name}"?`)) {
            admin.status = newStatus;
            saveSettings();
            renderSubAdminsList();
            showToast(`Admin account "${admin.name}" is now ${newStatus.toUpperCase()}.`, 'info');
        }
    }

    function deleteSubAdmin(admin) {
        if (confirm(`Are you sure you want to permanently remove admin "${admin.name}" (${admin.email})?\nThey will no longer be able to log in.`)) {
            settings.admins = settings.admins.filter(a => a.id !== admin.id);
            saveSettings();
            renderSubAdminsList();
            showToast(`Admin "${admin.name}" removed.`, 'info');
        }
    }

    // Super Admin Master Password Form Toggle & Submit
    if (btnToggleChangeSuperPass && superAdminPassForm) {
        btnToggleChangeSuperPass.addEventListener('click', () => {
            const isHidden = superAdminPassForm.style.display === 'none';
            superAdminPassForm.style.display = isHidden ? 'block' : 'none';
        });
    }

    if (formChangeSuperPass) {
        formChangeSuperPass.addEventListener('submit', (e) => {
            e.preventDefault();
            const pass1 = newSuperPass.value;
            const pass2 = confirmSuperPass.value;

            if (pass1.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            if (pass1 !== pass2) {
                alert('Passwords do not match! Please check again.');
                return;
            }

            localStorage.setItem('zero_super_admin_pass', pass1);
            initAdminsArray();
            if (settings.admins && settings.admins.length > 0) {
                settings.admins[0].password = pass1;
                saveSettings();
            }
            formChangeSuperPass.reset();
            superAdminPassForm.style.display = 'none';
            showToast('Master Admin password successfully updated!', 'success');
        });
    }


    // ============================================================
    // USERS & RESELLERS MANAGEMENT ENGINE
    // ============================================================
    let usersList = [];
    let activeUserFilter = 'all';
    let userSearchQuery = '';
    let globalResellerDiscount = 15;
    let globalSubResellerDiscount = 10;

    const usersCardsContainer = document.getElementById('usersCardsContainer');
    const usersSearchInput = document.getElementById('usersSearchInput');
    const usersFilterChips = document.getElementById('usersFilterChips');
    const btnReloadUsersList = document.getElementById('btnReloadUsersList');
    const btnOpenAddUserModal = document.getElementById('btnOpenAddUserModal');
    const btnSaveGlobalResellerRates = document.getElementById('btnSaveGlobalResellerRates');
    const inputGlobalResellerRate = document.getElementById('inputGlobalResellerRate');
    const inputGlobalSubResellerRate = document.getElementById('inputGlobalSubResellerRate');

    // User Edit Modal Elements
    const userEditModal = document.getElementById('userEditModal');
    const btnCloseUserEditModal = document.getElementById('btnCloseUserEditModal');
    const btnCancelUserEditModal = document.getElementById('btnCancelUserEditModal');
    const formUserEdit = document.getElementById('formUserEdit');
    const userEditModalTitle = document.getElementById('userEditModalTitle');
    const modalUserId = document.getElementById('modalUserId');
    const modalUserDisplayId = document.getElementById('modalUserDisplayId');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const modalUserPhone = document.getElementById('modalUserPhone');
    const modalUserPassword = document.getElementById('modalUserPassword');
    const modalUserRoleSelect = document.getElementById('modalUserRoleSelect');
    const modalUserDiscountInput = document.getElementById('modalUserDiscountInput');
    const modalUserWalletBalance = document.getElementById('modalUserWalletBalance');
    const modalUserWalletHint = document.getElementById('modalUserWalletHint');
    const modalUserSpinCredits = document.getElementById('modalUserSpinCredits');
    const modalUserSpinHint = document.getElementById('modalUserSpinHint');
    const modalUserVipAction = document.getElementById('modalUserVipAction');
    const modalUserVipHint = document.getElementById('modalUserVipHint');
    const modalUserMysteryBoxes = document.getElementById('modalUserMysteryBoxes');
    const modalUserMysteryHint = document.getElementById('modalUserMysteryHint');
    const modalUserGiftCards = document.getElementById('modalUserGiftCards');
    const modalUserGiftCardsHint = document.getElementById('modalUserGiftCardsHint');

    async function loadAndRenderUsers() {
        try {
            const res = await fetch('/api/admin/users?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                usersList = data.users || [];
                if (data.settings) {
                    globalResellerDiscount = data.settings.reseller_default_discount || 15;
                    globalSubResellerDiscount = data.settings.sub_reseller_default_discount || 10;
                    if (inputGlobalResellerRate) inputGlobalResellerRate.value = globalResellerDiscount;
                    if (inputGlobalSubResellerRate) inputGlobalSubResellerRate.value = globalSubResellerDiscount;
                    const statDefaultRates = document.getElementById('statDefaultRates');
                    if (statDefaultRates) statDefaultRates.textContent = `${globalResellerDiscount}% / ${globalSubResellerDiscount}%`;
                }
                updateUserStats();
                renderUsersCards();
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }

    function updateUserStats() {
        const statTotalUsers = document.getElementById('statTotalUsers');
        const statTotalResellers = document.getElementById('statTotalResellers');
        const statTotalSubResellers = document.getElementById('statTotalSubResellers');
        const chipCountUsersAll = document.getElementById('chipCountUsersAll');
        const chipCountUsersReseller = document.getElementById('chipCountUsersReseller');
        const chipCountUsersSub = document.getElementById('chipCountUsersSub');
        const chipCountUsersCustomer = document.getElementById('chipCountUsersCustomer');

        const resellers = usersList.filter(u => u.role === 'reseller');
        const subs = usersList.filter(u => u.role === 'sub_reseller' || u.role === 'sub-reseller');
        const customers = usersList.filter(u => u.role === 'user' || (!u.role || u.role === 'customer'));

        if (statTotalUsers) statTotalUsers.textContent = usersList.length;
        if (statTotalResellers) statTotalResellers.textContent = resellers.length;
        if (statTotalSubResellers) statTotalSubResellers.textContent = subs.length;

        if (chipCountUsersAll) chipCountUsersAll.textContent = usersList.length;
        if (chipCountUsersReseller) chipCountUsersReseller.textContent = resellers.length;
        if (chipCountUsersSub) chipCountUsersSub.textContent = subs.length;
        if (chipCountUsersCustomer) chipCountUsersCustomer.textContent = customers.length;
    }

    function renderUsersCards() {
        if (!usersCardsContainer) return;
        usersCardsContainer.innerHTML = '';

        const query = (userSearchQuery || '').toLowerCase().trim();
        const filtered = usersList.filter(u => {
            const matchesFilter = activeUserFilter === 'all' || 
                (activeUserFilter === 'reseller' && u.role === 'reseller') ||
                (activeUserFilter === 'sub_reseller' && (u.role === 'sub_reseller' || u.role === 'sub-reseller')) ||
                (activeUserFilter === 'user' && (u.role === 'user' || !u.role || u.role === 'customer'));

            const matchesSearch = !query || 
                String(u.id).toLowerCase().includes(query) ||
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.phone && String(u.phone).toLowerCase().includes(query));

            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            usersCardsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--adm-surface); border-radius: var(--adm-radius); border: 1.5px dashed var(--adm-border);">
                    <i class="fas fa-user-slash" style="font-size: 32px; color: var(--adm-text-muted); margin-bottom: 12px; display: block;"></i>
                    <h4 style="font-size: 16px;">No user accounts match your search or filter.</h4>
                    <p style="font-size: 12px; color: var(--adm-text-secondary); margin-top: 4px;">Try searching by different ID or keyword, or click "Add User / Reseller" to create one.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(u => {
            const isReseller = u.role === 'reseller';
            const isSub = u.role === 'sub_reseller' || u.role === 'sub-reseller';
            const isAdminUser = u.role === 'admin';

            let roleBadgeClass = 'role-customer';
            let roleBadgeText = 'Customer';

            if (isReseller) {
                roleBadgeClass = 'role-reseller';
                roleBadgeText = '?? Reseller';
            } else if (isSub) {
                roleBadgeClass = 'role-subreseller';
                roleBadgeText = '?? Sub-Reseller';
            } else if (isAdminUser) {
                roleBadgeClass = 'role-admin';
                roleBadgeText = '??? Admin';
            }

            const effectiveDiscount = u.discount_percent !== undefined && u.discount_percent !== null ? u.discount_percent : (
                isReseller ? globalResellerDiscount : (isSub ? globalSubResellerDiscount : 0)
            );

            const card = document.createElement('div');
            card.className = `user-card-item ${isReseller ? 'is-reseller' : (isSub ? 'is-subreseller' : '')}`;
            card.dataset.userId = u.id;

            card.innerHTML = `
                <div>
                    <div class="user-card-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="user-id-pill" title="User Account ID">ID: ${u.id}</span>
                            <span class="role-badge-tag ${roleBadgeClass}">${roleBadgeText}</span>
                        </div>
                        <span style="font-size: 12px; font-weight: 800; color: ${effectiveDiscount > 0 ? '#10B981' : 'var(--adm-text-secondary)'};">
                            ${effectiveDiscount > 0 ? `<i class="fas fa-tags"></i> ${effectiveDiscount}% OFF` : 'No Discount'}
                        </span>
                    </div>

                    <div class="user-card-body" style="margin-top: 14px;">
                        <h4>${u.name || 'Unnamed User'}</h4>
                        <div class="user-meta-line"><i class="fas fa-envelope"></i> <span>${u.email}</span></div>
                        <div class="user-meta-line"><i class="fab fa-whatsapp"></i> <span>${u.phone || 'No phone number'}</span></div>
                        <div class="user-meta-line"><i class="fas fa-wallet" style="color: #10b981;"></i> <span>Wallet: <b style="color: #10b981; font-family: 'Orbitron', monospace;">${u.wallet_balance || 0}৳</b></span></div>

                        <div class="user-stats-quick-edit" data-user-id="${u.id}" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin: 10px 0 8px 0; background: rgba(0,0,0,0.35); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-size: 11.5px; cursor: pointer; transition: all 0.2s;" title="Click to edit Spins, VIP, Mystery Box & Gift Cards">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-dharmachakra" style="color: #00f0ff;"></i>
                                <span>Spins: <b style="color: #00f0ff; font-weight: 800;">${u.spin_credits || 0} টি</b></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-crown" style="color: #eab308;"></i>
                                <span>VIP: <b style="color: ${u.is_vip ? '#10b981' : '#94a3b8'}; font-weight: 800;" title="${u.is_vip ? 'Expires: ' + (u.vip_until ? new Date(u.vip_until).toLocaleDateString() : 'N/A') : 'No VIP'}">${u.is_vip ? 'Active' : 'No'}</b></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-box-open" style="color: #ec4899;"></i>
                                <span>Mystery: <b style="color: #ec4899; font-weight: 800;">${u.mystery_boxes_opened || 0} টি</b></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-gift" style="color: #a855f7;"></i>
                                <span>Gift Card: <b style="color: #a855f7; font-weight: 800;">${u.gift_cards_count || 0} টি</b></span>
                            </div>
                        </div>
                        ${u.fraud_blocked ? `
                            <div style="margin-top: 6px; padding: 5px 8px; border-radius: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-ban"></i> <b>FRAUD BLOCKED (${u.fraud_attempts || 0} attempts)</b></span>
                                <button type="button" class="btn-unblock-fraud" data-user-id="${u.id}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 8px; font-size: 10px; cursor: pointer; font-weight: bold;">Unblock</button>
                            </div>
                        ` : (u.fraud_attempts > 0 ? `
                            <div style="margin-top: 6px; font-size: 11px; color: #f59e0b; display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-exclamation-triangle"></i> Suspicious TrxID: ${u.fraud_attempts} attempts</span>
                                <button type="button" class="btn-unblock-fraud" data-user-id="${u.id}" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; padding: 1px 6px; font-size: 10px; cursor: pointer; font-weight: bold;">Reset</button>
                            </div>
                        ` : '')}
                        ${u.created_at ? `<div class="user-meta-line" style="font-size: 11px; opacity: 0.6; margin-top: 4px;"><i class="fas fa-clock"></i> <span>Joined: ${new Date(u.created_at).toLocaleDateString()}</span></div>` : ''}

                        <!-- Quick Role & Discount Assignment Panel -->
                        <div class="user-quick-panel">
                            <div class="user-quick-panel-title">
                                <span><i class="fas fa-user-cog"></i> Role &amp; Discount</span>
                                <span style="color: var(--adm-accent); font-weight: 700;">Quick Save</span>
                            </div>
                            <div class="user-quick-grid">
                                <div>
                                    <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 3px;">Assigned Role</label>
                                    <select class="user-role-select" data-user-id="${u.id}">
                                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Customer Account</option>
                                        <option value="reseller" ${isReseller ? 'selected' : ''}>👑 Reseller</option>
                                        <option value="sub_reseller" ${isSub ? 'selected' : ''}>💎 Sub-Reseller</option>
                                        ${isAdminUser ? `<option value="admin" selected>👑 Administrator</option>` : ''}
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 3px;">Discount (%)</label>
                                    <input type="number" min="0" max="90" step="1" class="user-discount-input" data-user-id="${u.id}" value="${effectiveDiscount}" placeholder="0">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="user-card-footer">
                    <button type="button" class="btn-primary-save btn-apply-role" data-user-id="${u.id}" style="flex: 1; justify-content: center; padding: 8px 12px; font-size: 12.5px;">
                        <i class="fas fa-check"></i> Apply / Save
                    </button>
                    <button type="button" class="btn-secondary-cancel btn-open-add-for-user" data-user-id="${u.id}" style="padding: 8px 10px; font-size: 12.5px; color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1);" title="Add Money / Credit Wallet Balance">
                        <i class="fas fa-plus-circle"></i> Add Money
                    </button>
                    <button type="button" class="btn-secondary-cancel btn-open-deduct-for-user" data-user-id="${u.id}" style="padding: 8px 10px; font-size: 12.5px; color: #f87171;" title="Deduct / Remove Wallet Balance">
                        <i class="fas fa-minus-circle"></i> Deduct
                    </button>
                    <button type="button" class="btn-secondary-cancel btn-edit-user" data-user-id="${u.id}" style="padding: 8px 12px; font-size: 12.5px;" title="Edit Full Account Info">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${!isAdminUser ? `
                    <button type="button" class="btn-secondary-cancel btn-del-user" data-user-id="${u.id}" data-user-name="${u.name || u.email}" style="padding: 8px 10px; font-size: 12.5px; color: #F87171;" title="Delete User">
                        <i class="fas fa-trash-alt"></i>
                    </button>` : ''}
                </div>
            `;

            // Auto-adjust discount input when role select changes
            const roleSelect = card.querySelector('.user-role-select');
            const discountInput = card.querySelector('.user-discount-input');
            if (roleSelect && discountInput) {
                roleSelect.addEventListener('change', (e) => {
                    const selRole = e.target.value;
                    if (selRole === 'reseller') {
                        discountInput.value = globalResellerDiscount;
                    } else if (selRole === 'sub_reseller') {
                        discountInput.value = globalSubResellerDiscount;
                    } else if (selRole === 'user') {
                        discountInput.value = 0;
                    }
                });
            }

            // Quick Apply / Save Button Handler
            const applyBtn = card.querySelector('.btn-apply-role');
            if (applyBtn) {
                applyBtn.addEventListener('click', async () => {
                    const chosenRole = roleSelect.value;
                    const chosenDiscount = Number(discountInput.value) || 0;
                    applyBtn.disabled = true;
                    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                    try {
                        const postRes = await fetch('/api/admin/users/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: u.id,
                                role: chosenRole,
                                discount_percent: chosenDiscount
                            })
                        });
                        const resData = await postRes.json();
                        if (resData.success) {
                            showToast(resData.message || 'Updated successfully!', 'success');
                            await loadAndRenderUsers();
                        } else {
                            alert(resData.error || 'Failed to update user.');
                        }
                    } catch (e) {
                        alert('Network error updating user: ' + e.message);
                    } finally {
                        applyBtn.disabled = false;
                        applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply / Save';
                    }
                });
            }

            // Edit Full Details Modal Trigger
            const editBtn = card.querySelector('.btn-edit-user');
            if (editBtn) {
                editBtn.addEventListener('click', () => openEditUserModal(u));
            }

            const statsQuickEdit = card.querySelector('.user-stats-quick-edit');
            if (statsQuickEdit) {
                statsQuickEdit.addEventListener('click', () => openEditUserModal(u));
            }

            // Quick Add Money Trigger
            const addUserBtn = card.querySelector('.btn-open-add-for-user');
            if (addUserBtn) {
                addUserBtn.addEventListener('click', () => openDirectAddFundModal(u.id));
            }

            // Quick Deduct Wallet Trigger
            const deductUserBtn = card.querySelector('.btn-open-deduct-for-user');
            if (deductUserBtn) {
                deductUserBtn.addEventListener('click', () => openDeductFundModal(u.id));
            }

            // Delete User Trigger
            const delBtn = card.querySelector('.btn-del-user');
            if (delBtn) {
                delBtn.addEventListener('click', () => deleteUserAccount(u.id, u.name || u.email));
            }

            usersCardsContainer.appendChild(card);
        });
    }

    // Modal: Open for Editing
    function openEditUserModal(user) {
        if (!userEditModal) return;
        userEditModalTitle.innerHTML = `<i class="fas fa-user-edit" style="color: var(--adm-accent);"></i> Edit User: ${user.name || user.email}`;
        modalUserId.value = user.id;
        modalUserDisplayId.value = user.id;
        modalUserName.value = user.name || '';
        modalUserEmail.value = user.email || '';
        modalUserPhone.value = user.phone || '';
        modalUserPassword.value = '';
        modalUserPassword.placeholder = 'Leave blank to keep current password';
        modalUserPassword.required = false;
        modalUserRoleSelect.value = user.role || 'user';

        if (modalUserWalletBalance) {
            modalUserWalletBalance.value = user.wallet_balance !== undefined ? user.wallet_balance : 0;
        }
        if (modalUserWalletHint) {
            modalUserWalletHint.textContent = `Current: ${user.wallet_balance || 0}৳`;
        }

        if (modalUserSpinCredits) {
            modalUserSpinCredits.value = user.spin_credits !== undefined ? user.spin_credits : 0;
        }
        if (modalUserSpinHint) {
            modalUserSpinHint.textContent = `Current: ${user.spin_credits || 0}`;
        }

        if (modalUserVipAction) modalUserVipAction.value = 'keep';
        if (modalUserVipHint) {
            modalUserVipHint.textContent = user.is_vip ? `Active (until ${user.vip_until ? new Date(user.vip_until).toLocaleDateString() : 'N/A'})` : 'No VIP';
            modalUserVipHint.style.color = user.is_vip ? '#10b981' : '#94a3b8';
        }

        if (modalUserMysteryBoxes) {
            modalUserMysteryBoxes.value = user.mystery_boxes_opened !== undefined ? user.mystery_boxes_opened : 0;
        }
        if (modalUserMysteryHint) {
            modalUserMysteryHint.textContent = `Current: ${user.mystery_boxes_opened || 0}`;
        }

        if (modalUserGiftCards) {
            modalUserGiftCards.value = user.gift_cards_count !== undefined ? user.gift_cards_count : 0;
        }
        if (modalUserGiftCardsHint) {
            modalUserGiftCardsHint.textContent = `Current: ${user.gift_cards_count || 0}`;
        }

        const isReseller = user.role === 'reseller';
        const isSub = user.role === 'sub_reseller' || user.role === 'sub-reseller';
        modalUserDiscountInput.value = user.discount_percent !== undefined && user.discount_percent !== null ? user.discount_percent : (
            isReseller ? globalResellerDiscount : (isSub ? globalSubResellerDiscount : 0)
        );

        userEditModal.style.display = 'flex';
    }

    // Modal: Open for Adding New User
    function openAddUserModal() {
        if (!userEditModal) return;
        userEditModalTitle.innerHTML = `<i class="fas fa-user-plus" style="color: var(--adm-accent);"></i> Add New User / Reseller`;
        modalUserId.value = '';
        modalUserDisplayId.value = 'Auto-Generated on Save';
        modalUserName.value = '';
        modalUserEmail.value = '';
        modalUserPhone.value = '';
        modalUserPassword.value = '';
        modalUserPassword.placeholder = 'Enter password for this account';
        modalUserPassword.required = true;
        modalUserRoleSelect.value = 'reseller';
        modalUserDiscountInput.value = globalResellerDiscount;

        if (modalUserWalletBalance) modalUserWalletBalance.value = 0;
        if (modalUserWalletHint) modalUserWalletHint.textContent = 'Current: 0৳';
        if (modalUserSpinCredits) modalUserSpinCredits.value = 0;
        if (modalUserSpinHint) modalUserSpinHint.textContent = 'Current: 0';
        if (modalUserVipAction) modalUserVipAction.value = 'keep';
        if (modalUserVipHint) {
            modalUserVipHint.textContent = 'No VIP';
            modalUserVipHint.style.color = '#94a3b8';
        }
        if (modalUserMysteryBoxes) modalUserMysteryBoxes.value = 0;
        if (modalUserMysteryHint) modalUserMysteryHint.textContent = 'Current: 0';
        if (modalUserGiftCards) modalUserGiftCards.value = 0;
        if (modalUserGiftCardsHint) modalUserGiftCardsHint.textContent = 'Current: 0';

        userEditModal.style.display = 'flex';
    }

    // Role select in modal changes discount default
    if (modalUserRoleSelect && modalUserDiscountInput) {
        modalUserRoleSelect.addEventListener('change', (e) => {
            const selRole = e.target.value;
            if (selRole === 'reseller') {
                modalUserDiscountInput.value = globalResellerDiscount;
            } else if (selRole === 'sub_reseller') {
                modalUserDiscountInput.value = globalSubResellerDiscount;
            } else if (selRole === 'user') {
                modalUserDiscountInput.value = 0;
            }
        });
    }

    // Save Modal Form (Handles both Add & Edit)
    if (formUserEdit) {
        formUserEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = modalUserId.value;
            const name = modalUserName.value.trim();
            const email = modalUserEmail.value.trim();
            const phone = modalUserPhone.value.trim();
            const password = modalUserPassword.value.trim();
            const role = modalUserRoleSelect.value;
            const discount_percent = Number(modalUserDiscountInput.value) || 0;
            const wallet_balance = modalUserWalletBalance ? parseFloat(modalUserWalletBalance.value) : undefined;
            const spin_credits = modalUserSpinCredits ? parseInt(modalUserSpinCredits.value) : undefined;
            const mystery_boxes_opened = modalUserMysteryBoxes ? parseInt(modalUserMysteryBoxes.value) : undefined;
            const gift_cards_count = modalUserGiftCards ? parseInt(modalUserGiftCards.value) : undefined;
            const vip_action = modalUserVipAction ? modalUserVipAction.value : 'keep';

            const endpoint = editId ? '/api/admin/users/update' : '/api/admin/users/add';
            const payload = {
                id: editId || undefined,
                name,
                email,
                phone,
                role,
                discount_percent,
                wallet_balance: !isNaN(wallet_balance) ? wallet_balance : 0,
                spin_credits: !isNaN(spin_credits) ? spin_credits : 0,
                mystery_boxes_opened: !isNaN(mystery_boxes_opened) ? mystery_boxes_opened : 0,
                gift_cards_count: !isNaN(gift_cards_count) ? gift_cards_count : 0,
                vip_action
            };
            if (password) payload.password = password;

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Saved successfully!', 'success');
                    if (userEditModal) userEditModal.style.display = 'none';
                    await loadAndRenderUsers();
                } else {
                    alert(data.error || 'Failed to save user.');
                }
            } catch (err) {
                alert('Network error: ' + err.message);
            }
        });
    }

    // Modal Close Triggers
    if (btnCloseUserEditModal) {
        btnCloseUserEditModal.addEventListener('click', () => {
            if (userEditModal) userEditModal.style.display = 'none';
        });
    }
    if (btnCancelUserEditModal) {
        btnCancelUserEditModal.addEventListener('click', () => {
            if (userEditModal) userEditModal.style.display = 'none';
        });
    }
    if (btnOpenAddUserModal) {
        btnOpenAddUserModal.addEventListener('click', openAddUserModal);
    }
    const btnOpenAddMoneyUsersTab = document.getElementById('btnOpenAddMoneyFromUsersTab');
    if (btnOpenAddMoneyUsersTab) {
        btnOpenAddMoneyUsersTab.addEventListener('click', () => openDirectAddFundModal());
    }
    if (btnReloadUsersList) {
        btnReloadUsersList.addEventListener('click', async () => {
            await loadAndRenderUsers();
            showToast('Refreshed user accounts from server!', 'info');
        });
    }

    // Save Global Reseller Default Rates
    if (btnSaveGlobalResellerRates) {
        btnSaveGlobalResellerRates.addEventListener('click', async () => {
            const resRate = Number(inputGlobalResellerRate.value) || 15;
            const subRate = Number(inputGlobalSubResellerRate.value) || 10;
            btnSaveGlobalResellerRates.disabled = true;
            btnSaveGlobalResellerRates.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                const res = await fetch('/api/admin/reseller-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reseller_default_discount: resRate,
                        sub_reseller_default_discount: subRate
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Global reseller discount rates saved!', 'success');
                    globalResellerDiscount = resRate;
                    globalSubResellerDiscount = subRate;
                    const statDefaultRates = document.getElementById('statDefaultRates');
                    if (statDefaultRates) statDefaultRates.textContent = `${resRate}% / ${subRate}%`;
                } else {
                    alert(data.error || 'Failed to save global rates.');
                }
            } catch (e) {
                alert('Error saving global rates: ' + e.message);
            } finally {
                btnSaveGlobalResellerRates.disabled = false;
                btnSaveGlobalResellerRates.innerHTML = '<i class="fas fa-save"></i> Save Default Rates';
            }
        });
    }

    // Delete User
    async function deleteUserAccount(userId, userName) {
        if (!confirm(`Are you sure you want to permanently delete user "${userName}" (ID: ${userId})?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/delete/${userId}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'User deleted.', 'info');
                await loadAndRenderUsers();
            } else {
                alert(data.error || 'Failed to delete user.');
            }
        } catch (e) {
            alert('Error deleting user: ' + e.message);
        }
    }

    // User Search Input Filter
    if (usersSearchInput) {
        usersSearchInput.addEventListener('input', (e) => {
            userSearchQuery = e.target.value;
            renderUsersCards();
        });
    }

    // User Role Filter Chips
    if (usersFilterChips) {
        usersFilterChips.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                usersFilterChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeUserFilter = btn.dataset.userFilter || 'all';
                renderUsersCards();
            });
        });
    }


    // Startup check
    
    // ============================================================
    // FREE FIRE ACCOUNTS STORE ENGINE
    // ============================================================
    let ffAccountsList = [];
    let ffAccountSearchQuery = '';
    let activeFFAccountFilter = 'all';

    // DOM Elements
    const ffAccountsGrid = document.getElementById('ffAccountsGrid');
    const searchFFAccounts = document.getElementById('searchFFAccounts');
    const btnOpenAddFFAccount = document.getElementById('btnOpenAddFFAccount');
    const btnRefreshFFAccounts = document.getElementById('btnRefreshFFAccounts');
    const modalFFAccount = document.getElementById('modalFFAccount');
    const btnCloseFFAccountModal = document.getElementById('btnCloseFFAccountModal');
    const btnCancelFFAccountModal = document.getElementById('btnCancelFFAccountModal');
    const formFFAccount = document.getElementById('formFFAccount');
    const modalFFAccountTitle = document.getElementById('modalFFAccountTitle');

    // Stats Elements
    const statTotalFFAccounts = document.getElementById('statTotalFFAccounts');
    const statAvailableFFAccounts = document.getElementById('statAvailableFFAccounts');
    const statSoldFFAccounts = document.getElementById('statSoldFFAccounts');
    const statInventoryValFFAccounts = document.getElementById('statInventoryValFFAccounts');
    const chipCountAvailable = document.getElementById('chipCountAvailable');
    const chipCountSold = document.getElementById('chipCountSold');

    // Form inputs
    const ffaId = document.getElementById('ffaId');
    const ffaTitle = document.getElementById('ffaTitle');
    const ffaUid = document.getElementById('ffaUid');
    const ffaServer = document.getElementById('ffaServer');
    const ffaLevel = document.getElementById('ffaLevel');
    const ffaLikes = document.getElementById('ffaLikes');
    const ffaRank = document.getElementById('ffaRank');
    const ffaEvoGuns = document.getElementById('ffaEvoGuns');
    const ffaLoginType = document.getElementById('ffaLoginType');
    const ffaPrice = document.getElementById('ffaPrice');
    const ffaOldPrice = document.getElementById('ffaOldPrice');
    const ffaDiscount = document.getElementById('ffaDiscount');
    const ffaStatus = document.getElementById('ffaStatus');
    const ffaImage = document.getElementById('ffaImage');
    const ffaImagePreview = document.getElementById('ffaImagePreview');
    const ffaImageFileInput = document.getElementById('ffaImageFileInput');
    const btnUploadFFAImage = document.getElementById('btnUploadFFAImage');
    const ffaGallery = document.getElementById('ffaGallery');
    const ffaDescription = document.getElementById('ffaDescription');
    const ffaCredentials = document.getElementById('ffaCredentials');

    async function loadAndRenderFFAccounts() {
        if (!ffAccountsGrid) return;
        try {
            ffAccountsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--adm-text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px; color: #f59e0b;"></i>
                    <p>Loading Free Fire Accounts from server...</p>
                </div>
            `;
            const res = await fetch('/api/admin/ff-accounts?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                ffAccountsList = data.accounts || [];
                updateFFAccountStats();
                renderFFAccountCards();
            } else {
                ffAccountsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #f87171;">Failed to load accounts. Please try refreshing.</div>`;
            }
        } catch (err) {
            console.error('Error loading FF accounts:', err);
            ffAccountsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #f87171;">Connection error: ${err.message}</div>`;
        }
    }

    function updateFFAccountStats() {
        const total = ffAccountsList.length;
        const available = ffAccountsList.filter(a => a.status === 'available');
        const sold = ffAccountsList.filter(a => a.status === 'sold');
        const totalValue = available.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

        if (statTotalFFAccounts) statTotalFFAccounts.textContent = total;
        if (statAvailableFFAccounts) statAvailableFFAccounts.textContent = available.length;
        if (statSoldFFAccounts) statSoldFFAccounts.textContent = sold.length;
        if (statInventoryValFFAccounts) statInventoryValFFAccounts.textContent = '৳' + totalValue.toLocaleString('en-BD');
        if (chipCountAvailable) chipCountAvailable.textContent = available.length;
        if (chipCountSold) chipCountSold.textContent = sold.length;
    }

    function renderFFAccountCards() {
        if (!ffAccountsGrid) return;

        let filtered = ffAccountsList.slice();
        if (activeFFAccountFilter !== 'all') {
            filtered = filtered.filter(a => a.status === activeFFAccountFilter);
        }
        if (ffAccountSearchQuery.trim()) {
            const q = ffAccountSearchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                (a.title && a.title.toLowerCase().includes(q)) ||
                (a.uid && a.uid.includes(q)) ||
                (a.server && a.server.toLowerCase().includes(q)) ||
                (a.rank && a.rank.toLowerCase().includes(q)) ||
                (a.login_type && a.login_type.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            ffAccountsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--adm-text-secondary); background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px dashed var(--adm-border);">
                    <i class="fas fa-gamepad" style="font-size: 36px; color: #f59e0b; margin-bottom: 12px; opacity: 0.6;"></i>
                    <h4 style="font-size: 16px; color: #fff; margin-bottom: 6px;">No Free Fire Accounts Found</h4>
                    <p style="font-size: 13px;">No accounts match your current filter or search criteria.</p>
                </div>
            `;
            return;
        }

        ffAccountsGrid.innerHTML = filtered.map(acc => {
            const isAvailable = acc.status === 'available';
            const statusClass = isAvailable ? 'available' : 'sold';
            const statusLabel = isAvailable ? '🟢 Available' : '🔴 Sold Out';
            const toggleBtnText = isAvailable ? '<i class="fas fa-ban"></i> Mark as Sold' : '<i class="fas fa-check"></i> Mark Available';
            const toggleBtnClass = isAvailable ? 'btn-ff-action btn-ff-toggle-status' : 'btn-ff-action btn-ff-toggle-status is-sold';

            return `
                <div class="ff-acc-card" data-ff-id="${acc.id}">
                    <div class="ff-acc-card-media">
                        <img src="${acc.image || '/images/jitu.jpg'}" alt="${acc.title}" onerror="this.src='/images/jitu.jpg'">
                        <span class="ff-badge-status ${statusClass}">${statusLabel}</span>
                        <span class="ff-badge-server"><i class="fas fa-globe-asia"></i> ${acc.server || 'BD Server'}</span>
                    </div>

                    <div class="ff-acc-card-body">
                        <h4 class="ff-acc-title" title="${acc.title}">${acc.title}</h4>

                        <div class="ff-acc-meta-chips">
                            <span class="ff-meta-chip highlight"><i class="fas fa-star"></i> Lv. ${acc.level || 1}</span>
                            <span class="ff-meta-chip"><i class="fas fa-trophy"></i> ${acc.rank || 'Master'}</span>
                            <span class="ff-meta-chip"><i class="fas fa-thumbs-up"></i> ${acc.likes || '0'} Likes</span>
                            <span class="ff-meta-chip"><i class="fas fa-key"></i> ${acc.login_type || 'Gmail'}</span>
                            ${acc.uid ? `<span class="ff-meta-chip" style="font-family: monospace;"><i class="fas fa-id-badge"></i> ${acc.uid}</span>` : ''}
                        </div>

                        <div class="ff-acc-evo-highlight">
                            <i class="fas fa-fire-alt"></i>
                            <div><strong>Evo Guns:</strong> ${acc.evo_guns || 'Standard Gun Collection'}</div>
                        </div>

                        ${acc.credentials ? `
                            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(245,158,11,0.2); border-radius: 6px; padding: 6px 10px; font-size: 11px; margin-bottom: 10px; font-family: monospace; color: #38bdf8;">
                                <i class="fas fa-lock" style="color: #f59e0b;"></i> ${acc.credentials}
                            </div>
                        ` : ''}

                        <div class="ff-acc-price-row">
                            <div class="ff-price-wrap">
                                <span class="ff-price-main">৳${Number(acc.price || 0).toLocaleString('en-BD')}</span>
                                ${acc.old_price ? `<span class="ff-price-old">৳${Number(acc.old_price).toLocaleString('en-BD')}</span>` : ''}
                            </div>
                            ${acc.discount ? `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px;">${acc.discount}</span>` : ''}
                        </div>

                        <div class="ff-acc-card-actions">
                            <button class="${toggleBtnClass}" onclick="toggleFFAccountStatus('${acc.id}')">
                                ${toggleBtnText}
                            </button>
                            <button class="btn-ff-action btn-ff-edit" onclick="openEditFFAccount('${acc.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-ff-action btn-ff-delete" onclick="deleteFFAccount('${acc.id}')" title="Delete Account">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Open Add Modal
    function openAddFFAccount() {
        if (!formFFAccount) return;
        formFFAccount.reset();
        ffaId.value = '';
        modalFFAccountTitle.textContent = 'Add New Free Fire Account';
        ffaStatus.value = 'available';
        ffaServer.value = 'BD Server';
        ffaLoginType.value = 'Gmail / Google';
        ffaImage.value = '/images/jitu.jpg';
        if (ffaImagePreview) ffaImagePreview.src = '/images/jitu.jpg';
        if (modalFFAccount) modalFFAccount.style.display = 'flex';
    }

    // Open Edit Modal
    window.openEditFFAccount = function(id) {
        const acc = ffAccountsList.find(a => a.id === id);
        if (!acc) return;
        modalFFAccountTitle.textContent = 'Edit Free Fire Account (' + acc.id + ')';
        ffaId.value = acc.id;
        ffaTitle.value = acc.title || '';
        ffaUid.value = acc.uid || '';
        ffaServer.value = acc.server || 'BD Server';
        ffaLevel.value = acc.level || 70;
        ffaLikes.value = acc.likes || '';
        ffaRank.value = acc.rank || 'Master';
        ffaEvoGuns.value = acc.evo_guns || '';
        ffaLoginType.value = acc.login_type || 'Gmail / Google';
        ffaPrice.value = acc.price || 0;
        ffaOldPrice.value = acc.old_price || '';
        ffaDiscount.value = acc.discount || '';
        ffaStatus.value = acc.status || 'available';
        ffaImage.value = acc.image || '';
        if (ffaImagePreview) ffaImagePreview.src = acc.image || '/images/jitu.jpg';
        ffaGallery.value = (acc.gallery || []).join(', ');
        ffaDescription.value = acc.description || '';
        ffaCredentials.value = acc.credentials || '';
        if (modalFFAccount) modalFFAccount.style.display = 'flex';
    };

    // Toggle Status
    window.toggleFFAccountStatus = async function(id) {
        try {
            const res = await fetch('/api/admin/ff-accounts/toggle-status/' + encodeURIComponent(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Account status updated!', 'success');
                await loadAndRenderFFAccounts();
            } else {
                alert(data.error || 'Failed to update status.');
            }
        } catch (err) {
            alert('Error toggling status: ' + err.message);
        }
    };

    // Delete Account
    window.deleteFFAccount = async function(id) {
        if (!confirm('Are you sure you want to permanently delete this Free Fire account?')) return;
        try {
            const res = await fetch('/api/admin/ff-accounts/delete/' + encodeURIComponent(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Account deleted successfully.', 'info');
                await loadAndRenderFFAccounts();
            } else {
                alert(data.error || 'Failed to delete account.');
            }
        } catch (err) {
            alert('Error deleting account: ' + err.message);
        }
    };

    // Save Form (Add or Edit)
    if (formFFAccount) {
        formFFAccount.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                id: ffaId.value.trim() || undefined,
                title: ffaTitle.value.trim(),
                uid: ffaUid.value.trim(),
                server: ffaServer.value,
                level: parseInt(ffaLevel.value) || 1,
                likes: ffaLikes.value.trim(),
                rank: ffaRank.value.trim(),
                evo_guns: ffaEvoGuns.value.trim(),
                login_type: ffaLoginType.value,
                price: parseFloat(ffaPrice.value) || 0,
                old_price: ffaOldPrice.value ? parseFloat(ffaOldPrice.value) : undefined,
                discount: ffaDiscount.value.trim(),
                status: ffaStatus.value,
                image: ffaImage.value.trim() || '/images/jitu.jpg',
                gallery: ffaGallery.value ? ffaGallery.value.split(',').map(s => s.trim()).filter(Boolean) : [],
                description: ffaDescription.value.trim(),
                credentials: ffaCredentials.value.trim()
            };

            try {
                const res = await fetch('/api/admin/ff-accounts/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Free Fire account saved successfully!', 'success');
                    if (modalFFAccount) modalFFAccount.style.display = 'none';
                    await loadAndRenderFFAccounts();
                } else {
                    alert(data.error || 'Failed to save account.');
                }
            } catch (err) {
                alert('Network error saving account: ' + err.message);
            }
        });
    }

    // Modal close & cancel buttons
    if (btnOpenAddFFAccount) btnOpenAddFFAccount.addEventListener('click', openAddFFAccount);
    if (btnRefreshFFAccounts) btnRefreshFFAccounts.addEventListener('click', () => {
        loadAndRenderFFAccounts();
        showToast('Refreshed accounts from server.', 'info');
    });
    if (btnCloseFFAccountModal) btnCloseFFAccountModal.addEventListener('click', () => {
        if (modalFFAccount) modalFFAccount.style.display = 'none';
    });
    if (btnCancelFFAccountModal) btnCancelFFAccountModal.addEventListener('click', () => {
        if (modalFFAccount) modalFFAccount.style.display = 'none';
    });

    // Account Image Upload & Preview Handler
    if (btnUploadFFAImage && ffaImageFileInput) {
        btnUploadFFAImage.addEventListener('click', () => ffaImageFileInput.click());

        ffaImageFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (PNG, JPG, WEBP).');
                return;
            }

            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                    if (ffaImage) ffaImage.value = compressedBase64;
                    if (ffaImagePreview) ffaImagePreview.src = compressedBase64;
                    showToast('Account image uploaded & ready!', 'success');
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (ffaImage && ffaImagePreview) {
        ffaImage.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            ffaImagePreview.src = val || '/images/jitu.jpg';
        });
    }

    // Search & Filter
    if (searchFFAccounts) {
        searchFFAccounts.addEventListener('input', (e) => {
            ffAccountSearchQuery = e.target.value;
            renderFFAccountCards();
        });
    }

    // Filter Chips
    document.querySelectorAll('[data-ff-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('[data-ff-filter]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFFAccountFilter = chip.dataset.ffFilter || 'all';
            renderFFAccountCards();
        });
    });

    // ============================================================
    // HOME BANNERS & SLIDERS MANAGEMENT ENGINE
    // ============================================================
    let bannersList = [];
    const bannersGrid = document.getElementById('bannersGrid');
    const btnOpenAddBanner = document.getElementById('btnOpenAddBanner');
    const btnRefreshBanners = document.getElementById('btnRefreshBanners');
    const modalBanner = document.getElementById('modalBanner');
    const btnCloseBannerModal = document.getElementById('btnCloseBannerModal');
    const btnCancelBannerModal = document.getElementById('btnCancelBannerModal');
    const formBanner = document.getElementById('formBanner');
    const modalBannerTitle = document.getElementById('modalBannerTitle');

    const bannerId = document.getElementById('bannerId');
    const bannerTitle = document.getElementById('bannerTitle');
    const bannerLink = document.getElementById('bannerLink');
    const bannerImage = document.getElementById('bannerImage');
    const bannerFileInput = document.getElementById('bannerFileInput');
    const btnUploadBannerFile = document.getElementById('btnUploadBannerFile');
    const bannerImagePreview = document.getElementById('bannerImagePreview');

    async function loadAndRenderBanners() {
        if (!bannersGrid) return;
        try {
            bannersGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--adm-text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px; color: #06b6d4;"></i>
                    <p>Loading banners from server...</p>
                </div>
            `;
            const res = await fetch('/api/admin/sliders?_t=' + Date.now());
            const data = await res.json();
            if (data.success) {
                bannersList = data.sliders || [];
                renderBannerCards();
            } else {
                bannersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #f87171;">Failed to load banners. Please try refreshing.</div>`;
            }
        } catch (err) {
            console.error('Error loading banners:', err);
            bannersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #f87171;">Connection error: ${err.message}</div>`;
        }
    }

    function renderBannerCards() {
        if (!bannersGrid) return;
        if (bannersList.length === 0) {
            bannersGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px dashed var(--adm-border);">
                    <i class="fas fa-images" style="font-size: 32px; color: #06b6d4; margin-bottom: 12px; opacity: 0.5;"></i>
                    <h4 style="font-size: 16px; color: #fff; margin-bottom: 6px;">No Banners Found</h4>
                    <p style="font-size: 13px; color: var(--adm-text-secondary);">Click "+ Add New Banner" to add your first hero carousel banner.</p>
                </div>
            `;
            return;
        }

        bannersGrid.innerHTML = bannersList.map((banner, index) => {
            const imgUrl = banner.image || '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png';
            const linkUrl = banner.link && banner.link !== '#' ? banner.link : '';
            return `
                <div class="adm-panel" style="padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; border-radius: 14px; overflow: hidden; background: #0c1224; border: 1.5px solid rgba(6, 182, 212, 0.25);">
                    <div style="position: relative; width: 100%; height: 160px; border-radius: 10px; overflow: hidden; background: #000; margin-bottom: 12px;">
                        <img src="${imgUrl}" alt="${banner.title || 'Banner'}" style="width: 100%; height: 100%; object-fit: cover;">
                        <span style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); color: #38bdf8; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3);">
                            Slide #${index + 1}
                        </span>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <h4 style="font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 6px;">${banner.title || `Slide ${banner.id}`}</h4>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--adm-text-secondary); word-break: break-all;">
                            <i class="fas fa-link" style="color: #06b6d4; font-size: 11px;"></i>
                            <span>${linkUrl ? `<a href="${linkUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${linkUrl.length > 35 ? linkUrl.slice(0, 35) + '...' : linkUrl}</a>` : 'No action link (Display only)'}</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; border-top: 1px solid var(--adm-border); padding-top: 12px;">
                        <button type="button" class="btn-tool-secondary" style="flex: 1; justify-content: center; background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.3);" onclick="openEditBanner('${banner.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button type="button" class="btn-tool-secondary" style="flex: 1; justify-content: center; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);" onclick="deleteBanner('${banner.id}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openAddBanner() {
        if (!formBanner) return;
        formBanner.reset();
        bannerId.value = '';
        modalBannerTitle.textContent = 'Add Home Banner';
        bannerImage.value = '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png';
        if (bannerImagePreview) bannerImagePreview.src = '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png';
        if (modalBanner) modalBanner.style.display = 'flex';
    }

    window.openEditBanner = function(id) {
        const banner = bannersList.find(b => String(b.id) === String(id));
        if (!banner) return;
        modalBannerTitle.textContent = 'Edit Home Banner (' + (banner.title || '#' + banner.id) + ')';
        bannerId.value = banner.id;
        bannerTitle.value = banner.title || '';
        bannerLink.value = banner.link && banner.link !== '#' ? banner.link : '';
        bannerImage.value = banner.image || '';
        if (bannerImagePreview) bannerImagePreview.src = banner.image || '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png';
        if (modalBanner) modalBanner.style.display = 'flex';
    };

    window.deleteBanner = async function(id) {
        if (!confirm('Are you sure you want to delete this banner from the homepage carousel?')) return;
        try {
            const res = await fetch('/api/admin/sliders/delete/' + encodeURIComponent(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Banner deleted successfully!', 'success');
                await loadAndRenderBanners();
            } else {
                alert(data.error || 'Failed to delete banner.');
            }
        } catch (err) {
            alert('Network error deleting banner: ' + err.message);
        }
    };

    if (formBanner) {
        formBanner.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = bannerId.value.trim();
            const title = bannerTitle.value.trim();
            const link = bannerLink.value.trim() || '#';
            const image = bannerImage.value.trim();

            if (!image) {
                alert('Please upload or provide a banner image URL.');
                return;
            }

            try {
                const res = await fetch('/api/admin/sliders/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, title, link, image })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Banner saved successfully!', 'success');
                    if (modalBanner) modalBanner.style.display = 'none';
                    await loadAndRenderBanners();
                } else {
                    alert(data.error || 'Failed to save banner.');
                }
            } catch (err) {
                alert('Network error saving banner: ' + err.message);
            }
        });
    }

    if (btnOpenAddBanner) btnOpenAddBanner.addEventListener('click', openAddBanner);
    if (btnRefreshBanners) btnRefreshBanners.addEventListener('click', () => {
        loadAndRenderBanners();
        showToast('Refreshed banners from server.', 'info');
    });
    if (btnCloseBannerModal) btnCloseBannerModal.addEventListener('click', () => {
        if (modalBanner) modalBanner.style.display = 'none';
    });
    if (btnCancelBannerModal) btnCancelBannerModal.addEventListener('click', () => {
        if (modalBanner) modalBanner.style.display = 'none';
    });

    // Banner Image Upload & Live Preview Handler
    if (btnUploadBannerFile && bannerFileInput) {
        btnUploadBannerFile.addEventListener('click', () => bannerFileInput.click());

        bannerFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (PNG, JPG, WEBP).');
                return;
            }

            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 900;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
                    if (bannerImage) bannerImage.value = compressedBase64;
                    if (bannerImagePreview) bannerImagePreview.src = compressedBase64;
                    showToast('Banner image uploaded & ready!', 'success');
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (bannerImage && bannerImagePreview) {
        bannerImage.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            bannerImagePreview.src = val || '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png';
        });
    }

    // ============================================================
    // TAB: ORDERS MANAGEMENT & KEY DELIVERY CONTROLLER
    // ============================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    let ordersList = [];
    let currentOrderFilter = 'all';

    const ordersCardsContainer = document.getElementById('ordersCardsContainer');
    const ordersSearchInput = document.getElementById('ordersSearchInput');
    const btnReloadOrdersList = document.getElementById('btnReloadOrdersList');
    const pendingOrdersBadge = document.getElementById('pendingOrdersBadge');

    const modalAssignKey = document.getElementById('modalAssignKey');
    const btnCloseAssignKeyModal = document.getElementById('btnCloseAssignKeyModal');
    const btnCancelAssignKeyModal = document.getElementById('btnCancelAssignKeyModal');
    const formAssignKey = document.getElementById('formAssignKey');
    const assignKeyOrderId = document.getElementById('assignKeyOrderId');
    const assignKeyOrderTitle = document.getElementById('assignKeyOrderTitle');
    const assignKeyCustomerInfo = document.getElementById('assignKeyCustomerInfo');
    const assignKeyTextInput = document.getElementById('assignKeyTextInput');
    const assignKeyAutoMarkComplete = document.getElementById('assignKeyAutoMarkComplete');

    async function loadAndRenderOrders() {
        try {
            const res = await fetch('/api/admin/orders?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                ordersList = data.orders || [];
                updateOrderStats();
                renderOrdersCards();
            }
        } catch (err) {
            console.error('Failed to load orders:', err);
        }
    }

    function updateOrderStats() {
        const statTotalOrdersCount = document.getElementById('statTotalOrdersCount');
        const statPendingOrdersCount = document.getElementById('statPendingOrdersCount');
        const statProcessingOrdersCount = document.getElementById('statProcessingOrdersCount');
        const statCompletedOrdersCount = document.getElementById('statCompletedOrdersCount');

        const chipCountOrdersAll = document.getElementById('chipCountOrdersAll');
        const chipCountOrdersPending = document.getElementById('chipCountOrdersPending');
        const chipCountOrdersProcessing = document.getElementById('chipCountOrdersProcessing');
        const chipCountOrdersCompleted = document.getElementById('chipCountOrdersCompleted');
        const chipCountOrdersCancelled = document.getElementById('chipCountOrdersCancelled');

        const pending = ordersList.filter(o => o.status === 'pending');
        const processing = ordersList.filter(o => o.status === 'processing');
        const completed = ordersList.filter(o => o.status === 'completed');
        const cancelled = ordersList.filter(o => o.status === 'cancelled');

        if (statTotalOrdersCount) statTotalOrdersCount.textContent = ordersList.length;
        if (statPendingOrdersCount) statPendingOrdersCount.textContent = pending.length;
        if (statProcessingOrdersCount) statProcessingOrdersCount.textContent = processing.length;
        if (statCompletedOrdersCount) statCompletedOrdersCount.textContent = completed.length;

        if (chipCountOrdersAll) chipCountOrdersAll.textContent = ordersList.length;
        if (chipCountOrdersPending) chipCountOrdersPending.textContent = pending.length;
        if (chipCountOrdersProcessing) chipCountOrdersProcessing.textContent = processing.length;
        if (chipCountOrdersCompleted) chipCountOrdersCompleted.textContent = completed.length;
        if (chipCountOrdersCancelled) chipCountOrdersCancelled.textContent = cancelled.length;

        if (pendingOrdersBadge) {
            if (pending.length > 0) {
                pendingOrdersBadge.textContent = pending.length;
                pendingOrdersBadge.style.display = 'inline-block';
            } else {
                pendingOrdersBadge.style.display = 'none';
            }
        }
    }

    function renderOrdersCards() {
        if (!ordersCardsContainer) return;
        const q = (ordersSearchInput ? ordersSearchInput.value : '').toLowerCase().trim();

        const filtered = ordersList.filter(o => {
            if (currentOrderFilter !== 'all' && o.status !== currentOrderFilter) {
                return false;
            }
            if (q) {
                const matchId = (o.id || '').toLowerCase().includes(q);
                const matchName = (o.user_name || o.customer_name || '').toLowerCase().includes(q);
                const matchEmail = (o.user_email || o.email || '').toLowerCase().includes(q);
                const matchWa = (o.whatsapp || '').toLowerCase().includes(q);
                const matchTrx = (o.transaction_id || '').toLowerCase().includes(q);
                const matchUid = (o.player_id || '').toLowerCase().includes(q);
                const matchProd = (o.product_name || '').toLowerCase().includes(q);
                return matchId || matchName || matchEmail || matchWa || matchTrx || matchUid || matchProd;
            }
            return true;
        });

        if (filtered.length === 0) {
            ordersCardsContainer.innerHTML = `
                <div style="text-align: center; padding: 48px 20px; background: rgba(0, 240, 255, 0.02); border: 1.5px dashed var(--adm-border); border-radius: 16px;">
                    <i class="fas fa-box-open" style="font-size: 38px; color: var(--adm-text-secondary); margin-bottom: 12px; display: block;"></i>
                    <h4 style="color: #fff; font-size: 16px; margin-bottom: 6px;">No orders found</h4>
                    <p style="color: var(--adm-text-secondary); font-size: 13px; margin: 0;">${q ? 'No orders match your search query.' : 'Incoming orders will appear here automatically.'}</p>
                </div>
            `;
            return;
        }

        ordersCardsContainer.innerHTML = filtered.map(o => {
            const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A';
            const cleanWa = String(o.whatsapp || '').replace(/[^0-9]/g, '');
            let intlWa = cleanWa;
            if (cleanWa.startsWith('0')) intlWa = '88' + cleanWa;
            else if (cleanWa.length === 10 && cleanWa.startsWith('1')) intlWa = '880' + cleanWa;

            let statusColor = '#f59e0b';
            let statusBg = 'rgba(245, 158, 11, 0.15)';
            let statusBorder = 'rgba(245, 158, 11, 0.35)';
            let statusLabel = 'Pending Verification';

            if (o.status === 'processing') {
                statusColor = '#38bdf8';
                statusBg = 'rgba(56, 189, 248, 0.15)';
                statusBorder = 'rgba(56, 189, 248, 0.35)';
                statusLabel = 'Under Processing';
            } else if (o.status === 'completed') {
                statusColor = '#10b981';
                statusBg = 'rgba(16, 185, 129, 0.15)';
                statusBorder = 'rgba(16, 185, 129, 0.35)';
                statusLabel = 'Completed';
            } else if (o.status === 'cancelled') {
                statusColor = '#ef4444';
                statusBg = 'rgba(239, 68, 68, 0.15)';
                statusBorder = 'rgba(239, 68, 68, 0.35)';
                statusLabel = 'Cancelled';
            }

            const deviceSpecs = o.phone_model ? `
                <div style="font-size: 11px; color: #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 4px 8px; border-radius: 6px; margin-top: 5px; border: 1px solid rgba(56, 189, 248, 0.2);">
                    <i class="fas fa-mobile-alt mr-1"></i> ${escapeHtml(o.phone_brand || '')} ${escapeHtml(o.phone_model)} (${escapeHtml(o.android_version || 'Android')}) [${escapeHtml(o.root_solution || 'KernelSU')}]
                </div>
            ` : '';

            const keyBlock = o.license_key ? `
                <div style="margin-top: 10px; padding: 10px 12px; background: rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 240, 255, 0.3); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                    <div style="overflow: hidden; max-width: 75%;">
                        <span style="font-size: 10px; font-weight: 800; color: #00f0ff; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Assigned Key:</span>
                        <code style="font-size: 13px; font-weight: 800; color: #fde047; font-family: monospace; word-break: break-all;">${escapeHtml(o.license_key)}</code>
                    </div>
                    <div style="display: flex; gap: 6px; shrink-0;">
                        <button type="button" class="btn-store-link btn-copy-key" data-key="${escapeHtml(o.license_key)}" style="padding: 5px 9px; font-size: 11px; background: rgba(0, 240, 255, 0.15); border-color: rgba(0, 240, 255, 0.4); color: #00f0ff;">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button type="button" class="btn-store-link btn-open-assign-key" data-order-id="${o.id}" style="padding: 5px 9px; font-size: 11px; background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: #e2e8f0;">
                            <i class="fas fa-edit"></i> Edit Key
                        </button>
                    </div>
                </div>
            ` : `
                <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 8px;">
                    <span style="font-size: 11px; color: #fcd34d;"><i class="fas fa-clock mr-1"></i> No key assigned yet</span>
                    <button type="button" class="btn-primary-save btn-open-assign-key" data-order-id="${o.id}" style="padding: 5px 12px; font-size: 11px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none;">
                        <i class="fas fa-key mr-1"></i> + Assign Key
                    </button>
                </div>
            `;

            return `
                <div class="adm-panel order-card-item" style="border-left: 4px solid ${statusColor}; margin-bottom: 0; padding: 18px 20px;">
                    <!-- Card Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--adm-border); padding-bottom: 12px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <span style="font-size: 15px; font-weight: 900; color: #fff; font-family: monospace; letter-spacing: 0.5px;">${o.id}</span>
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 12px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder};">
                                ${statusLabel}
                            </span>
                            <span style="font-size: 11px; color: var(--adm-text-secondary);"><i class="far fa-clock mr-1"></i> ${dateStr}</span>
                        </div>

                        <!-- Status Quick Switcher -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--adm-text-secondary); text-transform: uppercase; margin: 0;">Status:</label>
                            <select class="order-status-select" data-order-id="${o.id}" style="font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 8px; background: #080d1a; color: ${statusColor}; border: 1.5px solid ${statusBorder};">
                                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>⚡ Under Processing</option>
                                <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <!-- Main Grid Info -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                        <!-- Left: Product & Payment -->
                        <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--adm-border); border-radius: 10px; padding: 14px;">
                            <div style="font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 4px;">
                                ${escapeHtml(o.product_name)}
                            </div>
                            <div style="font-size: 12px; color: #38bdf8; font-weight: 700; margin-bottom: 8px;">
                                📦 Plan: ${escapeHtml(o.variant || 'Standard')}
                            </div>
                            <div style="font-size: 16px; font-weight: 900; color: #10b981; margin-bottom: 8px;">
                                ৳ ${o.price || 0}
                            </div>
                            <div style="font-size: 12px; color: #cbd5e1; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--adm-border); padding-top: 8px; flex-wrap: wrap; gap: 4px;">
                                <span><i class="fas fa-wallet mr-1" style="color: #f472b6;"></i> ${escapeHtml(o.payment_method)}</span>
                                <span style="font-family: monospace; font-weight: 800; color: #fbbf24;">TrxID: ${escapeHtml(o.transaction_id || 'N/A')}</span>
                            </div>
                        </div>

                        <!-- Right: Customer Info -->
                        <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--adm-border); border-radius: 10px; padding: 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                                <span style="font-size: 13px; font-weight: 800; color: #fff;">
                                    <i class="fas fa-user mr-1 text-cyan-400"></i> ${escapeHtml(o.user_name || o.customer_name || 'Customer')}
                                </span>
                                ${o.user_email ? `<span style="font-size: 11px; color: var(--adm-text-secondary); font-family: monospace;">${escapeHtml(o.user_email)}</span>` : ''}
                            </div>

                            <div style="margin-bottom: 6px;">
                                <a href="https://wa.me/${intlWa}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #25d366; text-decoration: none;" title="Open WhatsApp Chat">
                                    <i class="fab fa-whatsapp" style="font-size: 16px;"></i> ${escapeHtml(o.whatsapp || 'N/A')} <span style="font-size: 10px; background: rgba(37, 211, 102, 0.15); border: 1px solid rgba(37, 211, 102, 0.4); padding: 1px 6px; border-radius: 6px;">Chat</span>
                                </a>
                            </div>

                            <div style="font-size: 12px; color: #cbd5e1;">
                                <i class="fas fa-gamepad mr-1 text-amber-400"></i> Player UID: <strong style="font-family: monospace; color: #fff;">${escapeHtml(o.player_id || 'N/A')}</strong>
                            </div>

                            ${deviceSpecs}
                        </div>
                    </div>

                    <!-- Key Assignment Block -->
                    ${keyBlock}

                    <!-- Card Footer Actions -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--adm-border); flex-wrap: wrap; gap: 8px;">
                        <a href="https://wa.me/${intlWa}?text=${encodeURIComponent('Hello! Your order ' + o.id + ' (' + o.product_name + ') is ' + o.status + '.' + (o.license_key ? ' Here is your activation key: ' + o.license_key : ''))}" target="_blank" class="btn-store-link" style="padding: 6px 12px; font-size: 11px; background: #25d366; color: #000; font-weight: 800; border: none; text-decoration: none;">
                            <i class="fab fa-whatsapp"></i> Chat on WhatsApp
                        </a>

                        <button type="button" class="btn-secondary-cancel btn-delete-order" data-order-id="${o.id}" style="padding: 6px 12px; font-size: 11px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                            <i class="fas fa-trash-alt"></i> Delete Order
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners
        ordersCardsContainer.querySelectorAll('.order-status-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const orderId = e.target.dataset.orderId;
                const newStatus = e.target.value;
                try {
                    const res = await fetch('/api/admin/orders/update-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId, status: newStatus })
                    });
                    if (res.ok) {
                        const target = ordersList.find(o => o.id === orderId);
                        if (target) target.status = newStatus;
                        updateOrderStats();
                        renderOrdersCards();
                        showToast(`Order ${orderId} status set to "${newStatus}"!`, 'success');
                    } else {
                        showToast('Failed to update status', 'error');
                    }
                } catch (err) {
                    showToast('Connection error updating status', 'error');
                }
            });
        });

        ordersCardsContainer.querySelectorAll('.btn-open-assign-key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.orderId;
                const order = ordersList.find(o => o.id === orderId);
                if (!order) return;

                if (assignKeyOrderId) assignKeyOrderId.value = order.id;
                if (assignKeyOrderTitle) assignKeyOrderTitle.textContent = `${order.id} • ${order.product_name} (${order.variant || ''})`;
                if (assignKeyCustomerInfo) assignKeyCustomerInfo.textContent = `Customer WhatsApp: ${order.whatsapp} | TrxID: ${order.transaction_id || 'N/A'} | Amount: ৳${order.price}`;
                if (assignKeyTextInput) assignKeyTextInput.value = order.license_key || '';
                if (modalAssignKey) modalAssignKey.style.display = 'flex';
            });
        });

        ordersCardsContainer.querySelectorAll('.btn-copy-key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.key;
                if (key) {
                    navigator.clipboard.writeText(key);
                    showToast('Key copied to clipboard!', 'success');
                }
            });
        });

        ordersCardsContainer.querySelectorAll('.btn-delete-order').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.currentTarget.dataset.orderId;
                if (!confirm(`Are you sure you want to permanently delete Order ${orderId}?`)) return;

                try {
                    const res = await fetch(`/api/admin/orders/delete/${encodeURIComponent(orderId)}`, {
                        method: 'POST'
                    });
                    if (res.ok) {
                        ordersList = ordersList.filter(o => o.id !== orderId);
                        updateOrderStats();
                        renderOrdersCards();
                        showToast(`Order ${orderId} deleted successfully!`, 'success');
                    } else {
                        showToast('Failed to delete order', 'error');
                    }
                } catch (err) {
                    showToast('Network error deleting order', 'error');
                }
            });
        });
    }

    // Orders Filter Chips
    const ordersFilterChips = document.getElementById('ordersFilterChips');
    if (ordersFilterChips) {
        ordersFilterChips.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                ordersFilterChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentOrderFilter = btn.dataset.orderFilter || 'all';
                renderOrdersCards();
            });
        });
    }

    if (ordersSearchInput) {
        ordersSearchInput.addEventListener('input', () => {
            renderOrdersCards();
        });
    }

    if (btnReloadOrdersList) {
        btnReloadOrdersList.addEventListener('click', () => {
            loadAndRenderOrders();
            showToast('Orders refreshed from server!', 'success');
        });
    }

    // Modal Assign Key events
    function closeAssignKeyModal() {
        if (modalAssignKey) modalAssignKey.style.display = 'none';
        if (assignKeyTextInput) assignKeyTextInput.value = '';
    }

    if (btnCloseAssignKeyModal) btnCloseAssignKeyModal.addEventListener('click', closeAssignKeyModal);
    if (btnCancelAssignKeyModal) btnCancelAssignKeyModal.addEventListener('click', closeAssignKeyModal);

    if (formAssignKey) {
        formAssignKey.addEventListener('submit', async (e) => {
            e.preventDefault();
            const orderId = assignKeyOrderId.value;
            const key = assignKeyTextInput.value.trim();
            const markCompleted = assignKeyAutoMarkComplete ? assignKeyAutoMarkComplete.checked : false;

            if (!key) {
                showToast('Please enter a license key or credentials', 'error');
                return;
            }

            try {
                const res = await fetch('/api/admin/orders/assign-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, key, markCompleted })
                });

                if (res.ok) {
                    const data = await res.json();
                    const target = ordersList.find(o => o.id === orderId);
                    if (target) {
                        target.license_key = key;
                        if (markCompleted) target.status = 'completed';
                    }
                    updateOrderStats();
                    renderOrdersCards();
                    closeAssignKeyModal();
                    showToast(`Key successfully assigned to Order ${orderId}!`, 'success');
                } else {
                    showToast('Failed to assign key', 'error');
                }
            } catch (err) {
                showToast('Connection error assigning key', 'error');
            }
        });
    }

    // ============================================================
    // TAB: WALLET & FUND REQUESTS MANAGEMENT
    // ============================================================
    let walletRequestsList = [];
    let currentWalletFilter = 'pending';

    async function loadAndRenderWalletRequests() {
        try {
            const res = await fetch('/api/admin/wallet/requests?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                walletRequestsList = data.requests || [];
                updateWalletStats();
                renderWalletRequestsCards();
            }
        } catch (err) {
            console.error('Failed to load wallet requests:', err);
        }
    }

    function updateWalletStats() {
        const total = walletRequestsList.length;
        const pending = walletRequestsList.filter(r => r.status === 'pending').length;
        const approved = walletRequestsList.filter(r => r.status === 'approved');
        const approvedAmt = approved.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const rejected = walletRequestsList.filter(r => r.status === 'rejected').length;
        const reverted = walletRequestsList.filter(r => r.status === 'reverted').length;

        const statTotal = document.getElementById('statTotalWalletReqsCount');
        const statPending = document.getElementById('statPendingWalletReqsCount');
        const statApproved = document.getElementById('statApprovedWalletAmount');
        const statRejected = document.getElementById('statRejectedWalletReqsCount');
        const statReverted = document.getElementById('statRevertedWalletReqsCount');
        const pendingBadge = document.getElementById('pendingWalletBadge');

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statApproved) statApproved.textContent = approvedAmt + '৳';
        if (statRejected) statRejected.textContent = rejected;
        if (statReverted) statReverted.textContent = reverted;

        if (pendingBadge) {
            if (pending > 0) {
                pendingBadge.style.display = 'inline-block';
                pendingBadge.textContent = pending;
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        const chipAll = document.getElementById('chipCountWalletAll');
        const chipPending = document.getElementById('chipCountWalletPending');
        const chipApproved = document.getElementById('chipCountWalletApproved');
        const chipReverted = document.getElementById('chipCountWalletReverted');
        const chipRejected = document.getElementById('chipCountWalletRejected');

        if (chipAll) chipAll.textContent = total;
        if (chipPending) chipPending.textContent = pending;
        if (chipApproved) chipApproved.textContent = approved.length;
        if (chipReverted) chipReverted.textContent = reverted;
        if (chipRejected) chipRejected.textContent = rejected;
    }

    function renderWalletRequestsCards() {
        const container = document.getElementById('walletRequestsListContainer');
        if (!container) return;

        const searchInput = document.getElementById('walletSearchInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = walletRequestsList.filter(r => {
            if (currentWalletFilter !== 'all' && r.status !== currentWalletFilter) return false;
            if (query) {
                const qStr = `${r.id} ${r.user_name} ${r.user_email} ${r.sender_phone || ''} ${r.transaction_id || ''} ${r.payment_method || ''}`.toLowerCase();
                if (!qStr.includes(query)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                    <i class="fas fa-wallet" style="font-size: 32px; margin-bottom: 10px; color: #475569; display: block;"></i>
                    <p style="font-size: 13px; margin: 0;">No fund deposit requests found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(r => {
            const isPending = r.status === 'pending';
            const isApproved = r.status === 'approved';
            const isRejected = r.status === 'rejected';
            const isReverted = r.status === 'reverted';

            const statusBadge = isApproved
                ? `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-check-circle"></i> Approved & Added</span>`
                : (isReverted
                    ? `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);"><i class="fas fa-undo"></i> Reverted / Deducted</span>`
                    : (isRejected
                        ? `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);"><i class="fas fa-times-circle"></i> Rejected</span>`
                        : `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);"><i class="fas fa-clock"></i> Pending Review</span>`));

            const isNegative = isReverted || r.amount < 0 || r.is_deduction;
            const amountColor = isNegative ? '#f87171' : '#10b981';
            const amountSign = isNegative ? '-' : '+';
            const displayAmount = Math.abs(parseFloat(r.amount) || 0);

            const dateStr = r.created_at ? new Date(r.created_at).toLocaleString() : 'Recently';

            return `
                <div class="adm-panel" style="padding: 16px; border-radius: 14px; background: rgba(15, 23, 42, 0.7); border: 1px solid ${isPending ? '#f59e0b40' : (isApproved ? '#10b98140' : (isReverted ? '#f8717140' : '#ef444440'))};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 13px;">${escapeHtml(r.id)}</span>
                                <span style="font-size: 11px; color: #94a3b8;">${dateStr}</span>
                            </div>
                            <h4 style="margin: 4px 0 2px 0; font-size: 15px; font-weight: 800; color: #fff;">
                                <i class="fas fa-user-circle" style="color: ${isReverted ? '#f87171' : '#10b981'};"></i> ${escapeHtml(r.user_name || 'Member')}
                                <span style="font-size: 12px; font-weight: normal; color: #94a3b8; margin-left: 6px;">(${escapeHtml(r.user_email || '')})</span>
                            </h4>
                            <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; font-size: 12px;">
                                <span><b style="color: #94a3b8;">Method:</b> <span style="color: #00f0ff; font-weight: bold;">${escapeHtml(r.payment_method)}</span></span>
                                <span><b style="color: #94a3b8;">TrxID:</b> <code style="background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 6px; color: #fde047; font-weight: bold;">${escapeHtml(r.transaction_id)}</code></span>
                                <span><b style="color: #94a3b8;">Sender / Phone:</b> <span style="color: #cbd5e1;">${escapeHtml(r.sender_phone || 'N/A')}</span></span>
                                ${r.reason ? `<span><b style="color: #f87171;">Reason:</b> <span style="color: #fca5a5;">${escapeHtml(r.reason)}</span></span>` : ''}
                            </div>
                        </div>

                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px; font-weight: 900; font-family: 'Orbitron', monospace; color: ${amountColor};">${amountSign}${displayAmount}৳</span>
                                ${statusBadge}
                            </div>

                            <div style="display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; justify-content: flex-end;">
                                ${isPending ? `
                                    <button type="button" class="btn-direct-approve-wallet" data-id="${r.id}" data-user="${escapeHtml(r.user_name || r.user_email)}" data-amount="${displayAmount}" data-status="${r.status}" style="padding: 6px 14px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 800; font-size: 11px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(16,185,129,0.35);">
                                        <i class="fas fa-check-circle"></i> Direct Approve (+${displayAmount}৳)
                                    </button>
                                    <button type="button" class="btn-reject-wallet" data-id="${r.id}" style="padding: 6px 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.2); color: #ef4444; font-weight: 700; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer;">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                ` : ''}

                                ${isApproved ? `
                                    <button type="button" class="btn-revert-wallet" data-id="${r.id}" data-user="${escapeHtml(r.user_name || r.user_email)}" data-amount="${displayAmount}" style="padding: 6px 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 800; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
                                        <i class="fas fa-undo"></i> Deduct / Revert (-${displayAmount}৳)
                                    </button>
                                ` : ''}

                                <button type="button" class="btn-edit-wallet" data-id="${r.id}" style="padding: 6px 12px; border-radius: 8px; background: rgba(0, 240, 255, 0.15); color: #00f0ff; font-weight: 800; font-size: 11px; border: 1px solid rgba(0, 240, 255, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
                                    <i class="fas fa-edit"></i> Edit Request &amp; Balance
                                </button>

                                <button type="button" class="btn-delete-wallet" data-id="${r.id}" style="padding: 6px 11px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 800; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" title="Delete this request">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Direct Approve Action Handler
        container.querySelectorAll('.btn-direct-approve-wallet, .btn-approve-wallet').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                const user = btn.getAttribute('data-user') || 'user';
                const amt = btn.getAttribute('data-amount') || '';
                const currentStatus = btn.getAttribute('data-status');
                const isAlreadyApproved = currentStatus === 'approved';

                const promptMsg = isAlreadyApproved
                    ? `DIRECT APPROVE (+ADD):\nThis request is already marked approved. Do you want to credit and ADD another +${amt}৳ to ${user}'s wallet balance?`
                    : `DIRECT APPROVE:\nAre you sure you want to approve request ${reqId} and credit +${amt}৳ to ${user}'s wallet balance?`;

                if (!confirm(promptMsg)) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';

                try {
                    const res = await fetch('/api/admin/wallet/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId, force: isAlreadyApproved })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(d.message || `Fund request ${reqId} approved! Balance credited.`, 'success');
                        loadAndRenderWalletRequests();
                        loadAndRenderUsers();
                    } else {
                        showToast(d.message || 'Error approving request', 'error');
                        btn.disabled = false;
                        btn.innerHTML = `<i class="fas fa-check-circle"></i> Direct Approve (+${amt}৳)`;
                    }
                } catch(e) {
                    showToast('Failed to approve request', 'error');
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fas fa-check-circle"></i> Direct Approve (+${amt}৳)`;
                }
            });
        });

        container.querySelectorAll('.btn-revert-wallet').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                const user = btn.getAttribute('data-user');
                const amt = btn.getAttribute('data-amount');
                if (!confirm(`DEDUCT / REVERT FUND:\nAre you sure you want to deduct ${amt}৳ from ${user}'s wallet balance and mark this request as REVERTED?`)) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deducting...';

                try {
                    const res = await fetch('/api/admin/wallet/revert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(d.message || `Deducted ${amt}৳ from ${user}!`, 'success');
                        loadAndRenderWalletRequests();
                        loadAndRenderUsers();
                    } else {
                        showToast(d.message || 'Error reverting fund', 'error');
                        btn.disabled = false;
                        btn.innerHTML = `<i class="fas fa-undo"></i> Deduct / Revert (-${amt}৳)`;
                    }
                } catch(e) {
                    showToast('Failed to revert fund', 'error');
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fas fa-undo"></i> Deduct / Revert (-${amt}৳)`;
                }
            });
        });

        container.querySelectorAll('.btn-reject-wallet').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                if (!confirm(`Reject fund request ${reqId}?`)) return;

                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/wallet/reject', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(`Fund request ${reqId} rejected.`, 'info');
                        loadAndRenderWalletRequests();
                    } else {
                        showToast(d.message || 'Error rejecting request', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to reject request', 'error');
                    btn.disabled = false;
                }
            });
        });

        // Edit Fund Request & Balance Action
        container.querySelectorAll('.btn-edit-wallet').forEach(btn => {
            btn.addEventListener('click', () => {
                const reqId = btn.getAttribute('data-id');
                openEditFundModal(reqId);
            });
        });

        // Delete Fund Request Action
        container.querySelectorAll('.btn-delete-wallet').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                if (!confirm(`Are you sure you want to permanently DELETE fund request ${reqId} from the list?`)) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const res = await fetch('/api/admin/wallet/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(d.message || `Fund request ${reqId} deleted.`, 'info');
                        loadAndRenderWalletRequests();
                    } else {
                        showToast(d.message || 'Error deleting request', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                    }
                } catch(e) {
                    showToast('Failed to delete request', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                }
            });
        });
    }

    // Modal: Edit Fund Request & Balance Logic
    const modalEditFund = document.getElementById('modalEditFundRequest');
    const btnCloseEditFundModal = document.getElementById('btnCloseEditFundModal');
    const btnCancelEditFundModal = document.getElementById('btnCancelEditFundModal');
    const formEditFundRequest = document.getElementById('formEditFundRequest');
    const editFundReqId = document.getElementById('editFundReqId');
    const editFundUserId = document.getElementById('editFundUserId');
    const editFundUserName = document.getElementById('editFundUserName');
    const editFundReqIdBadge = document.getElementById('editFundReqIdBadge');
    const editFundAmount = document.getElementById('editFundAmount');
    const editFundUserLiveBalance = document.getElementById('editFundUserLiveBalance');
    const editFundStatus = document.getElementById('editFundStatus');
    const editFundGateway = document.getElementById('editFundGateway');
    const editFundTrxId = document.getElementById('editFundTrxId');
    const editFundSenderPhone = document.getElementById('editFundSenderPhone');

    function openEditFundModal(requestId) {
        if (!modalEditFund) return;
        const reqItem = walletRequestsList.find(r => r.id === requestId);
        if (!reqItem) {
            alert('Request not found.');
            return;
        }

        const userObj = usersList.find(u => String(u.id) === String(reqItem.user_id));
        const liveBalance = userObj ? (parseFloat(userObj.wallet_balance) || 0) : 0;

        if (editFundReqId) editFundReqId.value = reqItem.id;
        if (editFundUserId) editFundUserId.value = reqItem.user_id || '';
        if (editFundUserName) editFundUserName.textContent = `${reqItem.user_name || 'Member'} (${reqItem.user_email || 'No email'})`;
        if (editFundReqIdBadge) editFundReqIdBadge.textContent = reqItem.id;
        if (editFundAmount) editFundAmount.value = reqItem.amount || 0;
        if (editFundUserLiveBalance) editFundUserLiveBalance.value = liveBalance;
        if (editFundStatus) editFundStatus.value = reqItem.status || 'pending';
        if (editFundGateway) editFundGateway.value = reqItem.payment_method || '';
        if (editFundTrxId) editFundTrxId.value = reqItem.transaction_id || '';
        if (editFundSenderPhone) editFundSenderPhone.value = reqItem.sender_phone || '';

        modalEditFund.style.display = 'flex';
    }

    if (btnCloseEditFundModal) {
        btnCloseEditFundModal.addEventListener('click', () => {
            if (modalEditFund) modalEditFund.style.display = 'none';
        });
    }
    if (btnCancelEditFundModal) {
        btnCancelEditFundModal.addEventListener('click', () => {
            if (modalEditFund) modalEditFund.style.display = 'none';
        });
    }

    if (formEditFundRequest) {
        formEditFundRequest.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reqId = editFundReqId ? editFundReqId.value : '';
            const amount = editFundAmount ? parseFloat(editFundAmount.value) : 0;
            const user_balance = editFundUserLiveBalance ? parseFloat(editFundUserLiveBalance.value) : undefined;
            const status = editFundStatus ? editFundStatus.value : 'pending';
            const payment_method = editFundGateway ? editFundGateway.value.trim() : '';
            const transaction_id = editFundTrxId ? editFundTrxId.value.trim() : '';
            const sender_phone = editFundSenderPhone ? editFundSenderPhone.value.trim() : '';

            const btnSave = document.getElementById('btnSaveEditFundRequest');
            if (btnSave) {
                btnSave.disabled = true;
                btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }

            try {
                const res = await fetch('/api/admin/wallet/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId: reqId,
                        amount,
                        user_balance,
                        status,
                        payment_method,
                        transaction_id,
                        sender_phone
                    })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(d.message || 'Saved successfully!', 'success');
                    if (modalEditFund) modalEditFund.style.display = 'none';
                    await loadAndRenderWalletRequests();
                    await loadAndRenderUsers();
                } else {
                    alert(d.message || 'Error updating fund request.');
                }
            } catch(err) {
                alert('Network error while saving: ' + err.message);
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                }
            }
        });
    }

    const btnDeleteFromEditFundModal = document.getElementById('btnDeleteFromEditFundModal');
    if (btnDeleteFromEditFundModal) {
        btnDeleteFromEditFundModal.addEventListener('click', async () => {
            const reqId = editFundReqId ? editFundReqId.value : '';
            if (!reqId) return;
            if (!confirm(`Are you sure you want to permanently DELETE fund request ${reqId}?`)) return;

            btnDeleteFromEditFundModal.disabled = true;
            btnDeleteFromEditFundModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

            try {
                const res = await fetch('/api/admin/wallet/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId: reqId })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(`Fund request ${reqId} deleted!`, 'info');
                    if (modalEditFund) modalEditFund.style.display = 'none';
                    loadAndRenderWalletRequests();
                } else {
                    alert(d.message || 'Failed to delete request.');
                }
            } catch(e) {
                alert('Error deleting request: ' + e.message);
            } finally {
                btnDeleteFromEditFundModal.disabled = false;
                btnDeleteFromEditFundModal.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            }
        });
    }

    // Modal: Direct Approve / Add Fund Logic
    const modalDirectAddFund = document.getElementById('modalDirectAddFund');
    const btnOpenDirectAddFundModal = document.getElementById('btnOpenDirectAddFundModal');
    const btnCloseDirectAddFundModal = document.getElementById('btnCloseDirectAddFundModal');
    const btnCancelDirectAddFundModal = document.getElementById('btnCancelDirectAddFundModal');
    const formDirectAddFund = document.getElementById('formDirectAddFund');
    const directAddUserSelect = document.getElementById('directAddUserSelect');
    const directAddUserInfoBox = document.getElementById('directAddUserInfoBox');
    const directAddUserCurrentBal = document.getElementById('directAddUserCurrentBal');
    const directAddAmount = document.getElementById('directAddAmount');

    function openDirectAddFundModal(preselectedUserId = null) {
        if (!modalDirectAddFund) return;

        if (directAddUserSelect) {
            directAddUserSelect.innerHTML = '<option value="">-- Choose User Account --</option>' +
                usersList.map(u => {
                    const bal = parseFloat(u.wallet_balance || 0);
                    return `<option value="${u.id}" data-balance="${bal}">${escapeHtml(u.name || 'User')} (${escapeHtml(u.email)}) — Balance: ${bal}৳</option>`;
                }).join('');

            if (preselectedUserId) {
                directAddUserSelect.value = String(preselectedUserId);
            }
        }

        updateDirectAddUserInfo();

        if (directAddAmount) directAddAmount.value = '';

        modalDirectAddFund.style.display = 'flex';
    }

    function updateDirectAddUserInfo() {
        if (!directAddUserSelect) return;
        const selectedOpt = directAddUserSelect.selectedOptions[0];
        if (selectedOpt && selectedOpt.value) {
            const bal = selectedOpt.getAttribute('data-balance') || '0';
            if (directAddUserCurrentBal) directAddUserCurrentBal.textContent = bal + '৳';
            if (directAddUserInfoBox) directAddUserInfoBox.style.display = 'block';
        } else {
            if (directAddUserInfoBox) directAddUserInfoBox.style.display = 'none';
        }
    }

    if (directAddUserSelect) {
        directAddUserSelect.addEventListener('change', updateDirectAddUserInfo);
    }

    if (btnOpenDirectAddFundModal) {
        btnOpenDirectAddFundModal.addEventListener('click', () => openDirectAddFundModal());
    }

    if (btnCloseDirectAddFundModal) {
        btnCloseDirectAddFundModal.addEventListener('click', () => {
            if (modalDirectAddFund) modalDirectAddFund.style.display = 'none';
        });
    }

    if (btnCancelDirectAddFundModal) {
        btnCancelDirectAddFundModal.addEventListener('click', () => {
            if (modalDirectAddFund) modalDirectAddFund.style.display = 'none';
        });
    }

    if (formDirectAddFund) {
        formDirectAddFund.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = directAddUserSelect ? directAddUserSelect.value : '';
            const amount = directAddAmount ? parseFloat(directAddAmount.value) : 0;

            if (!userId) {
                alert('Please select a user account.');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid positive amount.');
                return;
            }

            const btnSubmit = document.getElementById('btnConfirmDirectAddFund');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Fund...';
            }

            try {
                const res = await fetch('/api/admin/wallet/direct-credit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, amount, payment_method: 'Direct Admin Credit', note: 'Admin added fund' })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(d.message || `Successfully added ${amount}৳!`, 'success');
                    if (modalDirectAddFund) modalDirectAddFund.style.display = 'none';
                    await loadAndRenderWalletRequests();
                    await loadAndRenderUsers();
                } else {
                    alert(d.message || 'Error crediting fund.');
                }
            } catch(err) {
                alert('Network error while crediting fund: ' + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Confirm &amp; Add Fund Now';
                }
            }
        });
    }

    // Modal: Deduct / Remove Fund Logic
    const modalDeductFund = document.getElementById('modalDeductFund');
    const btnOpenDeductFundModal = document.getElementById('btnOpenDeductFundModal');
    const btnCloseDeductFundModal = document.getElementById('btnCloseDeductFundModal');
    const btnCancelDeductFundModal = document.getElementById('btnCancelDeductFundModal');
    const formDeductFund = document.getElementById('formDeductFund');
    const deductFundUserSelect = document.getElementById('deductFundUserSelect');
    const deductFundUserInfoBox = document.getElementById('deductFundUserInfoBox');
    const deductFundUserCurrentBal = document.getElementById('deductFundUserCurrentBal');
    const deductFundAmount = document.getElementById('deductFundAmount');
    const deductFundReason = document.getElementById('deductFundReason');

    function openDeductFundModal(preselectedUserId = null) {
        if (!modalDeductFund) return;

        // Populate user select dropdown
        if (deductFundUserSelect) {
            deductFundUserSelect.innerHTML = '<option value="">-- Choose User Account --</option>' +
                usersList.map(u => {
                    const bal = parseFloat(u.wallet_balance || 0);
                    return `<option value="${u.id}" data-balance="${bal}">${escapeHtml(u.name || 'User')} (${escapeHtml(u.email)}) — Balance: ${bal}৳</option>`;
                }).join('');

            if (preselectedUserId) {
                deductFundUserSelect.value = String(preselectedUserId);
            }
        }

        updateDeductUserInfo();

        if (deductFundAmount) deductFundAmount.value = '';
        if (deductFundReason) deductFundReason.value = '';

        modalDeductFund.style.display = 'flex';
    }

    function updateDeductUserInfo() {
        if (!deductFundUserSelect) return;
        const selectedOpt = deductFundUserSelect.selectedOptions[0];
        if (selectedOpt && selectedOpt.value) {
            const bal = selectedOpt.getAttribute('data-balance') || '0';
            if (deductFundUserCurrentBal) deductFundUserCurrentBal.textContent = bal + '৳';
            if (deductFundUserInfoBox) deductFundUserInfoBox.style.display = 'block';
        } else {
            if (deductFundUserInfoBox) deductFundUserInfoBox.style.display = 'none';
        }
    }

    if (deductFundUserSelect) {
        deductFundUserSelect.addEventListener('change', updateDeductUserInfo);
    }

    if (btnOpenDeductFundModal) {
        btnOpenDeductFundModal.addEventListener('click', () => openDeductFundModal());
    }

    if (btnCloseDeductFundModal) {
        btnCloseDeductFundModal.addEventListener('click', () => {
            if (modalDeductFund) modalDeductFund.style.display = 'none';
        });
    }

    if (btnCancelDeductFundModal) {
        btnCancelDeductFundModal.addEventListener('click', () => {
            if (modalDeductFund) modalDeductFund.style.display = 'none';
        });
    }

    if (formDeductFund) {
        formDeductFund.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = deductFundUserSelect ? deductFundUserSelect.value : '';
            const amount = deductFundAmount ? parseFloat(deductFundAmount.value) : 0;
            const reason = deductFundReason ? deductFundReason.value.trim() : '';

            if (!userId) {
                alert('Please select a user account.');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid positive deduction amount.');
                return;
            }

            const btnSubmit = document.getElementById('btnConfirmDeductFund');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deducting...';
            }

            try {
                const res = await fetch('/api/admin/wallet/deduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, amount, reason })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(d.message || `Successfully deducted ${amount}৳!`, 'success');
                    if (modalDeductFund) modalDeductFund.style.display = 'none';
                    await loadAndRenderWalletRequests();
                    await loadAndRenderUsers();
                } else {
                    alert(d.message || 'Error deducting fund.');
                }
            } catch(err) {
                alert('Network error while deducting fund: ' + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Confirm &amp; Deduct Fund';
                }
            }
        });
    }

    // Wallet Toolbar Event Listeners
    const btnReloadWallet = document.getElementById('btnReloadWalletRequests');
    if (btnReloadWallet) {
        btnReloadWallet.addEventListener('click', () => {
            loadAndRenderWalletRequests();
            showToast('Wallet requests refreshed!', 'success');
        });
    }

    const walletSearch = document.getElementById('walletSearchInput');
    if (walletSearch) {
        walletSearch.addEventListener('input', renderWalletRequestsCards);
    }

    const walletFilterChips = document.querySelectorAll('#walletFilterChips .chip-btn');
    walletFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            walletFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentWalletFilter = chip.getAttribute('data-wallet-filter') || 'all';
            renderWalletRequestsCards();
        });
    });

    // HWID Toolbar Listeners
    const btnReloadHwid = document.getElementById('btnReloadHwidRequests');
    if (btnReloadHwid) {
        btnReloadHwid.addEventListener('click', () => {
            loadAndRenderHwidRequests();
            showToast('HWID reset requests refreshed!', 'success');
        });
    }

    const hwidSearch = document.getElementById('hwidSearchInput');
    if (hwidSearch) {
        hwidSearch.addEventListener('input', renderHwidRequestsCards);
    }

    const hwidFilterChips = document.querySelectorAll('#hwidFilterChips .chip-btn');
    hwidFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            hwidFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentHwidFilter = chip.getAttribute('data-hwid-filter') || 'all';
            renderHwidRequestsCards();
        });
    });

    // ============================================================
    // TAB: HWID & DEVICE RESET MANAGEMENT
    // ============================================================
    let hwidRequestsList = [];
    let currentHwidFilter = 'all';

    async function loadAndRenderHwidRequests() {
        try {
            const res = await fetch('/api/admin/hwid/requests?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                hwidRequestsList = data.requests || [];
                updateHwidStats();
                renderHwidRequestsCards();
            }
        } catch (err) {
            console.error('Failed to load HWID requests:', err);
        }
    }

    function updateHwidStats() {
        const total = hwidRequestsList.length;
        const pending = hwidRequestsList.filter(r => r.status === 'pending').length;
        const approved = hwidRequestsList.filter(r => r.status === 'approved').length;
        const rejected = hwidRequestsList.filter(r => r.status === 'rejected').length;

        const statTotal = document.getElementById('statTotalHwidCount');
        const statPending = document.getElementById('statPendingHwidCount');
        const statApproved = document.getElementById('statApprovedHwidCount');
        const statRejected = document.getElementById('statRejectedHwidCount');
        const pendingBadge = document.getElementById('pendingHwidBadge');

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statApproved) statApproved.textContent = approved;
        if (statRejected) statRejected.textContent = rejected;

        if (pendingBadge) {
            if (pending > 0) {
                pendingBadge.style.display = 'inline-block';
                pendingBadge.textContent = pending;
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        const chipAll = document.getElementById('chipCountHwidAll');
        const chipPending = document.getElementById('chipCountHwidPending');
        const chipApproved = document.getElementById('chipCountHwidApproved');
        const chipRejected = document.getElementById('chipCountHwidRejected');

        if (chipAll) chipAll.textContent = total;
        if (chipPending) chipPending.textContent = pending;
        if (chipApproved) chipApproved.textContent = approved;
        if (chipRejected) chipRejected.textContent = rejected;
    }

    function renderHwidRequestsCards() {
        const container = document.getElementById('hwidRequestsListContainer');
        if (!container) return;

        const searchInput = document.getElementById('hwidSearchInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = hwidRequestsList.filter(r => {
            if (currentHwidFilter !== 'all' && r.status !== currentHwidFilter) return false;
            if (query) {
                const qStr = `${r.id} ${r.user_name} ${r.user_email} ${r.user_phone || ''} ${r.order_id || ''} ${r.license_key || ''} ${r.product_name || ''} ${r.reason || ''}`.toLowerCase();
                if (!qStr.includes(query)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                    <i class="fas fa-microchip" style="font-size: 32px; margin-bottom: 10px; color: #475569; display: block;"></i>
                    <p style="font-size: 13px; margin: 0;">No HWID / device reset requests found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(r => {
            const isPending = r.status === 'pending';
            const isApproved = r.status === 'approved';
            const isRejected = r.status === 'rejected';

            const statusBadge = isApproved
                ? `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-check-circle"></i> Reset Done / Unlocked</span>`
                : (isRejected
                    ? `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);"><i class="fas fa-times-circle"></i> Rejected</span>`
                    : `<span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);"><i class="fas fa-clock"></i> Pending Review</span>`);

            const dateStr = r.created_at ? new Date(r.created_at).toLocaleString() : 'Recently';

            return `
                <div class="adm-panel" style="padding: 16px; border-radius: 14px; background: rgba(15, 23, 42, 0.7); border: 1px solid ${isPending ? '#f59e0b40' : (isApproved ? '#10b98140' : '#ef444440')};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-family: monospace; font-weight: 800; color: #f59e0b; font-size: 13px;">${escapeHtml(r.id)}</span>
                                <span style="font-size: 11px; color: #94a3b8;">${dateStr}</span>
                                <span style="font-size: 11px; color: #38bdf8;">Order: <b>${escapeHtml(r.order_id)}</b></span>
                            </div>
                            <h4 style="margin: 4px 0 2px 0; font-size: 15px; font-weight: 800; color: #fff;">
                                <i class="fas fa-user-circle" style="color: #00f0ff;"></i> ${escapeHtml(r.user_name || 'Member')}
                                <span style="font-size: 12px; font-weight: normal; color: #94a3b8; margin-left: 6px;">(${escapeHtml(r.user_email || '')})</span>
                            </h4>
                            <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; font-size: 12px;">
                                <span><b style="color: #94a3b8;">Product:</b> <span style="color: #fff; font-weight: bold;">${escapeHtml(r.product_name)}</span></span>
                                <span><b style="color: #94a3b8;">License Key:</b> <code style="background: rgba(0,0,0,0.6); padding: 2px 7px; border-radius: 6px; color: #fde047; font-weight: bold; font-family: monospace;">${escapeHtml(r.license_key)}</code></span>
                                <span><b style="color: #94a3b8;">Reason:</b> <span style="color: #fcd34d;">${escapeHtml(r.reason)}</span></span>
                                ${r.device_model ? `<span><b style="color: #94a3b8;">Device:</b> <span style="color: #cbd5e1;">${escapeHtml(r.device_model)}</span></span>` : ''}
                            </div>
                        </div>

                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            ${statusBadge}

                            <div style="display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; justify-content: flex-end;">
                                ${!isApproved ? `
                                    <button type="button" class="btn-approve-hwid" data-id="${r.id}" data-key="${escapeHtml(r.license_key)}" style="padding: 6px 14px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 800; font-size: 11px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(16,185,129,0.35);">
                                        <i class="fas fa-check-circle"></i> Approve &amp; Reset HWID
                                    </button>
                                ` : ''}

                                ${isPending ? `
                                    <button type="button" class="btn-reject-hwid" data-id="${r.id}" style="padding: 6px 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.2); color: #ef4444; font-weight: 700; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer;">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                ` : ''}

                                <button type="button" class="btn-delete-hwid" data-id="${r.id}" style="padding: 6px 11px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 800; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" title="Delete this HWID request">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Action Handlers
        container.querySelectorAll('.btn-approve-hwid').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                const key = btn.getAttribute('data-key');
                if (!confirm(`APPROVE & RESET HWID:\nAre you sure you want to approve HWID reset for request ${reqId} and unlock key ${key}?`)) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';

                try {
                    const res = await fetch('/api/admin/hwid/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(d.message || `HWID reset for ${reqId} approved!`, 'success');
                        loadAndRenderHwidRequests();
                    } else {
                        showToast(d.message || 'Error approving HWID reset', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Approve &amp; Reset HWID';
                    }
                } catch(e) {
                    showToast('Failed to approve request', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> Approve &amp; Reset HWID';
                }
            });
        });

        container.querySelectorAll('.btn-reject-hwid').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                const reason = prompt('Enter rejection reason (optional):', 'Device limit reached or invalid verification');
                if (reason === null) return;

                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/hwid/reject', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId, reason })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(`HWID request ${reqId} rejected.`, 'info');
                        loadAndRenderHwidRequests();
                    } else {
                        showToast(d.message || 'Error rejecting request', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to reject request', 'error');
                    btn.disabled = false;
                }
            });
        });

        container.querySelectorAll('.btn-delete-hwid').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reqId = btn.getAttribute('data-id');
                if (!confirm(`Are you sure you want to permanently delete HWID reset request ${reqId}?`)) return;

                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/hwid/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: reqId })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(`HWID request ${reqId} deleted.`, 'info');
                        loadAndRenderHwidRequests();
                    } else {
                        showToast(d.message || 'Error deleting request', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to delete request', 'error');
                    btn.disabled = false;
                }
            });
        });
    }

    // Live Tracking & Auto-Sync Polling (every 8 seconds)
    setInterval(() => {
        const activeTab = document.querySelector('.tab-pane.active');
        if (activeTab && activeTab.id === 'tab-orders') {
            loadAndRenderOrders();
        } else if (activeTab && activeTab.id === 'tab-wallet-requests') {
            loadAndRenderWalletRequests();
        } else if (activeTab && activeTab.id === 'tab-hwid') {
            loadAndRenderHwidRequests();
        } else {
            fetch('/api/admin/orders?_t=' + Date.now())
                .then(r => r.json())
                .then(d => {
                    if (d && d.orders) {
                        ordersList = d.orders;
                        updateOrderStats();
                    }
                }).catch(() => {});

            fetch('/api/admin/wallet/requests?_t=' + Date.now())
                .then(r => r.json())
                .then(d => {
                    if (d && d.requests) {
                        walletRequestsList = d.requests;
                        updateWalletStats();
                    }
                }).catch(() => {});

            fetch('/api/admin/hwid/requests?_t=' + Date.now())
                .then(r => r.json())
                .then(d => {
                    if (d && d.requests) {
                        hwidRequestsList = d.requests;
                        updateHwidStats();
                    }
                }).catch(() => {});
        }
    }, 8000);

    // ============================================================
    // TAB: PROMO CODES & VOUCHERS MANAGEMENT
    // ============================================================
    let couponsList = [];
    let currentCouponFilter = 'all';

    async function loadAndRenderCoupons() {
        try {
            const res = await fetch('/api/admin/coupons?_t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                couponsList = data.coupons || [];
                updateCouponStats();
                renderCouponsCards();
            }
        } catch (err) {
            console.error('Failed to load coupons:', err);
        }
    }

    function updateCouponStats() {
        const total = couponsList.length;
        const activeCount = couponsList.filter(c => c.active && ((c.used_count || 0) < (c.max_uses || 1))).length;
        const singleUseCount = couponsList.filter(c => (c.max_uses || 1) === 1).length;
        const totalUsed = couponsList.reduce((sum, c) => sum + (c.used_count || 0), 0);

        const statTotal = document.getElementById('statTotalCouponsCount');
        const statActive = document.getElementById('statActiveCouponsCount');
        const statSingle = document.getElementById('statSingleUseCount');
        const statUsed = document.getElementById('statUsedCouponsCount');

        if (statTotal) statTotal.textContent = total;
        if (statActive) statActive.textContent = activeCount;
        if (statSingle) statSingle.textContent = singleUseCount;
        if (statUsed) statUsed.textContent = totalUsed;

        const countAll = document.getElementById('chipCountCouponAll');
        const countActive = document.getElementById('chipCountCouponActive');
        const countUsed = document.getElementById('chipCountCouponUsed');
        const countDisabled = document.getElementById('chipCountCouponDisabled');

        if (countAll) countAll.textContent = total;
        if (countActive) countActive.textContent = activeCount;
        if (countUsed) countUsed.textContent = couponsList.filter(c => ((c.used_count || 0) >= (c.max_uses || 1))).length;
        if (countDisabled) countDisabled.textContent = couponsList.filter(c => !c.active).length;
    }

    function renderCouponsCards() {
        const container = document.getElementById('couponsListContainer');
        if (!container) return;

        const searchInput = document.getElementById('couponSearchInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = couponsList.filter(c => {
            const isUsedUp = (c.used_count || 0) >= (c.max_uses || 1);
            if (currentCouponFilter === 'active' && (!c.active || isUsedUp)) return false;
            if (currentCouponFilter === 'used' && !isUsedUp) return false;
            if (currentCouponFilter === 'disabled' && c.active) return false;

            if (query) {
                const qStr = `${c.code} ${c.description || ''} ${c.discount_type || ''}`.toLowerCase();
                if (!qStr.includes(query)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: rgba(8, 15, 35, 0.6); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: var(--adm-text-secondary);">
                    <i class="fas fa-ticket-alt" style="font-size: 32px; color: rgba(0, 240, 255, 0.4); margin-bottom: 10px; display: block;"></i>
                    <p style="margin: 0; font-size: 14px;">No promo codes found matching your criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(c => {
            const isSingleUse = (c.max_uses || 1) === 1;
            const usedCount = c.used_count || 0;
            const maxUses = c.max_uses || 1;
            const isUsedUp = usedCount >= maxUses;

            let statusBadge = '';
            let statusBorder = 'rgba(0, 240, 255, 0.2)';

            if (!c.active) {
                statusBadge = '<span style="background: rgba(107, 114, 128, 0.2); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.4); padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: bold;"><i class="fas fa-pause-circle"></i> Disabled</span>';
                statusBorder = 'rgba(107, 114, 128, 0.3)';
            } else if (isUsedUp) {
                statusBadge = '<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: bold;"><i class="fas fa-ban"></i> Used Up (Expired)</span>';
                statusBorder = 'rgba(239, 68, 68, 0.3)';
            } else {
                statusBadge = '<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: bold;"><i class="fas fa-check-circle"></i> Active &amp; Usable</span>';
                statusBorder = 'rgba(16, 185, 129, 0.3)';
            }

            const discountDisplay = c.discount_type === 'flat' 
                ? `${c.discount_flat || 0}৳ Flat Discount` 
                : `${c.discount_percent || 0}% Discount ${c.max_discount ? `(Max ${c.max_discount}৳)` : ''}`;

            return `
                <div class="coupon-item-card" style="background: rgba(10, 18, 40, 0.7); border: 1px solid ${statusBorder}; border-radius: 12px; padding: 14px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; transition: transform 0.2s, box-shadow 0.2s;">
                    <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; min-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(16, 185, 129, 0.15)); border: 1.5px dashed #00f0ff; color: #00f0ff; font-family: monospace; font-size: 15px; font-weight: 900; letter-spacing: 1px; padding: 6px 12px; border-radius: 8px; text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);">
                                ${c.code}
                            </span>
                            <button type="button" class="btn-copy-coupon-code" data-code="${c.code}" title="Copy code" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #9ca3af; border-radius: 6px; padding: 6px 9px; cursor: pointer;">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: bold; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                <span>${discountDisplay}</span>
                                ${isSingleUse ? '<span style="background: rgba(139, 92, 246, 0.25); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); font-size: 10px; font-weight: bold; padding: 1px 7px; border-radius: 10px;"><i class="fas fa-bolt"></i> 1-Time Single Use</span>' : `<span style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; font-size: 10px; font-weight: bold; padding: 1px 7px; border-radius: 10px;">Multi-Use (${maxUses})</span>`}
                            </div>
                            <div style="font-size: 11px; color: var(--adm-text-secondary); margin-top: 3px;">
                                ${c.description || 'No note'} · Min Order: <strong style="color: #cbd5e1;">${c.min_order || 0}৳</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Usage Status & Limits -->
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div style="text-align: right; min-width: 130px;">
                            <div style="font-size: 12px; font-weight: bold; color: ${isUsedUp ? '#f87171' : '#34d399'};">
                                <i class="fas fa-user-check"></i> ${usedCount} / ${maxUses} Used
                            </div>
                            <div style="margin-top: 3px;">
                                ${statusBadge}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${isUsedUp ? `
                                <button type="button" class="btn-reset-coupon" data-id="${c.id || c.code}" title="Reset usage count to 0 so it can be used again" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-redo"></i> Reset (Reuse)
                                </button>
                            ` : ''}

                            <button type="button" class="btn-toggle-coupon" data-id="${c.id || c.code}" title="${c.active ? 'Pause / Disable' : 'Activate'}" style="background: ${c.active ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; border: 1px solid ${c.active ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}; color: ${c.active ? '#fbbf24' : '#34d399'}; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas ${c.active ? 'fa-pause' : 'fa-play'}"></i> ${c.active ? 'Pause' : 'Enable'}
                            </button>

                            <button type="button" class="btn-delete-coupon" data-id="${c.id || c.code}" title="Delete Promo Code" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind events on cards
        container.querySelectorAll('.btn-copy-coupon-code').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    showToast(`Promo code "${code}" copied to clipboard!`, 'success');
                }).catch(() => {});
            });
        });

        container.querySelectorAll('.btn-toggle-coupon').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/coupons/toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(`Promo code status updated.`, 'success');
                        loadAndRenderCoupons();
                    } else {
                        showToast(d.message || 'Error updating status', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to update status', 'error');
                    btn.disabled = false;
                }
            });
        });

        container.querySelectorAll('.btn-reset-coupon').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!confirm(`Reset usage count for this promo code so it can be used again?`)) return;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/coupons/reset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(d.message || 'Promo code usage reset!', 'success');
                        loadAndRenderCoupons();
                    } else {
                        showToast(d.message || 'Error resetting usage', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to reset usage', 'error');
                    btn.disabled = false;
                }
            });
        });

        container.querySelectorAll('.btn-delete-coupon').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!confirm(`Are you sure you want to delete this promo code permanently?`)) return;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/admin/coupons/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast('Promo code deleted.', 'info');
                        loadAndRenderCoupons();
                    } else {
                        showToast(d.message || 'Error deleting promo code', 'error');
                        btn.disabled = false;
                    }
                } catch(e) {
                    showToast('Failed to delete promo code', 'error');
                    btn.disabled = false;
                }
            });
        });
    }

    // Coupon Creation Form
    const createCouponForm = document.getElementById('createCouponForm');
    if (createCouponForm) {
        createCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btnSubmitCoupon');
            if (btnSubmit) btnSubmit.disabled = true;

            const code = document.getElementById('newCouponCode').value.trim();
            const discount_type = document.getElementById('newCouponType').value;
            const discount_value = document.getElementById('newCouponValue').value;
            const max_uses = document.getElementById('newCouponMaxUses').value;
            const max_discount = document.getElementById('newCouponMaxDiscount').value;
            const min_order = document.getElementById('newCouponMinOrder').value;
            const description = document.getElementById('newCouponDesc').value;
            const single_use_per_user = document.getElementById('newCouponSinglePerUser').checked;

            try {
                const res = await fetch('/api/admin/coupons/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        discount_type,
                        discount_value,
                        max_uses,
                        max_discount,
                        min_order,
                        description,
                        single_use_per_user
                    })
                });
                const d = await res.json();
                if (btnSubmit) btnSubmit.disabled = false;

                if (d.success) {
                    showToast(d.message || 'Promo code created successfully!', 'success');
                    createCouponForm.reset();
                    document.getElementById('newCouponMaxUses').value = '1';
                    document.getElementById('newCouponMaxDiscount').value = '0';
                    document.getElementById('newCouponMinOrder').value = '0';
                    document.getElementById('newCouponSinglePerUser').checked = true;
                    loadAndRenderCoupons();
                } else {
                    showToast(d.message || 'Error creating promo code', 'error');
                }
            } catch(err) {
                if (btnSubmit) btnSubmit.disabled = false;
                showToast('Failed to connect to server', 'error');
            }
        });
    }

    // Random Code Generator Button
    const btnGenCode = document.getElementById('btnGenCouponCode');
    if (btnGenCode) {
        btnGenCode.addEventListener('click', () => {
            const prefixes = ['ZERO', 'VIP', 'SPECIAL', 'SAVE', 'DISC', 'BONUS'];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const randomNum = Math.floor(100 + Math.random() * 900);
            const inputCode = document.getElementById('newCouponCode');
            if (inputCode) {
                inputCode.value = `${prefix}${randomNum}`;
                inputCode.focus();
            }
        });
    }

    // Discount Type Toggle label
    const selectCouponType = document.getElementById('newCouponType');
    if (selectCouponType) {
        selectCouponType.addEventListener('change', () => {
            const lbl = document.getElementById('lblDiscountVal');
            const inputVal = document.getElementById('newCouponValue');
            if (selectCouponType.value === 'flat') {
                if (lbl) lbl.textContent = 'Discount Value (৳ Flat) *';
                if (inputVal) inputVal.placeholder = 'e.g. 50 or 100';
            } else {
                if (lbl) lbl.textContent = 'Discount Value (%) *';
                if (inputVal) inputVal.placeholder = 'e.g. 15 or 50';
            }
        });
    }

    // Reload coupons button
    const btnReloadCoupons = document.getElementById('btnReloadCoupons');
    if (btnReloadCoupons) {
        btnReloadCoupons.addEventListener('click', () => {
            loadAndRenderCoupons();
            showToast('Promo codes refreshed!', 'success');
        });
    }

    // Coupon Search input
    const couponSearch = document.getElementById('couponSearchInput');
    if (couponSearch) {
        couponSearch.addEventListener('input', renderCouponsCards);
    }

    // Coupon Filter chips
    const couponFilterChips = document.querySelectorAll('#couponFilterChips .chip-btn');
    couponFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            couponFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentCouponFilter = chip.getAttribute('data-coupon-filter') || 'all';
            renderCouponsCards();
        });
    });

    checkAuth();
});

// Discord Bot Test Action (Hard-Locked to Channel 1566503959336718367)
window.testDiscordNotification = async function() {
    const btn = document.getElementById('btnTestDiscord');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Test...';
    }
    try {
        const res = await fetch('/api/admin/discord/test', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message, 'success');
            } else {
                alert(data.message);
            }
        } else {
            alert('Discord Error: ' + (data.message || 'Failed'));
        }
    } catch (err) {
        alert('Network error testing Discord: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Test Discord Alert';
        }
    }
};

// Global Handler for Unblocking Fraud Users
document.addEventListener('click', async function(e) {
    const unblockBtn = e.target.closest('.btn-unblock-fraud');
    if (unblockBtn) {
        const userId = unblockBtn.dataset.userId;
        if (!confirm('Clear fraud restrictions and unblock this user?')) return;
        try {
            const res = await fetch('/api/admin/users/unblock-fraud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                if (typeof loadUsers === 'function') loadUsers();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    }
});

// =========================================================================
// ADMIN CONTROLLER: FREE SPIN REWARDS & LUCKY WHEEL MANAGEMENT
// =========================================================================
let currentSpinCfg = null;

async function loadSpinSettings() {
    try {
        const res = await fetch('/api/admin/spin/settings');
        const data = await res.json();
        if (data.success && data.settings) {
            currentSpinCfg = data.settings;
            renderSpinEditor(data.settings);
        }
    } catch (err) {
        console.error('Error loading spin settings:', err);
    }
}

function renderSpinEditor(cfg) {
    const enabledSwitch = document.getElementById('spinEnabledSwitch');
    const depositInput = document.getElementById('spinDepositThreshold');
    const spendInput = document.getElementById('spinSpendThreshold');
    const titleInput = document.getElementById('spinModalTitle');
    const container = document.getElementById('spinSegmentsEditorContainer');

    if (enabledSwitch) enabledSwitch.checked = cfg.enabled !== false;
    if (depositInput) depositInput.value = cfg.deposit_threshold || 500;
    if (spendInput) spendInput.value = cfg.spend_threshold || 500;
    if (titleInput) titleInput.value = cfg.title || 'LUCKY SPIN & WIN REWARDS';

    if (!container) return;
    container.innerHTML = '';

    const segments = cfg.segments || [];
    segments.forEach((seg, idx) => {
        const card = document.createElement('div');
        card.className = 'adm-panel';
        card.style.cssText = 'background: rgba(0,0,0,0.35); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px; position: relative;';

        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 900; font-family: monospace; font-size: 13px; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: #f59e0b; color: #000; text-align: center; line-height: 22px; font-weight: bold; font-size: 11px;">${idx + 1}</span>
                    Segment #${idx + 1}
                </span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 11px; color: var(--adm-text-secondary);">Color:</span>
                    <input type="color" id="spinColor_${idx}" value="${seg.color || '#f59e0b'}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                </div>
            </div>

            <div style="display: grid; gap: 10px;">
                <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 2px;">Reward Type (কি দেওয়া হবে)</label>
                    <select id="spinType_${idx}" style="width: 100%; padding: 7px 10px; border-radius: 8px; background: #070d1a; color: #fff; border: 1px solid rgba(255,255,255,0.15); font-size: 12px;">
                        <option value="balance" ${seg.type === 'balance' ? 'selected' : ''}>💰 Wallet Balance (টাকা ব্যালেন্স - Max 10৳)</option>
                        <option value="coupon" ${seg.type === 'coupon' ? 'selected' : ''}>🎟️ Promo Code Discount (কুপন ডিসকাউন্ট - Max 5%)</option>
                        <option value="none" ${seg.type === 'none' ? 'selected' : ''}>🔄 Try Tomorrow / No Reward (ফাঁকা / মিস)</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 2px;">Value (পরিমাণ ৳ বা %)</label>
                        <input type="number" id="spinValue_${idx}" value="${seg.value || 0}" min="0" step="1" style="width: 100%; padding: 7px 10px; border-radius: 8px; background: #070d1a; color: #38bdf8; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); font-size: 12px;" placeholder="e.g. 5">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 2px;">Chance Weight (সম্ভাবনা %)</label>
                        <input type="number" id="spinWeight_${idx}" value="${seg.weight || 10}" min="1" step="1" style="width: 100%; padding: 7px 10px; border-radius: 8px; background: #070d1a; color: #10b981; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); font-size: 12px;" placeholder="e.g. 30">
                    </div>
                </div>

                <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--adm-text-secondary); display: block; margin-bottom: 2px;">Label on Wheel (চাকায় লেখা নাম)</label>
                    <input type="text" id="spinLabel_${idx}" value="${seg.label || ''}" style="width: 100%; padding: 7px 10px; border-radius: 8px; background: #070d1a; color: #fff; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); font-size: 12px;" placeholder="e.g. ৳5 Balance">
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function saveSpinSettings() {
    const enabled = document.getElementById('spinEnabledSwitch')?.checked !== false;
    const deposit_threshold = parseFloat(document.getElementById('spinDepositThreshold')?.value) || 500;
    const spend_threshold = parseFloat(document.getElementById('spinSpendThreshold')?.value) || 500;
    const title = document.getElementById('spinModalTitle')?.value || 'LUCKY SPIN & WIN REWARDS';

    const segments = [];
    for (let i = 0; i < 8; i++) {
        const label = document.getElementById(`spinLabel_${i}`)?.value || `Slice #${i + 1}`;
        const type = document.getElementById(`spinType_${i}`)?.value || 'none';
        const value = parseFloat(document.getElementById(`spinValue_${i}`)?.value) || 0;
        const weight = parseFloat(document.getElementById(`spinWeight_${i}`)?.value) || 10;
        const color = document.getElementById(`spinColor_${i}`)?.value || '#f59e0b';

        segments.push({ index: i, label, type, value, weight, color });
    }

    try {
        const res = await fetch('/api/admin/spin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, deposit_threshold, spend_threshold, title, segments })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Free Spin Rewards & Rules (500৳ Deposit/Spend) successfully saved!');
            if (typeof showToast === 'function') showToast('Spin rules saved successfully!', 'success');
        } else {
            alert('Error saving spin settings: ' + data.message);
        }
    } catch (err) {
        alert('Network error saving spin settings: ' + err.message);
    }
}

async function resetSpinDefaults() {
    if (!confirm('Are you sure you want to reset all 8 wheel segments to default prizes?')) return;
    const defaultSegments = [
        { index: 0, label: 'Try Tomorrow', type: 'none', value: 0, weight: 8, color: '#475569' },
        { index: 1, label: '৳1 Balance', type: 'balance', value: 1, weight: 65, color: '#06b6d4' },
        { index: 2, label: 'Better Luck', type: 'none', value: 0, weight: 5, color: '#334155' },
        { index: 3, label: '2% Promo Code', type: 'coupon', value: 2, weight: 10, color: '#a855f7' },
        { index: 4, label: '৳2 Balance', type: 'balance', value: 2, weight: 6, color: '#00f0ff' },
        { index: 5, label: '5% VIP Promo', type: 'coupon', value: 5, weight: 2, color: '#f59e0b' },
        { index: 6, label: '৳5 Balance', type: 'balance', value: 5, weight: 3, color: '#10b981' },
        { index: 7, label: '৳10 Grand Prize', type: 'balance', value: 10, weight: 1, color: '#ec4899' }
    ];

    try {
        const res = await fetch('/api/admin/spin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true, deposit_threshold: 500, spend_threshold: 500, segments: defaultSegments })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Reset to default wheel configuration (Max 10৳ / Max 5% Coupon)!');
            loadSpinSettings();
        }
    } catch (err) {
        alert('Reset error: ' + err.message);
    }
}

// Hook save and reset buttons
document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btnSaveSpinSettings');
    if (btnSave) btnSave.addEventListener('click', saveSpinSettings);

    const btnReset = document.getElementById('btnResetSpinDefaults');
    if (btnReset) btnReset.addEventListener('click', resetSpinDefaults);

    const navBtnSpin = document.getElementById('navBtnSpin');
    if (navBtnSpin) navBtnSpin.addEventListener('click', loadSpinSettings);

    const navBtnReferrals = document.getElementById('navBtnReferrals');
    if (navBtnReferrals) navBtnReferrals.addEventListener('click', loadReferralAdminData);

    const btnSaveRef = document.getElementById('btnSaveReferralSettings');
    if (btnSaveRef) btnSaveRef.addEventListener('click', saveReferralSettings);

    const btnManualCredit = document.getElementById('btnManualCreditRef');
    if (btnManualCredit) btnManualCredit.addEventListener('click', submitManualReferralCredit);
});

// ============================================================
// DISCORD REFERRAL & EARN ADMIN CONTROLLER
// ============================================================
async function loadReferralAdminData() {
    try {
        const res = await fetch('/api/admin/referrals/data');
        const data = await res.json();
        if (!data.success) return;

        const cfg = data.settings || {};
        const toggle = document.getElementById('referralEnabledToggle');
        const toggleLbl = document.getElementById('referralEnabledLabel');
        const targetInput = document.getElementById('referralTargetCount');
        const rewardInput = document.getElementById('referralRewardAmount');
        const discordInput = document.getElementById('referralDiscordUrl');

        if (toggle) {
            toggle.checked = cfg.enabled !== false;
            if (toggleLbl) toggleLbl.textContent = toggle.checked ? 'System Active' : 'System Disabled';
            toggle.onchange = () => {
                if (toggleLbl) toggleLbl.textContent = toggle.checked ? 'System Active' : 'System Disabled';
            };
        }
        if (targetInput) targetInput.value = cfg.target_count || 10;
        if (rewardInput) rewardInput.value = cfg.reward_amount || 10;
        if (discordInput) discordInput.value = cfg.discord_invite_url || '';

        const countBadge = document.getElementById('totalRefLogCount');
        if (countBadge) countBadge.textContent = data.totalReferralsLogged || 0;

        // Render Table
        const tbody = document.getElementById('referralsTableBody');
        if (!tbody) return;

        const list = data.referrals || [];
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No referrals logged yet. Share your invite link to start tracking!</td></tr>';
            return;
        }

        tbody.innerHTML = list.map((r, i) => {
            const dateStr = new Date(r.created_at).toLocaleString();
            const milestoneBadge = r.milestone_awarded
                ? '<span style="padding: 3px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: bold; font-size: 11px;">✓ 10৳ Paid</span>'
                : '<span style="padding: 3px 8px; border-radius: 6px; background: rgba(6, 182, 212, 0.2); color: #00f0ff; font-weight: bold; font-size: 11px;">Counted (+1)</span>';

            return `
                <tr>
                    <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">${dateStr}</td>
                    <td>
                        <strong style="color: #fff;">${r.referrer_name || 'Member'}</strong>
                        <div style="font-size: 10px; color: #38bdf8; font-family: monospace;">${r.referrer_email || ''} (ID: ${r.referrer_id})</div>
                    </td>
                    <td>
                        <span style="font-family: monospace; font-weight: 900; color: #f59e0b;">${r.referrer_current || 0} / 10</span>
                        <div style="font-size: 10px; color: #94a3b8;">Bal: ${r.referrer_balance || 0}৳</div>
                    </td>
                    <td>
                        <strong style="color: #fff;">${r.referred_user_name || 'New Member'}</strong>
                        <div style="font-size: 10px; color: #a5b4fc; font-family: monospace;">${r.referred_user_email || ''}</div>
                    </td>
                    <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">${r.source || 'web'}</td>
                    <td>${milestoneBadge}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading referral admin data:', err);
    }
}

async function saveReferralSettings() {
    const toggle = document.getElementById('referralEnabledToggle');
    const targetInput = document.getElementById('referralTargetCount');
    const rewardInput = document.getElementById('referralRewardAmount');
    const discordInput = document.getElementById('referralDiscordUrl');

    const btn = document.getElementById('btnSaveReferralSettings');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const payload = {
            enabled: toggle ? toggle.checked : true,
            target_count: targetInput ? parseInt(targetInput.value) || 10 : 10,
            reward_amount: rewardInput ? parseFloat(rewardInput.value) || 10 : 10,
            discord_invite_url: discordInput ? discordInput.value.trim() : ''
        };

        const res = await fetch('/api/admin/referrals/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Referral settings successfully saved!');
            loadReferralAdminData();
        } else {
            alert('Failed: ' + (data.message || 'Error'));
        }
    } catch(err) {
        alert('Network error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}


async function submitManualReferralCredit() {
    const userIdentifierInput = document.getElementById('manualRefUserIdentifier');
    const countInput = document.getElementById('manualRefCount');
    const noteInput = document.getElementById('manualRefNote');

    const identifier = userIdentifierInput ? userIdentifierInput.value.trim() : '';
    const count = countInput ? parseInt(countInput.value) || 1 : 1;
    const note = noteInput ? noteInput.value.trim() : '';

    if (!identifier) {
        alert('Please enter user email or account ID.');
        return;
    }

    const btn = document.getElementById('btnManualCreditRef');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Crediting...';
    }

    try {
        const res = await fetch('/api/admin/referrals/manual-credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_identifier: identifier, count: count, note: note })
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Referral credited successfully!');
            if (userIdentifierInput) userIdentifierInput.value = '';
            if (noteInput) noteInput.value = '';
            loadReferralAdminData();
        } else {
            alert('Error: ' + (data.message || 'Could not credit referral.'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

// ============================================================
// ADMIN VIP MEMBERSHIP CONTROLLER
// ============================================================
async function loadVipAdminSettings() {
    try {
        const res = await fetch('/api/admin/vip/settings');
        const data = await res.json();
        if (!data.success) return;

        const s = data.settings || {};
        const enabledToggle = document.getElementById('vipEnabledToggle');
        const enabledLabel = document.getElementById('vipEnabledLabel');
        const priceInput = document.getElementById('vipPriceInput');
        const durationInput = document.getElementById('vipDurationDaysInput');
        const discountInput = document.getElementById('vipDiscountInput');
        const titleInput = document.getElementById('vipTitleInput');
        const perksTextarea = document.getElementById('vipPerksTextarea');
        const totalCountSpan = document.getElementById('totalVipMembersCount');
        const tbody = document.getElementById('vipMembersTableBody');

        if (enabledToggle) {
            enabledToggle.checked = s.enabled !== false;
            if (enabledLabel) enabledLabel.innerText = enabledToggle.checked ? 'VIP Active on Site' : 'VIP Disabled';
        }
        if (priceInput) priceInput.value = s.price || 250;
        if (durationInput) durationInput.value = s.duration_days || 30;
        if (discountInput) discountInput.value = s.discount_percent || 10;
        if (titleInput) titleInput.value = s.title || 'ZERO VIP PASS';
        if (perksTextarea) {
            perksTextarea.value = Array.isArray(s.perks) ? s.perks.join('\n') : '';
        }

        const activeUsers = data.activeVipUsers || [];
        if (totalCountSpan) totalCountSpan.innerText = activeUsers.length;

        if (tbody) {
            if (activeUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No active VIP members yet.</td></tr>';
            } else {
                tbody.innerHTML = activeUsers.map(u => `
                    <tr>
                        <td style="font-weight: 700; color: #fff;">
                            <i class="fas fa-crown" style="color: #f59e0b; margin-right: 6px;"></i> ${escapeHtml(u.name || 'Gamer')}
                        </td>
                        <td style="font-family: monospace; color: #94a3b8;">${escapeHtml(u.email || '-')}</td>
                        <td style="color: #cbd5e1;">${escapeHtml(u.phone || '-')}</td>
                        <td>
                            <span style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-size: 11px;">
                                ${u.days_left} Days Left
                            </span>
                        </td>
                        <td style="color: #94a3b8; font-size: 11px;">${new Date(u.vip_until).toLocaleDateString()}</td>
                        <td>
                            <button type="button" onclick="revokeUserVip('${u.id}', '${escapeHtml(u.name)}')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">
                                <i class="fas fa-ban"></i> Revoke
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading VIP admin settings:', err);
    }
}

async function saveVipAdminSettings() {
    const btn = document.getElementById('btnSaveVipSettings');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const payload = {
            enabled: document.getElementById('vipEnabledToggle') ? document.getElementById('vipEnabledToggle').checked : true,
            price: document.getElementById('vipPriceInput') ? parseFloat(document.getElementById('vipPriceInput').value) : 250,
            duration_days: document.getElementById('vipDurationDaysInput') ? parseInt(document.getElementById('vipDurationDaysInput').value) : 30,
            discount_percent: document.getElementById('vipDiscountInput') ? parseFloat(document.getElementById('vipDiscountInput').value) : 10,
            title: document.getElementById('vipTitleInput') ? document.getElementById('vipTitleInput').value.trim() : 'ZERO VIP PASS',
            perks: document.getElementById('vipPerksTextarea') ? document.getElementById('vipPerksTextarea').value : ''
        };

        const res = await fetch('/api/admin/vip/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'VIP Settings updated successfully!');
            loadVipAdminSettings();
        } else {
            alert('Failed: ' + (data.message || 'Error saving VIP settings'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function revokeUserVip(userId, userName) {
    if (!confirm(`Are you sure you want to revoke VIP membership from ${userName}?`)) return;
    try {
        const res = await fetch('/api/admin/vip/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        alert(data.message || 'VIP revoked');
        loadVipAdminSettings();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ============================================================
// ADMIN CYBER MYSTERY BOX CONTROLLER
// ============================================================
let currentMysterySettings = null;
let mysteryRewardsList = [];

function updateMysteryTotalChance() {
    const badge = document.getElementById('mysteryTotalChanceBadge');
    if (!badge) return;
    const total = mysteryRewardsList.reduce((sum, r) => sum + (parseFloat(r.chance) || 0), 0);
    badge.innerText = `Total Chance: ${Math.round(total * 10) / 10}%`;
    if (Math.round(total) === 100) {
        badge.style.color = '#10b981';
        badge.style.borderColor = '#10b981';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
    } else if (total > 100) {
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
    } else {
        badge.style.color = '#f59e0b';
        badge.style.borderColor = '#f59e0b';
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
    }
}

function renderMysteryRewardCards() {
    const container = document.getElementById('mysteryRewardsEditorContainer');
    if (!container) return;

    if (mysteryRewardsList.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; background: rgba(15, 23, 42, 0.6); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; color: #94a3b8;">
                <i class="fas fa-box-open" style="font-size: 28px; color: #00f0ff; margin-bottom: 8px;"></i>
                <p style="margin: 0; font-size: 13px;">কোনো রিওয়ার্ড পুল নেই। নতুন রিওয়ার্ড যোগ করতে উপরের <strong>Add New Reward</strong> বাটনে ক্লিক করুন।</p>
            </div>
        `;
        updateMysteryTotalChance();
        return;
    }

    container.innerHTML = mysteryRewardsList.map((r, idx) => {
        const isKey = r.type === 'key';
        const cardColor = r.color || '#00f0ff';
        return `
            <div class="mystery-reward-card" style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid ${cardColor}; border-radius: 14px; padding: 14px; position: relative; transition: all 0.2s;" data-idx="${idx}">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: ${cardColor}; color: #000; font-weight: 900; font-size: 10.5px; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                            ${escapeHtml(r.badge || 'TIER')}
                        </span>
                        <span style="font-family: monospace; font-size: 11px; color: #a5b4fc;">
                            Drop: <strong style="color: #f59e0b;">${r.chance || 0}%</strong>
                        </span>
                    </div>
                    <button type="button" class="btn-del-mystery-reward" data-idx="${idx}" title="Delete Reward" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>

                <div style="display: grid; gap: 8px;">
                    <div>
                        <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Reward Title / Name</label>
                        <input type="text" class="input-rew-name" data-idx="${idx}" value="${escapeHtml(r.name || '')}" placeholder="e.g. 70৳ Wallet Cash" style="width: 100%; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 12px; font-weight: bold;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Reward Type</label>
                            <select class="select-rew-type" data-idx="${idx}" style="width: 100%; padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px; font-weight: bold;">
                                <option value="wallet" ${r.type === 'wallet' ? 'selected' : ''}>💰 Wallet Cash (৳)</option>
                                <option value="key" ${r.type === 'key' ? 'selected' : ''}>🔑 License Key</option>
                                <option value="spin" ${r.type === 'spin' ? 'selected' : ''}>🎡 Lucky Spin Tickets</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${isKey ? 'Quantity' : (r.type === 'spin' ? 'Spin Count' : 'Cash Amount (৳)')}</label>
                            <input type="number" class="input-rew-amount" data-idx="${idx}" value="${r.amount || 0}" min="0" style="width: 100%; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #10b981; font-weight: bold; font-size: 12px;">
                        </div>
                    </div>

                    ${isKey ? `
                    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; border: 1px dashed rgba(168, 85, 247, 0.4);">
                        <div>
                            <label style="font-size: 10px; color: #c084fc; font-weight: 700; text-transform: uppercase;">Product Name</label>
                            <input type="text" class="input-rew-product" data-idx="${idx}" value="${escapeHtml(r.product_name || 'Free Fire Non-Root')}" placeholder="e.g. Free Fire Non-Root" style="width: 100%; padding: 5px 8px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px;">
                        </div>
                        <div>
                            <label style="font-size: 10px; color: #c084fc; font-weight: 700; text-transform: uppercase;">Duration</label>
                            <input type="text" class="input-rew-duration" data-idx="${idx}" value="${escapeHtml(r.duration || '1 Day')}" placeholder="e.g. 1 Day" style="width: 100%; padding: 5px 8px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px;">
                        </div>
                    </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Badge Tier Label</label>
                            <input type="text" class="input-rew-badge" data-idx="${idx}" value="${escapeHtml(r.badge || 'WIN')}" placeholder="LEGENDARY, EPIC..." style="width: 100%; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px; font-weight: 700;">
                        </div>
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Drop Chance (%)</label>
                            <input type="number" class="input-rew-chance" data-idx="${idx}" value="${r.chance || 10}" min="1" max="100" style="width: 100%; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #f59e0b; font-weight: bold; font-size: 12px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center;">
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Theme Color</label>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="color" class="input-rew-color" data-idx="${idx}" value="${cardColor}" style="width: 34px; height: 30px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                                <span style="font-family: monospace; font-size: 11px; color: #cbd5e1;">${cardColor}</span>
                            </div>
                        </div>
                        <div>
                            <label style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Icon</label>
                            <select class="select-rew-icon" data-idx="${idx}" style="width: 100%; padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px;">
                                <option value="fa-sack-dollar" ${r.icon === 'fa-sack-dollar' ? 'selected' : ''}>💰 Money Bag</option>
                                <option value="fa-coins" ${r.icon === 'fa-coins' ? 'selected' : ''}>🪙 Coins</option>
                                <option value="fa-wallet" ${r.icon === 'fa-wallet' ? 'selected' : ''}>👛 Wallet</option>
                                <option value="fa-key" ${r.icon === 'fa-key' ? 'selected' : ''}>🔑 License Key</option>
                                <option value="fa-dharmachakra" ${r.icon === 'fa-dharmachakra' ? 'selected' : ''}>🎡 Spin Wheel</option>
                                <option value="fa-gift" ${r.icon === 'fa-gift' ? 'selected' : ''}>🎁 Gift Box</option>
                                <option value="fa-gem" ${r.icon === 'fa-gem' ? 'selected' : ''}>💎 Diamond</option>
                                <option value="fa-trophy" ${r.icon === 'fa-trophy' ? 'selected' : ''}>🏆 Trophy</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach listeners to cards
    container.querySelectorAll('.input-rew-name').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].name = e.target.value;
        });
    });

    container.querySelectorAll('.select-rew-type').forEach(el => {
        el.addEventListener('change', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) {
                mysteryRewardsList[idx].type = e.target.value;
                if (e.target.value === 'key' && (!mysteryRewardsList[idx].icon || mysteryRewardsList[idx].icon === 'fa-sack-dollar')) {
                    mysteryRewardsList[idx].icon = 'fa-key';
                }
                renderMysteryRewardCards();
            }
        });
    });

    container.querySelectorAll('.input-rew-amount').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].amount = parseFloat(e.target.value) || 0;
        });
    });

    container.querySelectorAll('.input-rew-product').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].product_name = e.target.value;
        });
    });

    container.querySelectorAll('.input-rew-duration').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].duration = e.target.value;
        });
    });

    container.querySelectorAll('.input-rew-badge').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].badge = e.target.value;
        });
    });

    container.querySelectorAll('.input-rew-chance').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) {
                mysteryRewardsList[idx].chance = parseFloat(e.target.value) || 0;
                updateMysteryTotalChance();
            }
        });
    });

    container.querySelectorAll('.input-rew-color').forEach(el => {
        el.addEventListener('change', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) {
                mysteryRewardsList[idx].color = e.target.value;
                renderMysteryRewardCards();
            }
        });
    });

    container.querySelectorAll('.select-rew-icon').forEach(el => {
        el.addEventListener('change', e => {
            const idx = parseInt(e.target.dataset.idx);
            if (mysteryRewardsList[idx]) mysteryRewardsList[idx].icon = e.target.value;
        });
    });

    container.querySelectorAll('.btn-del-mystery-reward').forEach(el => {
        el.addEventListener('click', e => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            if (confirm('Are you sure you want to remove this reward from the pool?')) {
                mysteryRewardsList.splice(idx, 1);
                renderMysteryRewardCards();
            }
        });
    });

    updateMysteryTotalChance();
}

function addMysteryRewardRow() {
    mysteryRewardsList.push({
        id: "rew_" + Date.now(),
        name: "50৳ Wallet Cash",
        type: "wallet",
        amount: 50,
        chance: 10,
        badge: "RARE",
        color: "#00f0ff",
        icon: "fa-sack-dollar",
        product_name: "Free Fire Non-Root",
        duration: "1 Day"
    });
    renderMysteryRewardCards();
}

async function loadMysteryAdminSettings() {
    try {
        const res = await fetch('/api/admin/mystery/settings');
        const data = await res.json();
        if (!data.success) return;

        currentMysterySettings = data.settings || {};
        const s = currentMysterySettings;

        const enabledToggle = document.getElementById('mysteryEnabledToggle');
        const enabledLabel = document.getElementById('mysteryEnabledLabel');
        const costInput = document.getElementById('mysteryBoxCostInput');
        const titleInput = document.getElementById('mysteryTitleInput');
        const tbody = document.getElementById('mysteryDropsTableBody');

        if (enabledToggle) {
            enabledToggle.checked = s.enabled !== false;
            if (enabledLabel) enabledLabel.innerText = enabledToggle.checked ? 'System Active' : 'System Disabled';
        }
        if (costInput) costInput.value = s.box_cost || 50;
        if (titleInput) titleInput.value = s.title || 'CYBER MYSTERY BOX';

        // Initialize editable rewards list
        mysteryRewardsList = (s.rewards && Array.isArray(s.rewards)) ? JSON.parse(JSON.stringify(s.rewards)) : [];
        renderMysteryRewardCards();

        // Render recent drops
        if (tbody) {
            const drops = s.recent_drops || [];
            if (drops.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No recent drop logs recorded.</td></tr>';
            } else {
                tbody.innerHTML = drops.map(d => `
                    <tr>
                        <td style="font-weight: 700; color: #fff;">${escapeHtml(d.user_name || 'Gamer')}</td>
                        <td style="color: ${d.color || '#00f0ff'}; font-weight: 800;">${escapeHtml(d.reward_name || '')}</td>
                        <td>
                            <span style="background: ${d.color || '#00f0ff'}; color: #000; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 4px;">
                                ${escapeHtml(d.badge || 'WIN')}
                            </span>
                        </td>
                        <td style="color: #94a3b8; font-size: 11px;">${escapeHtml(d.time_ago || 'Recent')}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading mystery box settings:', err);
    }
}

async function saveMysteryAdminSettings() {
    const btn = document.getElementById('btnSaveMysterySettings');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        if (!mysteryRewardsList || mysteryRewardsList.length === 0) {
            alert('Please add at least one reward to the Mystery Box pool before saving.');
            return;
        }

        const payload = {
            enabled: document.getElementById('mysteryEnabledToggle') ? document.getElementById('mysteryEnabledToggle').checked : true,
            box_cost: document.getElementById('mysteryBoxCostInput') ? parseFloat(document.getElementById('mysteryBoxCostInput').value) || 50 : 50,
            title: document.getElementById('mysteryTitleInput') ? document.getElementById('mysteryTitleInput').value.trim() : 'CYBER MYSTERY BOX',
            rewards: mysteryRewardsList
        };

        const res = await fetch('/api/admin/mystery/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Mystery Box settings updated successfully!');
            loadMysteryAdminSettings();
        } else {
            alert('Failed: ' + (data.message || 'Error saving settings'));
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function clearMysteryDropsLog() {
    if (!confirm('Are you sure you want to clear all recorded Mystery Box winner drop logs?')) return;
    try {
        const res = await fetch('/api/admin/mystery/clear-drops', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Logs cleared');
        loadMysteryAdminSettings();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Bind Buttons
document.addEventListener('DOMContentLoaded', () => {
    const navBtnVip = document.getElementById('navBtnVip');
    if (navBtnVip) navBtnVip.addEventListener('click', loadVipAdminSettings);

    const navBtnMystery = document.getElementById('navBtnMystery');
    if (navBtnMystery) navBtnMystery.addEventListener('click', loadMysteryAdminSettings);

    const btnSaveVipSettings = document.getElementById('btnSaveVipSettings');
    if (btnSaveVipSettings) btnSaveVipSettings.addEventListener('click', saveVipAdminSettings);

    const btnSaveMysterySettings = document.getElementById('btnSaveMysterySettings');
    if (btnSaveMysterySettings) btnSaveMysterySettings.addEventListener('click', saveMysteryAdminSettings);

    const btnAddMysteryReward = document.getElementById('btnAddMysteryReward');
    if (btnAddMysteryReward) btnAddMysteryReward.addEventListener('click', addMysteryRewardRow);

    const btnClearMysteryDrops = document.getElementById('btnClearMysteryDrops');
    if (btnClearMysteryDrops) btnClearMysteryDrops.addEventListener('click', clearMysteryDropsLog);

    const vipEnabledToggle = document.getElementById('vipEnabledToggle');
    if (vipEnabledToggle) {
        vipEnabledToggle.addEventListener('change', () => {
            const lbl = document.getElementById('vipEnabledLabel');
            if (lbl) lbl.innerText = vipEnabledToggle.checked ? 'VIP Active on Site' : 'VIP Disabled';
        });
    }

    const mysteryEnabledToggle = document.getElementById('mysteryEnabledToggle');
    if (mysteryEnabledToggle) {
        mysteryEnabledToggle.addEventListener('change', () => {
            const lbl = document.getElementById('mysteryEnabledLabel');
            if (lbl) lbl.innerText = mysteryEnabledToggle.checked ? 'System Active' : 'System Disabled';
        });
    }
});


// ============================================================
// FLASH SALE ADMIN LOGIC
// ============================================================
let currentFlashSaleSettings = null;

async function loadFlashSaleAdminSettings() {
    try {
        const res = await fetch('/api/admin/flash-sale');
        const data = await res.json();
        if (!data.success) return;

        const s = data.flashSale || {};
        currentFlashSaleSettings = s;

        const toggle = document.getElementById('fsEnabledToggle');
        const label = document.getElementById('fsEnabledLabel');
        const tag = document.getElementById('fsBannerTag');
        const disc = document.getElementById('fsDiscountPercent');
        const title = document.getElementById('fsTitle');
        const sub = document.getElementById('fsSubtitle');
        const endInput = document.getElementById('fsEndTimeInput');

        if (toggle) {
            toggle.checked = s.enabled !== false;
            if (label) label.textContent = toggle.checked ? 'Active on Storefront' : 'Disabled';
        }
        if (tag) tag.value = s.banner_tag || 'UP TO 50% OFF';
        if (disc) disc.value = s.discount_percent || 30;
        if (title) title.value = s.title || '⚡ MIDNIGHT CYBER FLASH SALE';
        if (sub) sub.value = s.subtitle || 'সীমিত সময়ের জন্য বিশেষ মেগা অফার! শেষ হতে আর মাত্র:';

        if (endInput && s.end_time) {
            try {
                const d = new Date(s.end_time);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                endInput.value = d.toISOString().slice(0, 16);
            } catch (e) {
                endInput.value = '';
            }
        }

        renderFlashSaleProductsSelector(s.product_ids || []);
    } catch (err) {
        console.error('Error loading flash sale settings:', err);
    }
}

function renderFlashSaleProductsSelector(selectedIds) {
    const container = document.getElementById('fsProductsSelectorList');
    if (!container) return;

    if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 12px;">No products available to select.</p>';
        return;
    }

    const selSet = new Set(selectedIds || []);
    container.innerHTML = catalogProducts.map(p => {
        const isChecked = selSet.has(p.id) ? 'checked' : '';
        return `
            <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; cursor: pointer;">
                <input type="checkbox" class="fs-prod-checkbox" value="${escapeHtml(p.id)}" ${isChecked} style="width: 18px; height: 18px; accent-color: #ec4899;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.name)}</div>
                    <div style="font-size: 11px; color: #ec4899; font-weight: bold;">${p.price || 0}৳</div>
                </div>
            </label>
        `;
    }).join('');
}

async function saveFlashSaleAdminSettings() {
    try {
        const toggle = document.getElementById('fsEnabledToggle');
        const tag = document.getElementById('fsBannerTag');
        const disc = document.getElementById('fsDiscountPercent');
        const title = document.getElementById('fsTitle');
        const sub = document.getElementById('fsSubtitle');
        const endInput = document.getElementById('fsEndTimeInput');

        const checkboxes = document.querySelectorAll('.fs-prod-checkbox:checked');
        const product_ids = Array.from(checkboxes).map(cb => cb.value);

        let end_time = null;
        if (endInput && endInput.value) {
            end_time = new Date(endInput.value).toISOString();
        }

        const payload = {
            enabled: toggle ? toggle.checked : true,
            banner_tag: tag ? tag.value.trim() : 'UP TO 50% OFF',
            discount_percent: disc ? parseInt(disc.value) || 25 : 25,
            title: title ? title.value.trim() : '⚡ MIDNIGHT CYBER FLASH SALE',
            subtitle: sub ? sub.value.trim() : '',
            end_time,
            product_ids
        };

        const res = await fetch('/api/admin/flash-sale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Flash Sale settings saved successfully!');
            loadFlashSaleAdminSettings();
        } else {
            alert('❌ Failed to save: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error saving flash sale:', err);
        alert('❌ Error saving flash sale: ' + err.message);
    }
}

// ============================================================
// GIFT CARDS ADMIN LOGIC
// ============================================================
async function loadGiftCardsAdminList() {
    const tbody = document.getElementById('giftCardsTableBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">Loading vouchers...</td></tr>';
        const res = await fetch('/api/admin/gift-cards');
        const data = await res.json();
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load vouchers.</td></tr>';
            return;
        }

        const cards = data.giftCards || [];
        if (cards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No gift cards found. Generate your first code above!</td></tr>';
            return;
        }

        tbody.innerHTML = cards.map(c => {
            const isFull = (c.used_count || 0) >= (c.max_uses || 1);
            const statusBadge = isFull 
                ? '<span style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">Exhausted</span>'
                : '<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">Active</span>';

            const createdDate = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : 'N/A';

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px; font-family: monospace; font-size: 13px; font-weight: 800; color: #38bdf8;">
                        ${escapeHtml(c.code)}
                    </td>
                    <td style="padding: 12px; font-weight: 800; color: #10b981;">
                        ${c.amount}৳
                    </td>
                    <td style="padding: 12px; font-size: 12px; color: #e2e8f0;">
                        ${c.used_count || 0} / ${c.max_uses || 1}
                    </td>
                    <td style="padding: 12px;">
                        ${statusBadge}
                    </td>
                    <td style="padding: 12px; font-size: 12px; color: #94a3b8;">
                        ${createdDate}
                    </td>
                    <td style="padding: 12px; text-align: right;">
                        <button type="button" onclick="deleteGiftCardAdmin('${escapeHtml(c.id)}')" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading gift cards:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Error loading vouchers.</td></tr>';
    }
}

async function createGiftCardAdmin() {
    try {
        const codeInput = document.getElementById('gcCodeInput');
        const amountInput = document.getElementById('gcAmountInput');
        const maxUsesInput = document.getElementById('gcMaxUsesInput');

        const amount = Number(amountInput ? amountInput.value : 0);
        if (!amount || amount <= 0) {
            alert('Please enter a valid reward amount.');
            return;
        }

        const payload = {
            code: codeInput ? codeInput.value.trim() : '',
            amount: amount,
            max_uses: maxUsesInput ? parseInt(maxUsesInput.value) || 1 : 1
        };

        const res = await fetch('/api/admin/gift-cards/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Gift card created successfully: ' + (data.giftCard ? data.giftCard.code : ''));
            if (codeInput) codeInput.value = '';
            loadGiftCardsAdminList();
        } else {
            alert('❌ Failed: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error creating gift card:', err);
        alert('❌ Error creating gift card: ' + err.message);
    }
}

async function deleteGiftCardAdmin(id) {
    if (!confirm('Are you sure you want to delete this gift card?')) return;
    try {
        const res = await fetch('/api/admin/gift-cards/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            loadGiftCardsAdminList();
        } else {
            alert('❌ Failed to delete: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error deleting gift card:', err);
        alert('❌ Error deleting gift card: ' + err.message);
    }
}
window.deleteGiftCardAdmin = deleteGiftCardAdmin;

// Setup Flash Sale and Gift Card Listeners
document.addEventListener('DOMContentLoaded', () => {
    const btnSaveFs = document.getElementById('btnSaveFlashSale');
    if (btnSaveFs) {
        btnSaveFs.addEventListener('click', saveFlashSaleAdminSettings);
    }

    const fsToggle = document.getElementById('fsEnabledToggle');
    const fsLabel = document.getElementById('fsEnabledLabel');
    if (fsToggle && fsLabel) {
        fsToggle.addEventListener('change', () => {
            fsLabel.textContent = fsToggle.checked ? 'Active on Storefront' : 'Disabled';
        });
    }

    const btnCreateGc = document.getElementById('btnCreateGiftCard');
    if (btnCreateGc) {
        btnCreateGc.addEventListener('click', createGiftCardAdmin);
    }

    const btnReloadGc = document.getElementById('btnReloadGiftCards');
    if (btnReloadGc) {
        btnReloadGc.addEventListener('click', loadGiftCardsAdminList);
    }

    const btnSaveLb = document.getElementById('btnSaveLeaderboardSettings');
    if (btnSaveLb) {
        btnSaveLb.addEventListener('click', saveLeaderboardAdminSettings);
    }

    const lbToggle = document.getElementById('lbEnabledToggle');
    const lbLabel = document.getElementById('lbEnabledLabel');
    if (lbToggle && lbLabel) {
        lbToggle.addEventListener('change', () => {
            lbLabel.textContent = lbToggle.checked ? 'System Active' : 'System Disabled';
        });
    }

    const btnReloadLb = document.getElementById('btnReloadAdminLeaderboard');
    if (btnReloadLb) {
        btnReloadLb.addEventListener('click', loadAdminLeaderboardRanking);
    }
});

// ============================================================
// LEADERBOARD ADMIN LOGIC
// ============================================================
async function loadLeaderboardAdminSettings() {
    try {
        const res = await fetch('/api/admin/leaderboard/settings');
        const data = await res.json();
        if (!data.success) return;

        const s = data.settings || {};
        const toggle = document.getElementById('lbEnabledToggle');
        const label = document.getElementById('lbEnabledLabel');
        const title = document.getElementById('lbTitleInput');
        const sub = document.getElementById('lbSubtitleInput');
        const note = document.getElementById('lbCustomNoteInput');
        const r1 = document.getElementById('lbRank1Input');
        const r2 = document.getElementById('lbRank2Input');
        const r3 = document.getElementById('lbRank3Input');
        const ro = document.getElementById('lbRankOtherInput');

        if (toggle) {
            toggle.checked = s.enabled !== false;
            if (label) label.textContent = toggle.checked ? 'System Active' : 'System Disabled';
        }
        if (title) title.value = s.title || '🏆 TOP SPENDERS LEADERBOARD';
        if (sub) sub.value = s.subtitle || 'চলতি মাসের সেরা ১০ ক্রেতা! প্রতি মাসের শেষে শীর্ষ ৩ জনকে আকর্ষণীয় ক্যাশ বোনাস ও রিওয়ার্ড দেওয়া হয়।';
        if (note) note.value = s.custom_note || 'প্রতি মাসের ১ তারিখে স্বয়ংক্রিয়ভাবে রিওয়ার্ড প্রদান করা হয়।';
        if (r1) r1.value = s.rank1_reward || '500৳ বোনাস + VIP Pass';
        if (r2) r2.value = s.rank2_reward || '250৳ বোনাস + 10x Spin';
        if (r3) r3.value = s.rank3_reward || '100৳ বোনাস + 5x Spin';
        if (ro) ro.value = s.rank_other_reward || '50৳ ভাউচার কোড';

        loadAdminLeaderboardRanking();
    } catch (err) {
        console.error('Error loading leaderboard settings:', err);
    }
}

async function loadAdminLeaderboardRanking() {
    const tbody = document.getElementById('adminLeaderboardTableBody');
    const monthEl = document.getElementById('adminLbMonth');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Loading live ranking...</td></tr>';
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load leaderboard ranking.</td></tr>';
            return;
        }

        if (monthEl && data.month) monthEl.textContent = data.month;
        const list = data.leaderboard || [];
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No spenders recorded yet for this month.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(u => {
            let rankBadge = `#${u.rank}`;
            if (u.rank === 1) rankBadge = '👑 1st (Gold)';
            else if (u.rank === 2) rankBadge = '🥈 2nd (Silver)';
            else if (u.rank === 3) rankBadge = '🥉 3rd (Bronze)';

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px; font-weight: 800; color: ${u.rank === 1 ? '#fbbf24' : (u.rank === 2 ? '#cbd5e1' : (u.rank === 3 ? '#d97706' : '#38bdf8'))};">
                        ${rankBadge}
                    </td>
                    <td style="padding: 12px; font-weight: 700; color: #fff;">
                        ${escapeHtml(u.name)} ${u.is_vip ? '<span style="color: #fbbf24; font-size: 11px;">👑 VIP</span>' : ''}
                    </td>
                    <td style="padding: 12px; text-align: right; color: #94a3b8; font-family: monospace;">
                        ${u.orders_count || 1}
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: 900; color: #00f0ff;">
                        ${u.total_spent}৳
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: 800; color: #10b981;">
                        ${escapeHtml(u.prize || '')}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading admin leaderboard ranking:', err);
    }
}

async function saveLeaderboardAdminSettings() {
    try {
        const toggle = document.getElementById('lbEnabledToggle');
        const title = document.getElementById('lbTitleInput');
        const sub = document.getElementById('lbSubtitleInput');
        const note = document.getElementById('lbCustomNoteInput');
        const r1 = document.getElementById('lbRank1Input');
        const r2 = document.getElementById('lbRank2Input');
        const r3 = document.getElementById('lbRank3Input');
        const ro = document.getElementById('lbRankOtherInput');

        const payload = {
            enabled: toggle ? toggle.checked : true,
            title: title ? title.value.trim() : '🏆 TOP SPENDERS LEADERBOARD',
            subtitle: sub ? sub.value.trim() : '',
            custom_note: note ? note.value.trim() : '',
            rank1_reward: r1 ? r1.value.trim() : '500৳ বোনাস + VIP Pass',
            rank2_reward: r2 ? r2.value.trim() : '250৳ বোনাস + 10x Spin',
            rank3_reward: r3 ? r3.value.trim() : '100৳ বোনাস + 5x Spin',
            rank_other_reward: ro ? ro.value.trim() : '50৳ ভাউচার কোড'
        };

        const res = await fetch('/api/admin/leaderboard/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Leaderboard prize settings saved successfully!');
            loadLeaderboardAdminSettings();
        } else {
            alert('❌ Failed to save: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error saving leaderboard settings:', err);
        alert('❌ Error saving: ' + err.message);
    }
}

