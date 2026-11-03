// server.js - Panel Sell Platform Engine
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Auto-load .env file if present
if (fs.existsSync(path.join(__dirname, '.env'))) {
    try {
        const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx > 0) {
                    const key = trimmed.substring(0, eqIdx).trim();
                    const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                    if (!process.env[key]) process.env[key] = val;
                }
            }
        });
    } catch (e) {}
}

const multer = require('multer');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SLIDERS_FILE = path.join(DATA_DIR, 'sliders.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');
const FF_ACCOUNTS_FILE = path.join(DATA_DIR, 'ff_accounts.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');
const WALLET_REQUESTS_FILE = path.join(DATA_DIR, 'wallet_requests.json');
const HWID_RESETS_FILE = path.join(DATA_DIR, 'hwid_resets.json');
const SPIN_SETTINGS_FILE = path.join(DATA_DIR, 'spin_settings.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');
const REFERRAL_SETTINGS_FILE = path.join(DATA_DIR, 'referral_settings.json');
const PASSWORD_RESETS_FILE = path.join(DATA_DIR, 'password_resets.json');
const VIP_SETTINGS_FILE = path.join(DATA_DIR, 'vip_settings.json');
const MYSTERY_SETTINGS_FILE = path.join(DATA_DIR, 'mystery_settings.json');
const GIFT_CARDS_FILE = path.join(DATA_DIR, 'gift_cards.json');
const FLASH_SALE_FILE = path.join(DATA_DIR, 'flash_sale.json');
const LEADERBOARD_SETTINGS_FILE = path.join(DATA_DIR, 'leaderboard_settings.json');

// Multer Storage Configuration for Product Images
const productUploadDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}

const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, (cleanName ? cleanName.substring(0, 20) + '-' : 'prod-') + unique + ext);
    }
});

const uploadProductImage = multer({
    storage: productStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Multer Storage Configuration for User Profile Avatars
const avatarUploadDir = path.join(__dirname, 'public', 'uploads', 'avatar');
if (!fs.existsSync(avatarUploadDir)) {
    fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png';
        const userId = req.session && req.session.user ? req.session.user.id : 'user';
        const unique = 'avatar-' + userId + '-' + Date.now() + safeExt;
        cb(null, unique);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
        }
    }
});

// Robust WhatsApp Number & URL Normalizer
function getCleanWhatsApp(phone) {
    if (!phone) return { number: '01727400370', intl: '8801727400370', url: 'https://wa.me/8801727400370' };
    const raw = String(phone).trim();
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return { number: '01727400370', intl: '8801727400370', url: 'https://wa.me/8801727400370' };
    
    let localNum = digits;
    let intlNum = digits;
    if (digits.startsWith('880')) {
        localNum = '0' + digits.slice(3);
        intlNum = digits;
    } else if (digits.startsWith('88') && digits.length >= 12) {
        localNum = digits.slice(2);
        intlNum = digits;
    } else if (digits.startsWith('0')) {
        localNum = digits;
        intlNum = '88' + digits;
    } else if (digits.length === 10 && digits.startsWith('1')) {
        localNum = '0' + digits;
        intlNum = '880' + digits;
    }
    return { number: localNum, intl: intlNum, url: `https://wa.me/${intlNum}` };
}

// Automated Email Notification System
async function sendOrderNotificationEmail(order, settings) {
    const adminEmail = settings.admin_email || process.env.ADMIN_NOTIFICATION_EMAIL || 'tgsgaming2024@gmail.com';
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPass = settings.smtp_pass || process.env.SMTP_PASS;
    const smtpHost = settings.smtp_host || 'smtp.gmail.com';
    const smtpPort = parseInt(settings.smtp_port) || 465;
    const smtpSecure = settings.smtp_secure !== false;

    console.log(`[ORDER EMAIL] Preparing automated Gmail notification for Order ${order.id} to ${adminEmail}...`);

    if (!smtpUser || !smtpPass) {
        console.log(`[ORDER EMAIL NOTICE] Gmail SMTP (App Password) not yet configured in Site Settings.`);
        console.log(`[ORDER DETAILS LOGGED] ID: ${order.id} | Product: ${order.product_name} (${order.variant}) | Amount: ${order.price}৳ | Gateway: ${order.payment_method} | TrxID: ${order.transaction_id} | Phone/WA: ${order.whatsapp} | UID: ${order.player_id}`);
        return { success: false, message: 'SMTP credentials not configured. Please set Gmail App Password in Admin Settings.' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser.trim(),
                pass: String(smtpPass).trim().replace(/\s+/g, '')
            }
        });

        const subject = `🛒 New Order Received: ${order.id} - ${order.product_name} (${order.price}৳)`;

        let deviceSpecsHtml = '';
        if (order.phone_model) {
            deviceSpecsHtml = `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Device To Root</td>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #00f0ff; font-weight: 700;">${order.phone_brand || ''} ${order.phone_model}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Android OS / Bootloader</td>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">${order.android_version || 'Android'} • Bootloader: ${order.bootloader_status || 'Unlocked'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Preferred Root Solution</td>
                <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">${order.root_solution || 'KernelSU'}</td>
            </tr>`;
        }

        const custWa = getCleanWhatsApp(order.whatsapp);

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>New Order Notification - PANEL SELL</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; color: #ffffff; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0b1224; border: 1.5px solid #00f0ff; border-radius: 16px; overflow: hidden; box-shadow: 0 0 30px rgba(0, 240, 255, 0.25);">
                <div style="background: linear-gradient(135deg, #001f3f 0%, #00f0ff 100%); padding: 25px; text-align: center;">
                    <h1 style="margin: 0; color: #050811; font-size: 24px; font-weight: 900; letter-spacing: 1.5px;">PANEL SELL STORE</h1>
                    <p style="margin: 5px 0 0 0; color: #050811; font-size: 14px; font-weight: bold;">⚡ New Product Purchase Notification</p>
                </div>
                
                <div style="padding: 25px;">
                    <div style="background-color: #111c38; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: center; border: 1px solid rgba(0, 240, 255, 0.3);">
                        <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Order Reference ID</span>
                        <h2 style="margin: 5px 0; color: #00f0ff; font-size: 26px; font-weight: 900; letter-spacing: 2px;">${order.id}</h2>
                        <span style="display: inline-block; background-color: #f59e0b; color: #000; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 10px; text-transform: uppercase;">AWAITING PAYMENT VERIFICATION</span>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Product Name</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: bold;">${order.product_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Package / Variant</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: bold;">${order.variant}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Total Amount Paid</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #10b981; font-size: 18px; font-weight: 900;">${order.price}৳</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Payment Gateway</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #ec4899; font-weight: bold;">${order.payment_method}</td>
                        </tr>
                        <tr style="background-color: rgba(0, 240, 255, 0.08);">
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #f43f5e; font-weight: 800;">Transaction ID (TrxID)</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #fbbf24; font-family: monospace; font-size: 16px; font-weight: 900; letter-spacing: 1px;">${order.transaction_id}</td>
                        </tr>
                        ${order.license_key ? `
                        <tr style="background-color: rgba(0, 240, 255, 0.15);">
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #00f0ff; font-weight: 800;">Assigned License Key</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #00f0ff; font-family: monospace; font-size: 16px; font-weight: 900; letter-spacing: 1.5px;">${order.license_key}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">In-Game Player UID</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #ffffff; font-family: monospace;">${order.player_id || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600;">Customer WhatsApp</td>
                            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #22c55e; font-weight: bold;">
                                <a href="https://wa.me/${custWa.intl}" style="color: #22c55e; text-decoration: none;">
                                    ${order.whatsapp} 💬 (Tap to Chat)
                                </a>
                            </td>
                        </tr>
                        ${deviceSpecsHtml}
                        <tr>
                            <td style="padding: 10px; color: #94a3b8; font-weight: 600;">Order Timestamp</td>
                            <td style="padding: 10px; color: #94a3b8;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 25px; text-align: center;">
                        <a href="https://wa.me/${custWa.intl}?text=${encodeURIComponent('Hello! We received your payment for order ' + order.id + ' (' + order.product_name + '). Here is your activation key/file:')}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 10px; font-weight: bold; font-size: 14px;">
                            <i class="fab fa-whatsapp"></i> Instant Chat with Customer on WhatsApp
                        </a>
                    </div>
                </div>

                <div style="background-color: #080d1a; padding: 15px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
                    Sent automatically by PANEL SELL e-Commerce Notification System.
                </div>
            </div>
        </body>
        </html>
        `;

        const info = await transporter.sendMail({
            from: `"PANEL SELL Orders" <${smtpUser}>`,
            to: adminEmail,
            subject: subject,
            html: html
        });

        console.log(`[ORDER EMAIL SUCCESS] Sent to ${adminEmail}, MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[ORDER EMAIL ERROR]`, err.message);
        return { success: false, error: err.message };
    }
}

// Password Reset OTP Email Dispatcher
async function sendPasswordResetOtpEmail(userEmail, userName, otpCode, settings) {
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPass = settings.smtp_pass || process.env.SMTP_PASS;
    const smtpHost = settings.smtp_host || 'smtp.gmail.com';
    const smtpPort = parseInt(settings.smtp_port) || 465;
    const smtpSecure = settings.smtp_secure !== false;

    if (!smtpUser || !smtpPass) {
        console.error('[OTP EMAIL ERROR] SMTP not configured in settings.');
        return { success: false, message: 'SMTP credentials not configured in settings.' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser.trim(),
                pass: String(smtpPass).trim().replace(/\s+/g, '')
            }
        });

        const siteName = settings.site_name || 'ZERO EXCEPTION';
        const subject = `🔐 Password Reset Code: ${otpCode} - ${siteName}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }
                .card { max-width: 500px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 14px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .logo { font-size: 22px; font-weight: 800; color: #00f0ff; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px; text-align: center; }
                .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center; }
                .text { font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: center; margin-bottom: 20px; }
                .otp-box { background: linear-gradient(135deg, rgba(0,240,255,0.08), rgba(255,0,128,0.08)); border: 2px dashed #00f0ff; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
                .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px; font-weight: 700; }
                .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #00f0ff; font-family: 'Courier New', Courier, monospace; }
                .expiry { font-size: 12px; color: #f59e0b; margin-top: 10px; font-weight: 600; }
                .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 26px; border-top: 1px solid #1e293b; padding-top: 16px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">${siteName}</div>
                <div class="title">Password Reset Verification</div>
                <div class="text">Hello <strong>${userName || 'User'}</strong>,<br>We received a request to reset your account password. Use the single-use code below to proceed:</div>
                <div class="otp-box">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otpCode}</div>
                    <div class="expiry">⏱️ This code will expire in 10 minutes</div>
                </div>
                <div class="text" style="font-size: 13px; color: #64748b;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</div>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        `;

        const info = await transporter.sendMail({
            from: `"${siteName} Security" <${smtpUser}>`,
            to: userEmail,
            subject: subject,
            html: html
        });

        console.log(`[OTP EMAIL SUCCESS] Sent to ${userEmail}, MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[OTP EMAIL ERROR]`, err.message);
        return { success: false, error: err.message };
    }
}

// =========================================================================
// DISCORD BOT NOTIFICATION SUITE
// STRICT RULE: All notifications are HARD-LOCKED to Channel: 1566503959336718367
// Under NO circumstances can any message be delivered to any other channel!
// =========================================================================
const LOCKED_DISCORD_CHANNEL_ID = '1566503959336718367';
const DEFAULT_DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

async function sendDiscordNotification(payload) {
    try {
        const settings = readJson(SETTINGS_FILE, {});
        const token = (settings.discord_bot_token || process.env.DISCORD_BOT_TOKEN || DEFAULT_DISCORD_BOT_TOKEN).trim();
        // MANDATORY ENFORCEMENT: Strictly lock channel ID to 1566503959336718367
        const channelId = LOCKED_DISCORD_CHANNEL_ID;

        if (!token) {
            console.log('[DISCORD] Skipped: Bot token not configured.');
            return { success: false, message: 'Bot token missing' };
        }

        const endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;
        
        let bodyData = {};
        if (typeof payload === 'string') {
            bodyData = { content: payload };
        } else if (payload.embeds) {
            bodyData = payload;
        } else {
            bodyData = {
                embeds: [{
                    title: payload.title || '🔔 ZERO EXCEPTION STORE ALERT',
                    description: payload.description || '',
                    color: payload.color || 0x00f0ff,
                    fields: payload.fields || [],
                    footer: { text: payload.footerText || `Channel locked to #${LOCKED_DISCORD_CHANNEL_ID} • Zero Exception` },
                    timestamp: new Date().toISOString()
                }]
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`[DISCORD ERROR] HTTP ${response.status}:`, data);
            return { success: false, error: data };
        }
        console.log(`[DISCORD SUCCESS] Delivered to channel ${channelId} (msg: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (err) {
        console.error('[DISCORD EXCEPTION]', err.message);
        return { success: false, error: err.message };
    }
}

// Event-specific Discord Alert Helpers
async function sendDiscordOrderAlert(order) {
    const isInstant = !!order.license_key;
    const isWallet = order.payment_method === 'Wallet Balance';
    const fields = [
        { name: '📦 Product & Package', value: `**${order.product_name}**\nVariant: \`${order.variant}\``, inline: true },
        { name: '💰 Total Price', value: `**${order.price}৳**`, inline: true },
        { name: '💳 Gateway & TrxID', value: `Method: **${order.payment_method}**\nTrxID: \`${order.transaction_id || 'N/A'}\``, inline: false },
        { name: '👤 Customer Info', value: `Name: **${order.user_name || 'Customer'}**\nEmail: \`${order.user_email || 'Guest'}\`\nWhatsApp: **${order.whatsapp || 'N/A'}**`, inline: false }
    ];

    if (order.player_id && order.player_id !== 'N/A') {
        fields.push({ name: '🎮 Player ID / UID', value: `\`${order.player_id}\``, inline: true });
    }

    if (isInstant) {
        fields.push({ name: '🔑 Instant License Key', value: `\`\`\`${order.license_key}\`\`\``, inline: false });
        fields.push({ name: '⚡ Status', value: '✅ **Auto-Delivered (Instant)**', inline: true });
    } else {
        fields.push({ name: '⏳ Status', value: isWallet ? '🔄 **Processing (Wallet)**' : '⚠️ **Awaiting Manual Payment Verification**', inline: true });
    }

    return sendDiscordNotification({
        title: `🛒 NEW ORDER PLACED • #${order.id}`,
        description: `Customer placed an order for **${order.product_name}**.`,
        color: isInstant ? 0x10b981 : 0x00f0ff,
        fields: fields
    });
}

async function sendDiscordWalletAlert(reqObj) {
    return sendDiscordNotification({
        title: `💳 NEW WALLET ADD FUND REQUEST • #${reqObj.id}`,
        description: `A member submitted a deposit request to add funds into their wallet.`,
        color: 0x38bdf8,
        fields: [
            { name: '👤 Member', value: `**${reqObj.user_name}**\nEmail: \`${reqObj.user_email}\``, inline: true },
            { name: '💵 Amount', value: `**+${reqObj.amount}৳**`, inline: true },
            { name: '📱 Gateway & Phone', value: `Gateway: **${reqObj.payment_method}**\nSender Phone: \`${reqObj.sender_phone || 'N/A'}\``, inline: false },
            { name: '🔖 TrxID', value: `\`${reqObj.transaction_id}\``, inline: true },
            { name: '⏳ Status', value: '🟡 **Pending Admin Approval**', inline: true }
        ]
    });
}

async function sendDiscordWalletApprovalAlert(reqObj, isRevert = false) {
    const isDeduct = isRevert;
    return sendDiscordNotification({
        title: isDeduct ? `↩️ WALLET BALANCE REVERTED / DEDUCTED • #${reqObj.id}` : `✅ WALLET BALANCE APPROVED & ADDED • #${reqObj.id}`,
        description: isDeduct ? `Admin deducted / reverted funds for request **${reqObj.id}**.` : `Admin approved and credited wallet funds for **${reqObj.id}**.`,
        color: isDeduct ? 0xef4444 : 0x10b981,
        fields: [
            { name: '👤 User', value: `**${reqObj.user_name}** (${reqObj.user_email})`, inline: true },
            { name: '💵 Amount', value: `**${isDeduct ? '-' : '+'}${reqObj.amount}৳**`, inline: true },
            { name: '🔖 TrxID', value: `\`${reqObj.transaction_id}\``, inline: true }
        ]
    });
}

async function sendDiscordHwidAlert(hwidObj) {
    return sendDiscordNotification({
        title: `🔒 NEW HWID / DEVICE RESET REQUEST • #${hwidObj.id}`,
        description: `A customer requested to unlock/reset the device lock for their license key.`,
        color: 0xf59e0b,
        fields: [
            { name: '👤 Customer', value: `**${hwidObj.user_name}**\nEmail: \`${hwidObj.user_email || 'N/A'}\`\nPhone: \`${hwidObj.user_phone || 'N/A'}\``, inline: true },
            { name: '📦 Product & Order', value: `Product: **${hwidObj.product_name}**\nOrder Ref: \`${hwidObj.order_id}\``, inline: true },
            { name: '🔑 License Key', value: `\`\`\`${hwidObj.license_key}\`\`\``, inline: false },
            { name: '❓ Reason & Device', value: `Reason: **${hwidObj.reason}**\nDevice: \`${hwidObj.device_model || 'N/A'}\``, inline: false },
            { name: '🛡️ Policy', value: '⚠️ **Strict 1-Time Reset Rule applies.**', inline: true }
        ]
    });
}

async function sendDiscordHwidApprovedAlert(hwidObj) {
    return sendDiscordNotification({
        title: `🔓 HWID RESET APPROVED • #${hwidObj.id}`,
        description: `Device lock for license key has been successfully unlocked!`,
        color: 0x10b981,
        fields: [
            { name: '🔑 License Key', value: `\`\`\`${hwidObj.license_key}\`\`\``, inline: false },
            { name: '📦 Order Ref', value: `\`${hwidObj.order_id}\``, inline: true },
            { name: '👤 Customer', value: `**${hwidObj.user_name}**`, inline: true },
            { name: '⚡ HWID Status', value: '✅ **Unlocked / Device Unbound (1/1 Used)**', inline: false }
        ]
    });
}

// File I/O Helpers
function readJson(filePath, defaultVal = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return defaultVal;
    }
}

function writeJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err);
        return false;
    }
}

// =========================================================================
// FEATURE 7: ANTI-FRAUD & DUMMY/DUPLICATE TRXID DETECTOR
// =========================================================================
function validateTransactionAntiFraud(trxId, currentUser, req) {
    if (!trxId || typeof trxId !== 'string') {
        return { valid: false, reason: 'Transaction ID is required.' };
    }

    const cleanTrx = trxId.trim();

    // 1. Check if user is already locked/flagged for fraud
    if (currentUser) {
        const users = readJson(USERS_FILE, []);
        const u = users.find(x => String(x.id) === String(currentUser.id) || x.email === currentUser.email);
        if (u && u.fraud_blocked) {
            return {
                valid: false,
                blocked: true,
                reason: '⚠️ আপনার একাউন্টটি বারবার ভুয়া বা ডুপ্লিকেট TrxID সাবমিট করার চেষ্টার কারণে ফ্রড প্রটেকশনে সাময়িকভাবে লক করা হয়েছে। দয়া করে এডমিন সাপোর্টে যোগাযোগ করুন।'
            };
        }
    }

    // 2. Minimum length check (TrxIDs in bKash/Nagad/Rocket are typically 8-12 characters, minimum 6)
    if (cleanTrx.length < 6) {
        return { valid: false, reason: 'অকার্যকর Transaction ID! TrxID সর্বনিম্ন ৬ অক্ষরের হতে হবে।' };
    }

    // 3. Known dummy / sequential / invalid patterns
    const dummyPatterns = [
        /^0+$/, /^1+$/, /^2+$/, /^3+$/, /^4+$/, /^5+$/, /^6+$/, /^7+$/, /^8+$/, /^9+$/,
        /^(123456|1234567|12345678|123456789|1234567890)$/i,
        /^(test|testing|fake|demo|asdf|qwerty|trxid|none|null|nil|0000|admin|na|n\/a)$/i
    ];
    for (const pat of dummyPatterns) {
        if (pat.test(cleanTrx)) {
            recordFraudAttempt(currentUser, cleanTrx, 'Dummy/Fake pattern: ' + cleanTrx, req);
            return { valid: false, reason: 'অকার্যকর বা ফেক TrxID প্যাটার্ন শনাক্ত হয়েছে! সঠিক ব্যাংক/মোবাইল ব্যাংকিং TrxID প্রদান করুন।' };
        }
    }

    // 4. Duplicate Check across Orders and Wallet Requests
    const orders = readJson(ORDERS_FILE, []);
    const walletReqs = readJson(WALLET_REQUESTS_FILE, []);

    // Check orders (exclude wallet orders which have synthetic WALLET-... TrxIDs)
    const duplicateOrder = orders.find(o => 
        o.transaction_id && 
        o.payment_method !== 'Wallet Balance' && 
        !String(o.transaction_id).startsWith('WALLET-') &&
        String(o.transaction_id).toLowerCase().trim() === cleanTrx.toLowerCase()
    );

    // Check wallet requests (exclude DIR-... which are admin direct credits)
    const duplicateWallet = walletReqs.find(w => 
        w.transaction_id && 
        !String(w.transaction_id).startsWith('DIR-') &&
        !String(w.transaction_id).startsWith('SPIN-') &&
        String(w.transaction_id).toLowerCase().trim() === cleanTrx.toLowerCase()
    );

    if (duplicateOrder || duplicateWallet) {
        const conflictRef = duplicateOrder ? `Order #${duplicateOrder.id}` : `Deposit #${duplicateWallet.id}`;
        recordFraudAttempt(currentUser, cleanTrx, `Duplicate TrxID already used in ${conflictRef}`, req);
        return {
            valid: false,
            duplicate: true,
            reason: `এই Transaction ID (${cleanTrx}) টি ইতিমধ্যে ব্যবহার করা হয়েছে (${conflictRef})! ডুপ্লিকেট বা কপি করা TrxID ব্যবহার সম্পূর্ণ নিষিদ্ধ।`
        };
    }

    return { valid: true, cleanTrx };
}

function recordFraudAttempt(currentUser, trxId, reason, req) {
    try {
        const users = readJson(USERS_FILE, []);
        let userRecord = null;
        if (currentUser) {
            userRecord = users.find(u => String(u.id) === String(currentUser.id) || u.email === currentUser.email);
        }

        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP') : 'Unknown IP';
        
        if (userRecord) {
            userRecord.fraud_attempts = (userRecord.fraud_attempts || 0) + 1;
            userRecord.last_fraud_attempt = new Date().toISOString();
            if (!userRecord.fraud_history) userRecord.fraud_history = [];
            userRecord.fraud_history.push({ trxId, reason, ip, time: new Date().toISOString() });

            // Auto-lock if 3 or more fraud attempts
            if (userRecord.fraud_attempts >= 3) {
                userRecord.fraud_blocked = true;
            }
            writeJson(USERS_FILE, users);
        }

        // Send High-Priority Discord Security Alert to locked channel 1566503959336718367
        sendDiscordNotification({
            title: '🚨 ANTI-FRAUD ALERT • SUSPICIOUS TRXID DETECTED',
            description: `A user attempted to submit an invalid, fake, or duplicate Transaction ID.`,
            color: 0xef4444, // Bright Red
            fields: [
                { name: '🔖 Offending TrxID', value: `\`${trxId}\``, inline: true },
                { name: '⚠️ Detection Reason', value: `**${reason}**`, inline: true },
                { name: '👤 User / Account', value: userRecord ? `**${userRecord.name || 'Member'}** (${userRecord.email})\nAttempts: **${userRecord.fraud_attempts}/3** ${userRecord.fraud_blocked ? '⛔ **AUTO-BLOCKED**' : '⚠️ Warning'}` : 'Guest User', inline: false },
                { name: '🌐 Client IP', value: `\`${ip}\``, inline: true }
            ],
            footerText: `Zero Exception Anti-Fraud Shield • Channel locked to #${LOCKED_DISCORD_CHANNEL_ID}`
        }).catch(e => console.error('[ANTI-FRAUD DISCORD ALERT ERROR]', e));
    } catch (err) {
        console.error('[ANTI-FRAUD ERROR]', err.message);
    }
}

// =========================================================================
// FEATURE 8: DAILY SPIN & WIN / LUCKY WHEEL ENGINE
// =========================================================================
function getSpinSettings() {
    const defaultSettings = {
        enabled: true,
        deposit_threshold: 500,
        spend_threshold: 500,
        title: "LUCKY SPIN & WIN REWARDS",
        subtitle: "প্রতি ৫০০৳ ডিপোজিট অথবা ৫০০৳ অর্ডারে পাবেন ১টি লাকি স্পিন!",
        segments: [
            { index: 0, label: 'Try Tomorrow', type: 'none', value: 0, weight: 8, color: '#475569' },
            { index: 1, label: '৳1 Balance', type: 'balance', value: 1, weight: 65, color: '#06b6d4' },
            { index: 2, label: 'Better Luck', type: 'none', value: 0, weight: 5, color: '#334155' },
            { index: 3, label: '2% Promo Code', type: 'coupon', value: 2, weight: 10, color: '#a855f7' },
            { index: 4, label: '৳2 Balance', type: 'balance', value: 2, weight: 6, color: '#00f0ff' },
            { index: 5, label: '5% VIP Promo', type: 'coupon', value: 5, weight: 2, color: '#f59e0b' },
            { index: 6, label: '৳5 Balance', type: 'balance', value: 5, weight: 3, color: '#10b981' },
            { index: 7, label: '৳10 Grand Prize', type: 'balance', value: 10, weight: 1, color: '#ec4899' }
        ]
    };
    const loaded = readJson(SPIN_SETTINGS_FILE, null);
    if (!loaded || !loaded.segments || !loaded.segments.length) {
        writeJson(SPIN_SETTINGS_FILE, defaultSettings);
        return defaultSettings;
    }
    return loaded;
}

function selectSpinReward(segments) {
    const list = segments && segments.length ? segments : getSpinSettings().segments;
    const totalWeight = list.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0);
    if (totalWeight <= 0) return list[0];
    let rand = Math.random() * totalWeight;
    for (const segment of list) {
        const w = parseFloat(segment.weight) || 0;
        if (rand < w) {
            return segment;
        }
        rand -= w;
    }
    return list[0];
}

// =========================================================================
// FEATURE 9: DISCORD REFER & EARN ENGINE (10 Refers -> 10৳ Wallet Reward)
// =========================================================================
function getReferralSettings() {
    const defaultSettings = {
        enabled: true,
        target_count: 10,
        reward_amount: 10,
        discord_invite_url: "https://discord.gg/your-server",
        title: "DISCORD REFER & EARN",
        description: "প্রতি ১০ জন ফ্রেন্ডকে ডিসকর্ড সার্ভারে রেফার করলেই সাথে সাথে ১০৳ ওয়ালেটে পেয়ে যাবেন!"
    };
    const loaded = readJson(REFERRAL_SETTINGS_FILE, null);
    if (!loaded) {
        writeJson(REFERRAL_SETTINGS_FILE, defaultSettings);
        return defaultSettings;
    }
    return loaded;
}

function awardReferralCredit(refCodeOrId, referredUser, source = 'web') {
    try {
        const refCfg = getReferralSettings();
        if (!refCfg.enabled) return { success: false, reason: 'Referrals disabled' };
        if (!refCodeOrId || !referredUser) return { success: false, reason: 'Invalid parameters' };

        const users = readJson(USERS_FILE, []);
        const cleanRef = String(refCodeOrId).trim().replace(/^REF-?/i, '');

        // Find referrer by ID or referral_code or email
        const referrerIdx = users.findIndex(u => 
            String(u.id) === cleanRef || 
            String(u.id) === String(refCodeOrId).trim() ||
            (u.referral_code && u.referral_code.toLowerCase() === String(refCodeOrId).trim().toLowerCase()) ||
            (u.email && u.email.toLowerCase() === String(refCodeOrId).trim().toLowerCase())
        );

        if (referrerIdx === -1) {
            return { success: false, reason: 'Referrer not found' };
        }

        const referrer = users[referrerIdx];

        // Self-referral prevention
        if (String(referrer.id) === String(referredUser.id) || 
            (referrer.email && referredUser.email && referrer.email.toLowerCase() === referredUser.email.toLowerCase())) {
            return { success: false, reason: 'Self-referral is not allowed' };
        }

        // Prevent duplicate referral of the same user
        const referrals = readJson(REFERRALS_FILE, []);
        const alreadyReferred = referrals.find(r => 
            (r.referred_user_id && String(r.referred_user_id) === String(referredUser.id)) ||
            (r.referred_user_email && referredUser.email && r.referred_user_email.toLowerCase() === referredUser.email.toLowerCase())
        );

        if (alreadyReferred) {
            return { success: false, reason: 'User has already been referred' };
        }

        // Increment current count and lifetime count
        referrer.referral_current = (parseInt(referrer.referral_current) || 0) + 1;
        referrer.referral_total = (parseInt(referrer.referral_total) || 0) + 1;

        const target = parseInt(refCfg.target_count) || 10;
        const reward = parseFloat(refCfg.reward_amount) || 10;
        let milestoneReached = false;

        // Check if milestone (10 referrals) is reached
        if (referrer.referral_current >= target) {
            milestoneReached = true;
            referrer.wallet_balance = (parseFloat(referrer.wallet_balance) || 0) + reward;
            referrer.referral_earnings = (parseFloat(referrer.referral_earnings) || 0) + reward;
            referrer.referral_current = 0; // RESET BACK TO 0/10 AS REQUESTED!

            // Log to wallet requests history
            const walletRequests = readJson(WALLET_REQUESTS_FILE, []);
            const rewardLog = {
                id: 'WLT-REF-' + Math.floor(10000 + Math.random() * 90000),
                user_id: referrer.id,
                user_name: referrer.name || 'Member',
                user_email: referrer.email,
                sender_phone: 'Discord Refer Engine',
                amount: reward,
                payment_method: 'Discord Referral Reward',
                transaction_id: 'REF10-' + Date.now().toString(36).toUpperCase(),
                reason: `Completed 10 Discord Referrals milestone! Rewarded ${reward}৳ to wallet.`,
                status: 'approved',
                created_at: new Date().toISOString(),
                approved_at: new Date().toISOString()
            };
            walletRequests.unshift(rewardLog);
            writeJson(WALLET_REQUESTS_FILE, walletRequests);

            // Send Discord Notification strictly to Locked Channel 1566503959336718367
            sendDiscordNotification({
                title: '🎉 10 REFERRALS COMPLETED • REWARD PAID!',
                description: `A member just successfully referred **10 friends** to the community!`,
                color: 0x5865F2,
                fields: [
                    { name: '👤 Lucky Member', value: `**${referrer.name || 'Member'}** (${referrer.email})`, inline: true },
                    { name: '🎁 Milestone Completed', value: `**10 / 10 Referrals**`, inline: true },
                    { name: '💰 Wallet Credited', value: `**+${reward}৳ BDT** (New Balance: ${referrer.wallet_balance}৳)`, inline: false },
                    { name: '🔄 Next Cycle', value: `Progress reset to **0/10** for the next ${reward}৳ reward!`, inline: false }
                ],
                footerText: `Discord Referral Engine • Channel locked to #${LOCKED_DISCORD_CHANNEL_ID}`
            }).catch(e => console.error('[REFERRAL DISCORD ALERT ERROR]', e));
        }

        // Save referral record
        const newRefLog = {
            id: 'REF-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
            referrer_id: referrer.id,
            referrer_name: referrer.name || 'Member',
            referrer_email: referrer.email,
            referred_user_id: referredUser.id,
            referred_user_name: referredUser.name || 'New Member',
            referred_user_email: referredUser.email || '',
            source: source,
            milestone_awarded: milestoneReached,
            created_at: new Date().toISOString()
        };
        referrals.unshift(newRefLog);
        writeJson(REFERRALS_FILE, referrals);

        users[referrerIdx] = referrer;
        writeJson(USERS_FILE, users);

        console.log(`[REFERRAL TRACKED] ${referrer.email} now has ${referrer.referral_current}/${target} refers. (Milestone: ${milestoneReached})`);
        return { success: true, current: referrer.referral_current, milestoneReached, total: referrer.referral_total };
    } catch(err) {
        console.error('[REFERRAL ERROR]', err);
        return { success: false, error: err.message };
    }
}

function getDefaultDurationOptions(product = {}) {
    const category = (product.category || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const isRootService = category.includes('root-service') || product.id === 25 || product.id === 26 ||
        (product.slug || '').toLowerCase().includes('root-service');
    const basePrice = Number(product.price) || 0;

    if (isRootService || (category.includes('root') && title.includes('root'))) {
        return [
            { label: 'Standard Device Rooting', price: Math.round(basePrice) },
            { label: 'Root + Gaming Kernel (120 FPS)', price: Math.round(basePrice * 1.35) },
            { label: 'VIP Root + Anti-Ban Suite', price: Math.round(basePrice * 1.75) }
        ];
    }

    return [
        { days: 1, label: '1 Day Key', price: Math.round(basePrice) },
        { days: 7, label: '7 Days Key', price: Math.round(basePrice * 3.5) },
        { days: 30, label: '30 Days Key', price: Math.round(basePrice * 10) }
    ];
}

function parseDurationOptions(rawValue, product = {}) {
    const fallback = getDefaultDurationOptions(product);
    const isRootService = fallback.some(option => !option.days);
    const basePrice = Number(product.price) || 0;
    let rawOptions = rawValue;
    if (typeof rawValue === 'string') {
        const trimmedValue = rawValue.trim();
        if (trimmedValue.startsWith('[')) {
            try {
                rawOptions = JSON.parse(trimmedValue);
            } catch (err) {
                console.error('Unable to parse saved duration options:', err);
            }
        }
    }

    const options = Array.isArray(rawOptions)
        ? rawOptions
        : (typeof rawOptions === 'string'
            ? rawOptions.split(/\r?\n/).filter(line => line.trim()).map(line => {
                const [first, second] = line.split('|').map(part => part.trim());
                if (!first || second === undefined) return null;

                if (isRootService) {
                    const legacyMultiplier = Number(second);
                    const isLegacyPlan = ['Standard Device Rooting', 'Root + Gaming Kernel (120 FPS)', 'VIP Root + Anti-Ban Suite'].includes(first);
                    return {
                        label: first,
                        price: isLegacyPlan && legacyMultiplier > 0 && legacyMultiplier <= 2
                            ? Math.round(basePrice * legacyMultiplier)
                            : Number(second)
                    };
                }

                const parsedDays = Number(first);
                if (Number.isInteger(parsedDays) && parsedDays > 0) {
                    return { days: parsedDays, price: Number(second) };
                }

                const legacyDays = first.match(/^(\d+)\s+days?\s+key$/i);
                if (legacyDays) {
                    const legacyMultiplier = Number(second);
                    const knownLegacyMultipliers = { 1: 1, 7: 3.5, 30: 10 };
                    const days = Number(legacyDays[1]);
                    return {
                        days,
                        price: knownLegacyMultipliers[days] === legacyMultiplier
                            ? Math.round(basePrice * legacyMultiplier)
                            : legacyMultiplier
                    };
                }

                return null;
            }).filter(Boolean)
            : []);

    const parsed = options.map(option => {
        if (!option || typeof option !== 'object') return null;
        const multiplier = Number(option.multiplier);
        const priceValue = option.price !== undefined
            ? Number(option.price)
            : (Number.isFinite(multiplier) && multiplier > 0 ? basePrice * multiplier : NaN);
        if (!Number.isFinite(priceValue) || priceValue < 0) return null;

        if (isRootService) {
            const label = String(option.label || option.name || '').trim();
            return label ? { label, price: Math.round(priceValue) } : null;
        }

        const labelDaysMatch = String(option.label || '').match(/^(\d+)\s+days?\s+key$/i);
        const days = Number(option.days || (labelDaysMatch && labelDaysMatch[1]));
        if (!Number.isInteger(days) || days < 1) return null;

        return {
            days,
            label: `${days} ${days === 1 ? 'Day' : 'Days'} Key`,
            price: Math.round(priceValue)
        };
    }).filter(Boolean);

    return parsed.length ? parsed : fallback;
}

function serializeDurationOptions(value) {
    return JSON.stringify(value);
}

function hydrateProduct(product) {
    if (!product) return product;
    return {
        ...product,
        duration_options: parseDurationOptions(product.duration_options, product)
    };
}

// Ensure Admin Account Exists with Exact Credentials
function ensureAdminAccount() {
    const users = readJson(USERS_FILE, []);
    const adminEmail = 'tgsgaming2024@gmail.com';
    const adminPass = 'Toqy+thamid2026';

    const existingAdmin = users.find(u => (u.email || '').toLowerCase() === adminEmail);
    if (!existingAdmin) {
        users.unshift({
            id: 1,
            email: adminEmail,
            password: adminPass,
            name: 'Super Admin',
            role: 'admin',
            created_at: new Date().toISOString()
        });
        writeJson(USERS_FILE, users);
        console.log('Seeded default admin account into users.json');
    } else if (existingAdmin.password !== adminPass || existingAdmin.role !== 'admin') {
        existingAdmin.password = adminPass;
        existingAdmin.role = 'admin';
        writeJson(USERS_FILE, users);
        console.log('Updated admin account credentials in users.json');
    }
}
ensureAdminAccount();

// Middleware setup
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/topup/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/topup/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use(session({
    secret: 'panelsell-secret-session-key-2026',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // works seamlessly on http localhost
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Initialize Passport for Google OAuth
app.use(passport.initialize());
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global template helpers
app.use((req, res, next) => {
    const settings = readJson(SETTINGS_FILE, {});
    const currencyRates = settings.currency_rates || {
        BDT: { rate: 1, symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
        USDT: { rate: 0.008, symbol: '$', name: 'US Dollar', flag: '🇺🇸', display_rate: '1 USDT = 125৳' },
        INR: { rate: 1, symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', display_rate: '1 INR = 1৳' }
    };

    // Ensure WhatsApp and Payment numbers default and cleanly formatted
    const waData = getCleanWhatsApp(settings.whatsapp_number || settings.whatsapp || '01727400370');
    settings.whatsapp_number = waData.number;
    settings.whatsapp_intl = waData.intl;
    settings.whatsapp = waData.url;
    settings.payment_number = settings.payment_number || '01700878400';

    // Ensure complete payment methods with Rocket and Binance
    const pubSettings = readJson(path.join(__dirname, 'public', 'settings.json'), {});
    const fallbackPaymentMethods = pubSettings.paymentMethods || {
        bkash: { name: 'bKash Personal', number: settings.payment_number || '01700878400', active: true, type: 'Personal' },
        nagad: { name: 'Nagad Personal', number: settings.payment_number || '01700878400', active: true, type: 'Personal' },
        rocket: { name: 'Rocket Personal', number: settings.payment_number || '01700878400', active: true, type: 'Personal' },
        binance: { name: 'Binance USDT', number: 'Pay ID: 1290554507', active: true, type: 'Crypto' }
    };
    settings.payment_methods = settings.payment_methods || fallbackPaymentMethods;
    res.locals.paymentMethods = settings.payment_methods;

    const currentCurrencyCode = req.session.currency || (req.session.user && req.session.user.currency) || 'BDT';
    const currentCurrency = currencyRates[currentCurrencyCode] || currencyRates.BDT;

    res.locals.settings = settings;
    res.locals.currentCurrencyCode = currentCurrencyCode;
    res.locals.currentCurrency = currentCurrency;

    // Robust Price Formatter Helper
    const dynamicUsdtRate = (currencyRates.USDT && Number(currencyRates.USDT.rate)) || 0.008;
    const dynamicInrRate = (currencyRates.INR && Number(currencyRates.INR.rate)) || 1;

    res.locals.formatPrice = (bdtPrice) => {
        const num = parseFloat(bdtPrice) || 0;
        if (currentCurrencyCode === 'USDT') {
            const val = (num * dynamicUsdtRate).toFixed(2);
            return `$${val}`;
        } else if (currentCurrencyCode === 'INR') {
            return `₹${Math.round(num * dynamicInrRate)}`;
        } else {
            return `${Math.round(num)}৳`;
        }
    };

    res.locals.convertPrice = (bdtPrice) => {
        const num = parseFloat(bdtPrice) || 0;
        if (currentCurrencyCode === 'USDT') {
            return parseFloat((num * dynamicUsdtRate).toFixed(2));
        } else if (currentCurrencyCode === 'INR') {
            return Math.round(num * dynamicInrRate);
        }
        return Math.round(num);
    };

    // Bilingual Language Support (Bangla & English)
    const currentLang = req.session.lang || (req.session.user && req.session.user.language) || 'bn';
    res.locals.currentLang = currentLang;

    const translations = {
        bn: {
            home: "হোম",
            spin: "স্পিন",
            vip_pass: "ভিআইপি পাস",
            mystery_box: "মিস্ট্রি বক্স",
            track: "ট্র্যাক",
            leaderboard: "টপ ১০",
            redeem: "রিডিম",
            install: "ইনস্টল",
            login: "লগইন",
            logout: "লগআউট",
            wallet: "ওয়ালেট",
            profile: "প্রোফাইল",
            orders: "অর্ডার হিস্ট্রি",
            language: "ভাষা",
            bangla: "বাংলা",
            english: "English",
            search_placeholder: "প্যানেল, মড, রুট সার্ভিস সার্চ করুন...",
            buy_now: "BUY NOW",
            file_setup: "FILE & SETUP"
        },
        en: {
            home: "Home",
            spin: "Spin",
            vip_pass: "VIP Pass",
            mystery_box: "Mystery Box",
            track: "Track",
            leaderboard: "Leaderboard",
            redeem: "Redeem",
            install: "Install",
            login: "LOGIN",
            logout: "Log Out",
            wallet: "Wallet",
            profile: "My Profile",
            orders: "Order History",
            language: "Language",
            bangla: "Bangla",
            english: "English",
            search_placeholder: "Search panels, mods, root services...",
            buy_now: "BUY NOW",
            file_setup: "FILE & SETUP"
        }
    };

    res.locals.t = (key) => {
        const l = res.locals.currentLang || 'bn';
        if (translations[l] && translations[l][key]) return translations[l][key];
        if (translations['en'] && translations['en'][key]) return translations['en'][key];
        return key;
    };

    // Fresh user data sync for immediate role/discount updates
    if (req.session && req.session.user && req.session.user.id) {
        const allUsers = readJson(USERS_FILE, []);
        const found = allUsers.find(u => String(u.id) === String(req.session.user.id));
        if (found) {
            req.session.user = found;
        }
    }

    const currentSettings = readJson(SETTINGS_FILE, {});
    const vipSettings = readJson(VIP_SETTINGS_FILE, { enabled: true, price: 250, duration_days: 30, discount_percent: 10, title: "ZERO VIP PASS" });
    const isVip = !!(req.session.user && req.session.user.vip_until && new Date(req.session.user.vip_until) > new Date());
    const activeDiscount = getUserDiscount(req.session.user, currentSettings);

    res.locals.isAdmin = !!req.session.admin;
    res.locals.currentUser = req.session.user || null;
    res.locals.user = req.session.user || null;
    res.locals.userDiscount = activeDiscount;
    res.locals.isReseller = req.session.user && (req.session.user.role === 'reseller');
    res.locals.isSubReseller = req.session.user && (req.session.user.role === 'sub_reseller' || req.session.user.role === 'sub-reseller');
    res.locals.isVip = isVip;
    res.locals.vipSettings = vipSettings;
    res.locals.hasDiscount = activeDiscount > 0;
    res.locals.path = req.path;
    res.locals.title = '';
    res.locals.error = null;
    next();
});

// Helper to calculate user discount percentage
function getUserDiscount(user, settings = {}) {
    if (!user) return 0;
    const custom = parseFloat(user.discount_percent);
    if (!isNaN(custom) && custom > 0) {
        return Math.min(90, Math.max(0, custom));
    }
    const role = (user.role || '').toLowerCase().trim();
    let discount = 0;
    if (role === 'reseller') {
        discount = parseFloat(settings.reseller_default_discount) || 15;
    } else if (role === 'sub_reseller' || role === 'sub-reseller' || role === 'subreseller') {
        discount = parseFloat(settings.sub_reseller_default_discount) || 10;
    }

    // Check if user has active VIP pass
    if (user.vip_until && new Date(user.vip_until) > new Date()) {
        const vipSettings = readJson(VIP_SETTINGS_FILE, { discount_percent: 10 });
        const vipDiscount = parseFloat(vipSettings.discount_percent) || 10;
        discount = Math.max(discount, vipDiscount);
    }

    return discount;
}

// Admin Authentication Guard
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    return res.redirect('/admin/login');
}

// -------------------------------------------------------------
// PUBLIC ROUTES
// -------------------------------------------------------------

// Home page
app.get('/', (req, res) => {
    const products = readJson(PRODUCTS_FILE, []);
    const sliders = readJson(SLIDERS_FILE, []);
    const categories = readJson(CATEGORIES_FILE, []);
    const flashSale = readJson(FLASH_SALE_FILE, { enabled: false });

    res.render('index', {
        title: 'Home',
        products,
        sliders,
        categories,
        flashSale
    });
});

// Currency Switcher
app.get('/currency/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    if (['BDT', 'USDT', 'INR'].includes(code)) {
        req.session.currency = code;
    }
    req.session.save(() => {
        const backURL = req.header('Referer') || '/';
        res.redirect(backURL);
    });
});

// Language Switcher (Bangla / English)
app.get('/language/:lang', (req, res) => {
    const lang = (req.params.lang || 'bn').toLowerCase();
    if (['bn', 'en'].includes(lang)) {
        req.session.lang = lang;
        if (req.session.user) {
            req.session.user.language = lang;
            const allUsers = readJson(USERS_FILE, []);
            const u = allUsers.find(x => String(x.id) === String(req.session.user.id));
            if (u) {
                u.language = lang;
                writeJson(USERS_FILE, allUsers);
            }
        }
    }
    req.session.save(() => {
        const backURL = req.header('Referer') || '/';
        res.redirect(backURL);
    });
});

// Product detail / checkout page
app.get('/topup/:slug', (req, res) => {
    const products = readJson(PRODUCTS_FILE, []).map(hydrateProduct);
    const slug = req.params.slug;
    const product = products.find(p => p.slug === slug || p.slug === encodeURIComponent(slug) || String(p.id) === slug);

    if (!product) {
        return res.status(404).redirect('/');
    }

    res.render('topup', {
        title: product.title,
        product
    });
});

// Order Submission (Requires Logged-In User)
app.post('/topup/buynow', (req, res) => {
    // Enforce login requirement: guests cannot buy products
    if (!req.session.user && !req.session.admin) {
        req.session.loginError = 'প্রোডাক্ট কিনতে হলে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।';
        return req.session.save(() => {
            res.redirect('/login');
        });
    }

    const {
        product_id,
        product_title,
        variant,
        price,
        player_id,
        whatsapp,
        payment_method,
        transaction_id,
        phone_brand,
        phone_model,
        android_version,
        bootloader_status,
        root_solution,
        coupon_code
    } = req.body;

    const orders = readJson(ORDERS_FILE, []);
    const newOrderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    const prodIdNum = parseInt(product_id) || 1;
    const selectedVariant = variant || '1 Day Key';

    // Check if product is an Account order (no key system needed)
    const allProducts = readJson(PRODUCTS_FILE, []).map(hydrateProduct);
    const orderedProd = allProducts.find(p => p.id === prodIdNum || String(p.id) === String(product_id));
    const isAccountOrder = (orderedProd && orderedProd.category === 'accounts') ||
                           (selectedVariant && selectedVariant.toLowerCase().includes('account')) ||
                           (product_title && product_title.toLowerCase().includes('account'));

    // Automatic key delivery is OFF as requested: orders are reviewed and delivered manually by admin
    const assignedKey = null;

    const loggedInUser = req.session.user || req.session.adminUser || null;
    const siteSettings = readJson(SETTINGS_FILE, {});
    const orderDiscount = getUserDiscount(loggedInUser, siteSettings);

    let effectivePrice = parseFloat(price) || 50;
    let appliedCoupon = null;
    let couponDiscount = 0;

    // Apply Coupon Code if provided
    if (coupon_code && typeof coupon_code === 'string') {
        const coupons = readJson(COUPONS_FILE, []);
        const cleanCoupon = coupon_code.trim().toUpperCase();
        const foundC = coupons.find(c => c.code && c.code.toUpperCase() === cleanCoupon && c.active);
        if (foundC) {
            const currentUses = foundC.used_count || 0;
            const maxUses = foundC.max_uses || 1;
            
            // Only apply if coupon hasn't exceeded usage limit
            if (currentUses < maxUses) {
                appliedCoupon = foundC.code;
                if (foundC.discount_percent) {
                    couponDiscount = Math.round((effectivePrice * foundC.discount_percent) / 100);
                    if (foundC.max_discount && couponDiscount > foundC.max_discount) {
                        couponDiscount = foundC.max_discount;
                    }
                } else if (foundC.discount_flat) {
                    couponDiscount = foundC.discount_flat;
                }
                effectivePrice = Math.max(0, effectivePrice - couponDiscount);

                // Increment used count and record user tracking
                foundC.used_count = currentUses + 1;
                if (!foundC.used_by) foundC.used_by = [];
                foundC.used_by.push({
                    order_id: newOrderId,
                    user_email: loggedInUser ? loggedInUser.email : null,
                    whatsapp: whatsapp || null,
                    used_at: new Date().toISOString()
                });

                // If single-use or limit reached, immediately mark as inactive/expired
                if (foundC.used_count >= maxUses) {
                    foundC.active = false;
                }
                writeJson(COUPONS_FILE, coupons);
            }
        }
    }

    const isWalletPay = (payment_method === 'Wallet' || payment_method === 'Wallet Balance');
    if (isWalletPay) {
        if (!loggedInUser) {
            req.session.loginError = 'ওয়ালেট দিয়ে পেমেন্ট করার জন্য লগইন করুন।';
            return res.redirect('/login');
        }
        const allUsers = readJson(USERS_FILE, []);
        const uIdx = allUsers.findIndex(u => String(u.id) === String(loggedInUser.id));
        if (uIdx !== -1) {
            const currentBalance = parseFloat(allUsers[uIdx].wallet_balance || 0);
            if (currentBalance < effectivePrice) {
                return res.status(400).send('<script>alert("আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! রিচার্জ করুন।"); window.history.back();</script>');
            }
            allUsers[uIdx].wallet_balance = Math.max(0, currentBalance - effectivePrice);
            writeJson(USERS_FILE, allUsers);
            req.session.user = allUsers[uIdx];
        }
    } else {
        // Anti-Fraud & Duplicate/Dummy TrxID Verification for Direct Gateway Payments
        const fraudCheck = validateTransactionAntiFraud(transaction_id, loggedInUser, req);
        if (!fraudCheck.valid) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Payment Verification Error</title>
                    <style>body { background: #070d1a; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }</style>
                </head>
                <body>
                    <script>
                        alert("${fraudCheck.reason.replace(/"/g, '\\"')}");
                        window.history.back();
                    </script>
                </body>
                </html>
            `);
        }
    }

    const newOrder = {
        id: newOrderId,
        user_id: loggedInUser ? loggedInUser.id : null,
        user_email: loggedInUser ? loggedInUser.email : null,
        user_name: loggedInUser ? (loggedInUser.name || 'Customer') : 'Customer',
        user_role: loggedInUser ? (loggedInUser.role || 'user') : 'user',
        discount_percent: orderDiscount,
        coupon_code: appliedCoupon,
        coupon_discount: couponDiscount,
        product_id: prodIdNum,
        product_name: product_title || 'Game Panel',
        variant: selectedVariant,
        price: effectivePrice,
        player_id: player_id || 'N/A',
        whatsapp: whatsapp || 'N/A',
        payment_method: isWalletPay ? 'Wallet Balance' : (payment_method || 'bKash'),
        transaction_id: isWalletPay ? ('WALLET-' + Date.now().toString().slice(-6)) : (transaction_id || 'N/A'),
        license_key: assignedKey,
        phone_brand: phone_brand || null,
        phone_model: phone_model || null,
        android_version: android_version || null,
        bootloader_status: bootloader_status || null,
        root_solution: root_solution || null,
        status: isWalletPay ? 'processing' : 'pending',
        created_at: new Date().toISOString()
    };

    orders.unshift(newOrder);
    writeJson(ORDERS_FILE, orders);

    // Award Free Spin credits for spending 500৳ (per 500৳ spent -> +1 spin)
    if (loggedInUser) {
        const allUsers = readJson(USERS_FILE, []);
        const uIdx = allUsers.findIndex(u => String(u.id) === String(loggedInUser.id));
        if (uIdx !== -1) {
            const spinCfg = getSpinSettings();
            const spendThreshold = parseFloat(spinCfg.spend_threshold) || 500;
            allUsers[uIdx].spent_for_spin = (parseFloat(allUsers[uIdx].spent_for_spin) || 0) + effectivePrice;
            
            let earnedSpins = 0;
            while (allUsers[uIdx].spent_for_spin >= spendThreshold) {
                allUsers[uIdx].spent_for_spin -= spendThreshold;
                allUsers[uIdx].spin_credits = (parseInt(allUsers[uIdx].spin_credits) || 0) + 1;
                earnedSpins++;
            }
            if (earnedSpins > 0) {
                console.log(`[SPIN CREDIT EARNED] User ${allUsers[uIdx].email} earned ${earnedSpins} Free Spin(s) for spending ${effectivePrice}৳! Total spins: ${allUsers[uIdx].spin_credits}`);
            }
            writeJson(USERS_FILE, allUsers);
            req.session.user = allUsers[uIdx];
        }
    }

    // Fire automated email notification to admin Gmail (asynchronous, non-blocking)
    const settings = readJson(SETTINGS_FILE, {});
    sendOrderNotificationEmail(newOrder, settings).catch(err => {
        console.error('[ORDER EMAIL BACKGROUND ERROR]', err);
    });

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordOrderAlert(newOrder).catch(err => {
        console.error('[DISCORD ORDER BACKGROUND ERROR]', err);
    });

    res.redirect('/order-success/' + newOrderId);
});

// Order confirmation page
app.get('/order-success/:id', (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
        return res.redirect('/');
    }

    res.render('order-success', {
        title: 'Order Received',
        order
    });
});

// Google OAuth Authentication
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

app.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, profile, info) => {
        if (err || !profile) {
            console.error('[GOOGLE AUTH ERROR]', err || info);
            req.session.loginError = 'Google login failed or was cancelled.';
            return req.session.save(() => res.redirect('/login'));
        }

        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) 
            ? profile.emails[0].value.trim().toLowerCase() 
            : null;

        if (!email) {
            req.session.loginError = 'Could not retrieve email from Google account.';
            return req.session.save(() => res.redirect('/login'));
        }

        const users = readJson(USERS_FILE, []);
        let user = users.find(u => (u.email || '').toLowerCase() === email);

        if (!user) {
            user = {
                id: Date.now(),
                google_id: profile.id,
                name: profile.displayName || email.split('@')[0],
                email: email,
                avatar: (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
                phone: '',
                password: '',
                role: (email === 'tgsgaming2024@gmail.com') ? 'admin' : 'user',
                wallet_balance: 0,
                spin_credits: 0,
                deposited_for_spin: 0,
                spent_for_spin: 0,
                created_at: new Date().toISOString()
            };
            users.push(user);
            writeJson(USERS_FILE, users);
            console.log(`[GOOGLE AUTH] Created new user: ${email} (${user.role})`);

            // Referral Tracker Hook
            const refCandidate = req.session?.ref_by || (req.cookies && req.cookies.ref_by);
            if (refCandidate) {
                try {
                    awardReferralCredit(refCandidate, user, 'google_signup');
                    delete req.session.ref_by;
                    res.clearCookie('ref_by');
                } catch(e) {
                    console.error('[REFERRAL HOOK ERROR]', e);
                }
            }
        } else {
            let updated = false;
            if (!user.google_id) { user.google_id = profile.id; updated = true; }
            if (!user.avatar && profile.photos && profile.photos[0] && profile.photos[0].value) {
                user.avatar = profile.photos[0].value;
                updated = true;
            }
            if (updated) writeJson(USERS_FILE, users);
            console.log(`[GOOGLE AUTH] Existing user logged in: ${email} (${user.role})`);
        }

        if (user.role === 'admin' || email === 'tgsgaming2024@gmail.com') {
            req.session.admin = true;
            req.session.adminUser = user;
            req.session.user = null;
            return req.session.save(() => res.redirect('/admin'));
        } else {
            req.session.user = user;
            req.session.admin = false;
            return req.session.save(() => res.redirect('/'));
        }
    })(req, res, next);
});

// User login page
app.get('/login', (req, res) => {
    if (req.session.admin) return res.redirect('/admin');
    if (req.session.user) return res.redirect('/');

    res.render('login', {
        title: 'Sign In',
        error: req.session.loginError || null
    });
    req.session.loginError = null;
});

// User login submit (Supports both normal users and admin credentials)
app.post('/login', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const users = readJson(USERS_FILE, []);

    const isDefaultAdmin = (email === 'tgsgaming2024@gmail.com' && password === 'Toqy+thamid2026');
    const matchedUser = users.find(u => (u.email || '').toLowerCase() === email && u.password === password);

    if (isDefaultAdmin || (matchedUser && matchedUser.role === 'admin')) {
        req.session.admin = true;
        req.session.adminUser = matchedUser || {
            name: 'Super Admin',
            email: 'tgsgaming2024@gmail.com',
            role: 'admin'
        };
        req.session.user = null;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            return res.redirect('/admin');
        });
        return;
    }

    if (matchedUser) {
        req.session.user = matchedUser;
        req.session.admin = false;
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            return res.redirect('/');
        });
        return;
    }

    req.session.loginError = 'Invalid email or password. Please check your credentials.';
    req.session.save(() => {
        res.redirect('/login');
    });
});

// User registration
app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Create Account',
        error: null
    });
});

app.post('/register', (req, res) => {
    const { name, email, phone, password, password_confirmation } = req.body;
    const users = readJson(USERS_FILE, []);

    if (password_confirmation && password !== password_confirmation) {
        return res.render('register', {
            title: 'Create Account',
            error: 'Passwords do not match. Please re-enter.'
        });
    }

    if (users.some(u => u.email.toLowerCase() === (email || '').trim().toLowerCase())) {
        return res.render('register', {
            title: 'Create Account',
            error: 'An account with that email already exists.'
        });
    }

    const newUser = {
        id: Date.now(),
        name: name || 'User',
        email: (email || '').trim().toLowerCase(),
        phone: phone || '',
        password: password,
        role: 'user',
        created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeJson(USERS_FILE, users);

    req.session.user = newUser;
    req.session.save(() => {
        res.redirect('/');
    });
});

// Forgot Password Page
app.get('/forgot-password', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('forgot-password', {
        title: 'Forgot Password'
    });
});

// Send Forgot Password OTP
app.post('/api/forgot-password/send-otp', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Please enter a valid Gmail / Email address.' });
        }

        const users = readJson(USERS_FILE, []);
        const matchedUser = users.find(u => (u.email || '').toLowerCase() === email);

        if (!matchedUser) {
            return res.status(404).json({ success: false, message: 'No registered account found with this email address.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resets = readJson(PASSWORD_RESETS_FILE, {});

        resets[email] = {
            email: email,
            code: otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000,
            createdAt: Date.now()
        };
        writeJson(PASSWORD_RESETS_FILE, resets);

        const settings = readJson(SETTINGS_FILE, {});
        const emailResult = await sendPasswordResetOtpEmail(email, matchedUser.name, otpCode, settings);

        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP email: ' + (emailResult.error || emailResult.message) });
        }

        return res.json({ success: true, message: 'A 6-digit verification code has been sent to your Gmail inbox!' });
    } catch (err) {
        console.error('Error in send-otp:', err);
        return res.status(500).json({ success: false, message: 'Server error processing password reset.' });
    }
});

// Verify OTP and Reset Password
app.post('/api/forgot-password/verify-and-reset', (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const otp = (req.body.otp || '').trim();
        const newPassword = (req.body.newPassword || '').trim();

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
        }

        const resets = readJson(PASSWORD_RESETS_FILE, {});
        const resetRecord = resets[email];

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'No reset request found. Please request a new code.' });
        }

        if (Date.now() > resetRecord.expiresAt) {
            delete resets[email];
            writeJson(PASSWORD_RESETS_FILE, resets);
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
        }

        if (String(resetRecord.code) !== String(otp)) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please check your Gmail.' });
        }

        const users = readJson(USERS_FILE, []);
        const userIndex = users.findIndex(u => (u.email || '').toLowerCase() === email);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        users[userIndex].password = newPassword;
        writeJson(USERS_FILE, users);

        delete resets[email];
        writeJson(PASSWORD_RESETS_FILE, resets);

        // Auto login session
        req.session.user = users[userIndex];
        req.session.admin = (users[userIndex].role === 'admin');
        req.session.save(() => {
            return res.json({ success: true, message: 'Password reset successfully! Redirecting...' });
        });
    } catch (err) {
        console.error('Error in verify-and-reset:', err);
        return res.status(500).json({ success: false, message: 'Server error updating password.' });
    }
});

// ==========================================
// VIP MEMBERSHIP PASS SUITE
// ==========================================
app.get('/vip', (req, res) => {
    const vipSettings = readJson(VIP_SETTINGS_FILE, {
        enabled: true,
        price: 250,
        duration_days: 30,
        discount_percent: 10,
        title: "ZERO VIP PASS",
        perks: [
            "সব প্রোডাক্টে অতিরিক্ত ১০% ফ্ল্যাট ছাড় (Flat 10% OFF on all keys)",
            "প্রোফাইলে ও ন্যাভবারে আকর্ষণীয় গোল্ডেন 👑 VIP প্রিমিয়াম ব্যাজ",
            "লাইভ প্রায়োরিটি HWID রিসেট সাপোর্ট",
            "মিস্ট্রি বক্সে স্পেশাল লাকি বুস্ট বোনাস",
            "ডিসকর্ড ও টেলিগ্রাম স্পেশাল VIP কাস্টমার রোল"
        ]
    });

    let daysRemaining = 0;
    if (req.session.user && req.session.user.vip_until) {
        const diff = new Date(req.session.user.vip_until).getTime() - Date.now();
        if (diff > 0) {
            daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
    }

    res.render('vip', {
        title: 'VIP Membership Pass',
        vipSettings,
        daysRemaining
    });
});

app.post('/api/vip/purchase', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to purchase VIP Membership Pass.' });
        }

        const vipSettings = readJson(VIP_SETTINGS_FILE, { price: 250, duration_days: 30, title: 'ZERO VIP PASS' });
        const users = readJson(USERS_FILE, []);
        const userIndex = users.findIndex(u => String(u.id) === String(req.session.user.id));

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        const user = users[userIndex];
        const cost = Number(vipSettings.price) || 250;

        if ((user.wallet_balance || 0) < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You need ${cost}৳, but your balance is ${user.wallet_balance || 0}৳. Please add funds first.`
            });
        }

        // Deduct balance
        user.wallet_balance = (user.wallet_balance || 0) - cost;

        // Calculate expiration date
        const now = Date.now();
        const currentVip = (user.vip_until && new Date(user.vip_until).getTime() > now) ? new Date(user.vip_until).getTime() : now;
        const durationMs = (Number(vipSettings.duration_days) || 30) * 24 * 60 * 60 * 1000;
        const newVipUntil = new Date(currentVip + durationMs).toISOString();

        user.vip_until = newVipUntil;
        users[userIndex] = user;
        writeJson(USERS_FILE, users);

        // Record VIP order
        const orders = readJson(ORDERS_FILE, []);
        const vipOrderId = 'VIP-' + Date.now();
        orders.unshift({
            id: vipOrderId,
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            product_name: vipSettings.title || 'ZERO VIP PASS',
            variant: `${vipSettings.duration_days || 30} Days VIP Membership`,
            price: cost,
            payment_method: 'Wallet Cash',
            status: 'Completed',
            transaction_id: 'AUTO-WALLET-VIP',
            created_at: new Date().toISOString()
        });
        writeJson(ORDERS_FILE, orders);

        // Update session
        req.session.user = user;
        req.session.save(() => {
            const daysLeft = Math.ceil((new Date(newVipUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return res.json({
                success: true,
                message: `Congratulations! You are now an active VIP member (${daysLeft} days active).`,
                newBalance: user.wallet_balance,
                vipUntil: newVipUntil,
                daysRemaining: daysLeft
            });
        });
    } catch (err) {
        console.error('Error purchasing VIP pass:', err);
        return res.status(500).json({ success: false, message: 'Server error processing VIP purchase.' });
    }
});

// ==========================================
// CYBER MYSTERY BOX SUITE
// ==========================================
app.get('/mystery-box', (req, res) => {
    const mysterySettings = readJson(MYSTERY_SETTINGS_FILE, {
        enabled: true,
        box_cost: 50,
        title: "CYBER MYSTERY BOX",
        rewards: [],
        recent_drops: []
    });

    res.render('mystery-box', {
        title: 'Cyber Mystery Box',
        mysterySettings
    });
});

app.post('/api/mystery-box/open', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to unlock Cyber Mystery Boxes.' });
        }

        const mysterySettings = readJson(MYSTERY_SETTINGS_FILE, { box_cost: 50, rewards: [], recent_drops: [] });
        const users = readJson(USERS_FILE, []);
        const userIndex = users.findIndex(u => String(u.id) === String(req.session.user.id));

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        const user = users[userIndex];
        const cost = Number(mysterySettings.box_cost) || 50;

        if ((user.wallet_balance || 0) < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You need ${cost}৳, but your balance is ${user.wallet_balance || 0}৳.`
            });
        }

        // Deduct box cost
        user.wallet_balance = (user.wallet_balance || 0) - cost;
        user.mystery_boxes_opened = (user.mystery_boxes_opened || 0) + 1;

        // Weighted Random Selection
        const rewards = (mysterySettings.rewards && mysterySettings.rewards.length > 0) ? mysterySettings.rewards : [
            { id: "rew_1", name: "50৳ Wallet Cash", type: "wallet", amount: 50, chance: 15, badge: "RARE", color: "#00f0ff" },
            { id: "rew_2", name: "25৳ Wallet Cash", type: "wallet", amount: 25, chance: 35, badge: "COMMON", color: "#10b981" },
            { id: "rew_3", name: "10৳ Wallet Cash", type: "wallet", amount: 10, chance: 50, badge: "COMMON", color: "#64748b" }
        ];

        const totalWeight = rewards.reduce((sum, r) => sum + (Number(r.chance) || 1), 0);
        let randomNum = Math.random() * totalWeight;
        let chosenReward = rewards[0];

        for (const rew of rewards) {
            const weight = Number(rew.chance) || 1;
            if (randomNum <= weight) {
                chosenReward = rew;
                break;
            }
            randomNum -= weight;
        }

        // Grant reward
        let rewardMessage = '';
        if (chosenReward.type === 'wallet') {
            user.wallet_balance = (user.wallet_balance || 0) + Number(chosenReward.amount);
            rewardMessage = `🎉 Won ${chosenReward.amount}৳ added to your Wallet!`;
        } else if (chosenReward.type === 'spin') {
            user.spin_credits = (user.spin_credits || 0) + Number(chosenReward.amount);
            rewardMessage = `🎉 Won ${chosenReward.amount} Free Lucky Spin Tickets!`;
        } else if (chosenReward.type === 'key') {
            // Generate product key
            const generatedKey = `ZE-${(chosenReward.duration || '1D').replace(/\s+/g, '').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            // Save into keys.json
            const keys = readJson(KEYS_FILE, []);
            keys.push({
                id: 'key-' + Date.now(),
                key: generatedKey,
                product: chosenReward.product_name || 'Free Fire Non-Root',
                duration: chosenReward.duration || '1 Day',
                user_id: user.id,
                user_email: user.email,
                user_name: user.name,
                status: 'unused',
                source: 'Mystery Box Drop',
                created_at: new Date().toISOString()
            });
            writeJson(KEYS_FILE, keys);

            // Record in order history
            const orders = readJson(ORDERS_FILE, []);
            orders.unshift({
                id: 'MB-' + Date.now(),
                user_id: user.id,
                user_name: user.name,
                user_email: user.email,
                product_name: chosenReward.product_name || 'Free Fire Non-Root',
                variant: chosenReward.duration || '1 Day',
                price: 0,
                license_key: generatedKey,
                payment_method: 'Mystery Box Reward',
                status: 'Completed',
                created_at: new Date().toISOString()
            });
            writeJson(ORDERS_FILE, orders);

            rewardMessage = `🔥 WON AN EPIC LICENSE KEY: ${generatedKey} (${chosenReward.name})! Check your Key History.`;
        }

        users[userIndex] = user;
        writeJson(USERS_FILE, users);

        // Record recent drop
        if (!mysterySettings.recent_drops) mysterySettings.recent_drops = [];
        mysterySettings.recent_drops.unshift({
            user_name: user.name || 'Gamer',
            reward_name: chosenReward.name,
            badge: chosenReward.badge || 'WIN',
            color: chosenReward.color || '#00f0ff',
            time_ago: 'Just now'
        });
        if (mysterySettings.recent_drops.length > 15) {
            mysterySettings.recent_drops = mysterySettings.recent_drops.slice(0, 15);
        }
        writeJson(MYSTERY_SETTINGS_FILE, mysterySettings);

        req.session.user = user;
        req.session.save(() => {
            return res.json({
                success: true,
                reward: chosenReward,
                message: rewardMessage,
                newBalance: user.wallet_balance
            });
        });
    } catch (err) {
        console.error('Error opening mystery box:', err);
        return res.status(500).json({ success: false, message: 'Server error opening mystery box.' });
    }
});

// ==========================================
// FEATURE: LEADERBOARD SUITE
// ==========================================
const defaultLeaderboardSettings = {
    enabled: true,
    title: '🏆 TOP SPENDERS LEADERBOARD',
    subtitle: 'চলতি মাসের সেরা ১০ ক্রেতা! প্রতি মাসের শেষে শীর্ষ ৩ জনকে আকর্ষণীয় ক্যাশ বোনাস ও রিওয়ার্ড দেওয়া হয়।',
    rank1_reward: '500৳ বোনাস + VIP Pass',
    rank2_reward: '250৳ বোনাস + 10x Spin',
    rank3_reward: '100৳ বোনাস + 5x Spin',
    rank_other_reward: '50৳ ভাউচার কোড',
    custom_note: 'প্রতি মাসের ১ তারিখে স্বয়ংক্রিয়ভাবে রিওয়ার্ড প্রদান করা হয়।'
};

app.get('/leaderboard', (req, res) => {
    const leaderboardSettings = readJson(LEADERBOARD_SETTINGS_FILE, defaultLeaderboardSettings);
    res.render('leaderboard', {
        title: 'Top Spenders Hall of Fame',
        leaderboardSettings
    });
});

app.get('/api/leaderboard', (req, res) => {
    try {
        const lbSettings = readJson(LEADERBOARD_SETTINGS_FILE, defaultLeaderboardSettings);
        const orders = readJson(ORDERS_FILE, []);
        const users = readJson(USERS_FILE, []);
        const userMap = new Map();

        orders.forEach(order => {
            if (order && (order.status === 'Completed' || order.status === 'completed' || order.status === 'Delivered')) {
                const uId = String(order.user_id || order.userId || order.user_email || order.email || '');
                if (!uId) return;
                const price = Number(order.price || order.total || order.amount) || 0;
                if (!userMap.has(uId)) {
                    userMap.set(uId, {
                        id: uId,
                        name: order.user_name || order.customer_name || 'Gamer',
                        email: order.user_email || order.email || '',
                        total_spent: 0,
                        orders_count: 0
                    });
                }
                const entry = userMap.get(uId);
                entry.total_spent += price;
                entry.orders_count += 1;
            }
        });

        const walletReqs = readJson(WALLET_REQUESTS_FILE, []);
        walletReqs.forEach(w => {
            if (w && (w.status === 'approved' || w.status === 'Approved')) {
                const uId = String(w.user_id || w.userId || w.user_email || '');
                if (!uId) return;
                const amt = Number(w.amount) || 0;
                if (userMap.has(uId)) {
                    const entry = userMap.get(uId);
                    if (entry.total_spent === 0) entry.total_spent += amt;
                }
            }
        });

        users.forEach(u => {
            const uId = String(u.id);
            if (userMap.has(uId)) {
                const entry = userMap.get(uId);
                if (u.name) entry.name = u.name;
                entry.avatar = u.avatar || '';
                entry.is_vip = !!(u.vip_until && new Date(u.vip_until).getTime() > Date.now());
            }
        });

        let sorted = Array.from(userMap.values())
            .filter(u => u.total_spent > 0)
            .sort((a, b) => b.total_spent - a.total_spent);

        if (sorted.length < 5) {
            const seed = [
                { id: 'u_seed1', name: 'Tanvir Ahmed', total_spent: 3450, orders_count: 14, is_vip: true },
                { id: 'u_seed2', name: 'Rakib Hossain', total_spent: 2800, orders_count: 9, is_vip: true },
                { id: 'u_seed3', name: 'Sabbir Khan', total_spent: 2150, orders_count: 8, is_vip: false },
                { id: 'u_seed4', name: 'Shuvo BD', total_spent: 1720, orders_count: 6, is_vip: false },
                { id: 'u_seed5', name: 'Fahim Apex', total_spent: 1290, orders_count: 5, is_vip: false }
            ];
            seed.forEach(s => {
                if (!sorted.some(u => u.name === s.name)) sorted.push(s);
            });
            sorted.sort((a, b) => b.total_spent - a.total_spent);
        }

        const masked = sorted.slice(0, 10).map((u, i) => {
            const parts = (u.name || 'Gamer').trim().split(/\s+/);
            let display = parts[0];
            if (parts.length > 1) {
                display += ' ' + parts[1].substring(0, 1) + '***';
            } else if (display.length > 3) {
                display = display.substring(0, 3) + '***';
            }
            return {
                rank: i + 1,
                name: display,
                total_spent: Math.round(u.total_spent),
                orders_count: u.orders_count || 1,
                is_vip: !!u.is_vip,
                avatar: u.avatar || '',
                prize: i === 0 ? (lbSettings.rank1_reward || '500৳ + VIP Pass') : (i === 1 ? (lbSettings.rank2_reward || '250৳ + 10x Spin') : (i === 2 ? (lbSettings.rank3_reward || '100৳ + 5x Spin') : (lbSettings.rank_other_reward || '50৳ Bonus')))
            };
        });

        res.json({
            success: true,
            month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            settings: lbSettings,
            leaderboard: masked
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Leaderboard API
app.get('/api/admin/leaderboard/settings', (req, res) => {
    const settings = readJson(LEADERBOARD_SETTINGS_FILE, defaultLeaderboardSettings);
    res.json({ success: true, settings });
});

app.post('/api/admin/leaderboard/settings', (req, res) => {
    try {
        const { enabled, title, subtitle, rank1_reward, rank2_reward, rank3_reward, rank_other_reward, custom_note } = req.body || {};
        const current = readJson(LEADERBOARD_SETTINGS_FILE, defaultLeaderboardSettings);
        const updated = {
            enabled: enabled !== undefined ? !!enabled : (current.enabled !== false),
            title: title ? title.trim() : (current.title || '🏆 TOP SPENDERS LEADERBOARD'),
            subtitle: subtitle ? subtitle.trim() : (current.subtitle || 'চলতি মাসের সেরা ১০ ক্রেতা! প্রতি মাসের শেষে শীর্ষ ৩ জনকে আকর্ষণীয় ক্যাশ বোনাস ও রিওয়ার্ড দেওয়া হয়।'),
            rank1_reward: rank1_reward ? rank1_reward.trim() : (current.rank1_reward || '500৳ বোনাস + VIP Pass'),
            rank2_reward: rank2_reward ? rank2_reward.trim() : (current.rank2_reward || '250৳ বোনাস + 10x Spin'),
            rank3_reward: rank3_reward ? rank3_reward.trim() : (current.rank3_reward || '100৳ বোনাস + 5x Spin'),
            rank_other_reward: rank_other_reward ? rank_other_reward.trim() : (current.rank_other_reward || '50৳ ভাউচার কোড'),
            custom_note: custom_note ? custom_note.trim() : (current.custom_note || '')
        };
        writeJson(LEADERBOARD_SETTINGS_FILE, updated);
        res.json({ success: true, message: '🏆 Leaderboard settings updated successfully!', settings: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// FEATURE: REDEEM GIFT CARD & VOUCHER
// ==========================================
app.post('/api/gift-cards/redeem', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to your account to redeem gift cards.' });
        }

        const rawCode = String(req.body.code || '').trim().toUpperCase();
        if (!rawCode) {
            return res.status(400).json({ success: false, message: 'Please enter a valid gift card or voucher code.' });
        }

        const giftCards = readJson(GIFT_CARDS_FILE, []);
        const card = giftCards.find(c => String(c.code).trim().toUpperCase() === rawCode);

        if (!card) {
            return res.status(404).json({ success: false, message: 'Invalid gift card code. Please check and try again.' });
        }

        if (card.is_active === false) {
            return res.status(400).json({ success: false, message: 'This gift card has been disabled or expired.' });
        }

        if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'This gift card code has expired.' });
        }

        const userId = req.session.user.id;
        const userEmail = req.session.user.email;
        const usedBy = card.used_by || [];

        if (usedBy.some(u => String(u.user_id) === String(userId) || (u.user_email && u.user_email === userEmail))) {
            return res.status(400).json({ success: false, message: 'You have already redeemed this gift card code!' });
        }

        if (card.max_uses && card.used_count >= card.max_uses) {
            return res.status(400).json({ success: false, message: 'This gift card code has reached its maximum claim limit.' });
        }

        const users = readJson(USERS_FILE, []);
        const userIdx = users.findIndex(u => String(u.id) === String(userId));
        if (userIdx === -1) {
            return res.status(404).json({ success: false, message: 'User profile not found.' });
        }

        const rewardAmount = Number(card.amount) || 0;
        users[userIdx].wallet_balance = (Number(users[userIdx].wallet_balance) || 0) + rewardAmount;
        writeJson(USERS_FILE, users);

        card.used_count = (Number(card.used_count) || 0) + 1;
        if (!card.used_by) card.used_by = [];
        card.used_by.push({
            user_id: userId,
            user_name: users[userIdx].name || 'User',
            user_email: userEmail,
            redeemed_at: new Date().toISOString()
        });
        writeJson(GIFT_CARDS_FILE, giftCards);

        const walletReqs = readJson(WALLET_REQUESTS_FILE, []);
        walletReqs.unshift({
            id: 'GC-' + Date.now(),
            user_id: userId,
            user_name: users[userIdx].name || 'User',
            user_email: userEmail,
            amount: rewardAmount,
            payment_method: 'Gift Card / Voucher',
            transaction_id: card.code,
            status: 'approved',
            created_at: new Date().toISOString()
        });
        writeJson(WALLET_REQUESTS_FILE, walletReqs);

        req.session.user = users[userIdx];
        req.session.save(() => {
            return res.json({
                success: true,
                message: `🎉 অভিনন্দন! সফলভাবে ${rewardAmount}৳ আপনার ওয়ালেটে যুক্ত হয়েছে!`,
                newBalance: users[userIdx].wallet_balance
            });
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// FEATURE: PURCHASE GIFT CARD USING WALLET
// ==========================================
app.post('/api/gift-cards/purchase', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'গিফট কার্ড কিনতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।' });
        }

        const rawAmount = req.body.amount;
        const amount = Math.floor(Number(rawAmount) || 0);

        if (!amount || isNaN(amount) || amount < 10) {
            return res.status(400).json({ success: false, message: 'সর্বনিম্ন গিফট কার্ড অ্যামাউন্ট ১০৳ হতে হবে।' });
        }

        if (amount > 50000) {
            return res.status(400).json({ success: false, message: 'একবারে সর্বোচ্চ ৫০,০০০৳ মূল্যের গিফট কার্ড কেনা যাবে।' });
        }

        const userId = req.session.user.id;
        const users = readJson(USERS_FILE, []);
        const userIdx = users.findIndex(u => String(u.id) === String(userId));
        if (userIdx === -1) {
            return res.status(404).json({ success: false, message: 'ব্যবহারকারীর তথ্য পাওয়া যায়নি।' });
        }

        const userBalance = Number(users[userIdx].wallet_balance) || 0;
        if (userBalance < amount) {
            return res.status(400).json({
                success: false,
                message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ${userBalance}৳, প্রয়োজন: ${amount}৳। আগে ওয়ালেট রিচার্জ করুন।`
            });
        }

        // Deduct wallet balance
        users[userIdx].wallet_balance = userBalance - amount;
        writeJson(USERS_FILE, users);

        // Generate unique code: e.g. ZX-XXXX-XXXX
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        const giftCards = readJson(GIFT_CARDS_FILE, []);

        let attempts = 0;
        do {
            let part1 = '';
            let part2 = '';
            for (let i = 0; i < 4; i++) {
                part1 += chars.charAt(Math.floor(Math.random() * chars.length));
                part2 += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            code = `ZX-${part1}-${part2}`;
            attempts++;
        } while (giftCards.some(c => c.code.toUpperCase() === code) && attempts < 10);

        const newCard = {
            id: 'gc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            code: code,
            amount: amount,
            max_uses: 1,
            used_count: 0,
            used_by: [],
            buyer_id: userId,
            buyer_name: users[userIdx].name || 'User',
            buyer_email: users[userIdx].email,
            expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            is_active: true,
            created_at: new Date().toISOString()
        };

        giftCards.unshift(newCard);
        writeJson(GIFT_CARDS_FILE, giftCards);

        // Record debit in wallet requests
        const walletReqs = readJson(WALLET_REQUESTS_FILE, []);
        walletReqs.unshift({
            id: 'GC-BUY-' + Date.now(),
            user_id: userId,
            user_name: users[userIdx].name || 'User',
            user_email: users[userIdx].email,
            amount: -amount,
            type: 'debit',
            payment_method: 'Gift Card Purchase',
            transaction_id: code,
            status: 'approved',
            created_at: new Date().toISOString()
        });
        writeJson(WALLET_REQUESTS_FILE, walletReqs);

        req.session.user.wallet_balance = users[userIdx].wallet_balance;
        req.session.save(() => {
            return res.json({
                success: true,
                message: `🎉 অভিনন্দন! ${amount}৳ মূল্যের গিফট কার্ড সফলভাবে তৈরি হয়েছে!`,
                card: {
                    id: newCard.id,
                    code: newCard.code,
                    amount: newCard.amount,
                    created_at: newCard.created_at,
                    expires_at: newCard.expires_at,
                    is_active: true,
                    used_count: 0
                },
                newBalance: users[userIdx].wallet_balance
            });
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// FEATURE: GET USER'S PURCHASED GIFT CARDS
// ==========================================
app.get('/api/gift-cards/my-cards', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'লগইন করুন দয়া করে।' });
        }

        const userId = req.session.user.id;
        const giftCards = readJson(GIFT_CARDS_FILE, []);
        const myCards = giftCards.filter(c => String(c.buyer_id) === String(userId)).map(c => ({
            id: c.id,
            code: c.code,
            amount: c.amount,
            used_count: c.used_count || 0,
            max_uses: c.max_uses || 1,
            claimed: (c.used_count || 0) >= (c.max_uses || 1),
            claimed_by: (c.used_by && c.used_by.length > 0) ? c.used_by[0].user_name : null,
            created_at: c.created_at
        }));

        return res.json({ success: true, cards: myCards });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Get Gift Cards
app.get('/api/admin/gift-cards', (req, res) => {
    const cards = readJson(GIFT_CARDS_FILE, []);
    res.json({ success: true, giftCards: cards });
});

// Admin Create Gift Card
app.post('/api/admin/gift-cards/create', (req, res) => {
    try {
        const { code, amount, max_uses, expires_at } = req.body || {};
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required.' });
        }

        const cleanCode = (code ? String(code).trim() : ('GIFT-' + Math.random().toString(36).substring(2, 8))).toUpperCase();
        const cards = readJson(GIFT_CARDS_FILE, []);

        if (cards.some(c => c.code.toUpperCase() === cleanCode)) {
            return res.status(400).json({ success: false, message: 'A gift card with this code already exists.' });
        }

        const newCard = {
            id: 'gc-' + Date.now(),
            code: cleanCode,
            amount: Number(amount),
            max_uses: parseInt(max_uses) || 1,
            used_count: 0,
            used_by: [],
            expires_at: expires_at ? new Date(expires_at).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            is_active: true,
            created_at: new Date().toISOString()
        };

        cards.unshift(newCard);
        writeJson(GIFT_CARDS_FILE, cards);
        res.json({ success: true, message: `Gift card ${cleanCode} created successfully!`, giftCard: newCard });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Delete Gift Card
app.post('/api/admin/gift-cards/delete', (req, res) => {
    const { id } = req.body || {};
    const cards = readJson(GIFT_CARDS_FILE, []);
    const filtered = cards.filter(c => c.id !== id);
    writeJson(GIFT_CARDS_FILE, filtered);
    res.json({ success: true, message: 'Gift card removed.' });
});

// Admin Get Flash Sale Settings
app.get('/api/admin/flash-sale', (req, res) => {
    const fsSettings = readJson(FLASH_SALE_FILE, { enabled: false });
    res.json({ success: true, flashSale: fsSettings });
});

// Admin Save Flash Sale Settings
app.post('/api/admin/flash-sale', (req, res) => {
    try {
        const { enabled, title, subtitle, end_time, banner_tag, discount_percent, product_ids } = req.body || {};
        const current = readJson(FLASH_SALE_FILE, {});
        const updated = {
            enabled: enabled !== undefined ? !!enabled : (current.enabled !== false),
            title: title ? title.trim() : (current.title || '⚡ MIDNIGHT CYBER FLASH SALE'),
            subtitle: subtitle ? subtitle.trim() : (current.subtitle || 'সীমিত সময়ের জন্য মেগা ডিসকাউন্ট!'),
            end_time: end_time || current.end_time || new Date(Date.now() + 48 * 3600000).toISOString(),
            banner_tag: banner_tag || current.banner_tag || 'UP TO 50% OFF',
            discount_percent: Number(discount_percent) || current.discount_percent || 25,
            product_ids: Array.isArray(product_ids) ? product_ids : (current.product_ids || [])
        };
        writeJson(FLASH_SALE_FILE, updated);
        res.json({ success: true, message: '⚡ Flash Sale settings updated successfully!', flashSale: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// User account page
app.get('/account', (req, res) => {
    if (!req.session.user && !req.session.admin) {
        return res.redirect('/login?returnUrl=/account');
    }
    let currentUser = req.session.user || req.session.adminUser || { name: 'Admin', email: 'tgsgaming2024@gmail.com', role: 'admin' };
    
    // Always fetch latest balance and profile data from users.json
    if (currentUser.id) {
        const allUsers = readJson(USERS_FILE, []);
        const freshUser = allUsers.find(u => String(u.id) === String(currentUser.id));
        if (freshUser) {
            currentUser = { ...currentUser, ...freshUser };
            req.session.user = currentUser;
        }
    }

    const allOrders = readJson(ORDERS_FILE, []);
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
    const userId = currentUser.id;

    const orders = allOrders.filter(o => {
        if (currentUser.role === 'admin') return true;
        if (o.user_id && String(o.user_id) === String(userId)) return true;
        if (o.user_email && o.user_email.toLowerCase().trim() === userEmail) return true;
        if (userPhone && o.whatsapp && o.whatsapp.replace(/[^0-9]/g, '').includes(userPhone)) return true;
        return false;
    });

    // Extract license keys
    const keys = orders.filter(o => o.license_key && o.license_key.trim());

    // Fetch deposit/payment history from wallet_requests.json
    const allRequests = readJson(WALLET_REQUESTS_FILE, []);
    const deposits = allRequests.filter(r => {
        if (currentUser.role === 'admin') return true;
        if (r.user_id && String(r.user_id) === String(userId)) return true;
        if (r.user_email && r.user_email.toLowerCase().trim() === userEmail) return true;
        if (userPhone && r.sender_phone && r.sender_phone.replace(/[^0-9]/g, '').includes(userPhone)) return true;
        return false;
    });

    // Fetch HWID reset requests
    const allHwidResets = readJson(HWID_RESETS_FILE, []);
    const hwidRequests = allHwidResets.filter(h => {
        if (currentUser.role === 'admin') return true;
        if (h.user_id && String(h.user_id) === String(userId)) return true;
        if (h.user_email && h.user_email.toLowerCase().trim() === userEmail) return true;
        return false;
    });

    // Fetch referrals history for current user
    const allReferrals = readJson(REFERRALS_FILE, []);
    const userReferrals = allReferrals.filter(r => {
        if (currentUser.role === 'admin') return true;
        if (r.referrer_id && String(r.referrer_id) === String(userId)) return true;
        if (r.referrer_email && r.referrer_email.toLowerCase().trim() === userEmail) return true;
        return false;
    });

    const referralSettings = getReferralSettings();
    const refCode = 'REF' + (currentUser.id || 'MEM');
    const inviteUrl = `${req.protocol}://${req.get('host')}/invite?ref=${refCode}`;

    const activeTab = (req.query.tab || 'orders').toLowerCase();

    res.render('account', {
        title: 'My Account & History',
        user: currentUser,
        orders,
        keys,
        deposits,
        hwidRequests,
        userReferrals,
        referralSettings,
        refCode,
        inviteUrl,
        activeTab
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// =============================================================
// USER PROFILE UPDATE ROUTE (Name, Avatar Picture, Phone)
// =============================================================
app.post('/api/profile/update', (req, res, next) => {
    uploadAvatar.single('avatarFile')(req, res, (err) => {
        if (err) {
            console.error('Avatar upload error:', err);
            if (req.xhr || req.headers.accept?.includes('application/json') || req.body?.is_ajax === '1') {
                return res.status(400).json({ success: false, message: err.message || 'Image upload failed. Max size is 5MB.' });
            }
            return res.redirect('/account?tab=profile&error=' + encodeURIComponent(err.message || 'Image upload failed.'));
        }
        next();
    });
}, (req, res) => {
    try {
        if (!req.session.user && !req.session.adminUser && !req.session.admin) {
            if (req.xhr || req.headers.accept?.includes('application/json') || req.body.is_ajax === '1') {
                return res.status(401).json({ success: false, message: 'Please log in to update your profile.' });
            }
            return res.redirect('/login?returnUrl=/account?tab=profile');
        }

        const currentUser = req.session.user || req.session.adminUser || { id: 1, email: 'tgsgaming2024@gmail.com', role: 'admin' };
        const allUsers = readJson(USERS_FILE, []);

        // Find user by id or email
        let userIdx = -1;
        if (currentUser.id) {
            userIdx = allUsers.findIndex(u => String(u.id) === String(currentUser.id));
        }
        if (userIdx === -1 && currentUser.email) {
            userIdx = allUsers.findIndex(u => (u.email || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim());
        }

        if (userIdx === -1) {
            if (req.xhr || req.headers.accept?.includes('application/json') || req.body.is_ajax === '1') {
                return res.status(404).json({ success: false, message: 'User account not found.' });
            }
            return res.redirect('/account?tab=profile&error=User+not+found');
        }

        const user = allUsers[userIdx];
        let changed = false;

        // 1. Update Name
        if (req.body.name && typeof req.body.name === 'string') {
            const cleanName = req.body.name.trim();
            if (cleanName.length >= 2 && cleanName.length <= 60) {
                user.name = cleanName;
                changed = true;
            } else {
                if (req.xhr || req.headers.accept?.includes('application/json') || req.body.is_ajax === '1') {
                    return res.status(400).json({ success: false, message: 'Name must be between 2 and 60 characters.' });
                }
                return res.redirect('/account?tab=profile&error=Invalid+name+length');
            }
        }

        // 2. Update Phone
        if (req.body.phone !== undefined && typeof req.body.phone === 'string') {
            user.phone = req.body.phone.trim();
            changed = true;
        }

        // 2.1 Update Language Preference (bn / en)
        if (req.body.language && ['bn', 'en'].includes(req.body.language)) {
            user.language = req.body.language;
            req.session.lang = req.body.language;
            changed = true;
        }

        // 2.2 Update Currency Preference (BDT / USDT / INR)
        if (req.body.currency && typeof req.body.currency === 'string') {
            const cleanCurr = req.body.currency.trim().toUpperCase();
            if (['BDT', 'USDT', 'INR'].includes(cleanCurr)) {
                user.currency = cleanCurr;
                req.session.currency = cleanCurr;
                changed = true;
            }
        }

        // 3. Update Avatar Picture (File Upload or Preset Choice)
        if (req.file) {
            user.avatar = '/uploads/avatar/' + req.file.filename;
            changed = true;
        } else if (req.body.avatarPreset && typeof req.body.avatarPreset === 'string') {
            const cleanPreset = req.body.avatarPreset.trim();
            if (cleanPreset && (cleanPreset.startsWith('/uploads/avatar/') || cleanPreset.startsWith('http://') || cleanPreset.startsWith('https://'))) {
                user.avatar = cleanPreset;
                changed = true;
            }
        }

        if (changed) {
            allUsers[userIdx] = user;
            writeJson(USERS_FILE, allUsers);

            // Synchronize sessions
            if (req.session.user) {
                req.session.user = { ...req.session.user, ...user };
            }
            if (req.session.adminUser && String(req.session.adminUser.id) === String(user.id)) {
                req.session.adminUser = { ...req.session.adminUser, ...user };
            }
        }

        req.session.save((saveErr) => {
            if (saveErr) console.error('Session save error on profile update:', saveErr);

            if (req.xhr || req.headers.accept?.includes('application/json') || req.body.is_ajax === '1') {
                return res.json({
                    success: true,
                    message: (user.language === 'en') ? 'Profile settings updated successfully!' : 'প্রোফাইল সেটিংস সফলভাবে আপডেট করা হয়েছে!',
                    user: {
                        name: user.name,
                        avatar: user.avatar,
                        phone: user.phone,
                        email: user.email,
                        role: user.role,
                        language: user.language || 'bn',
                        currency: user.currency || 'BDT'
                    }
                });
            }

            res.redirect('/account?tab=profile&saved=1');
        });
    } catch (err) {
        console.error('Profile update error:', err);
        if (req.xhr || req.headers.accept?.includes('application/json') || req.body?.is_ajax === '1') {
            return res.status(500).json({ success: false, message: 'Server error updating profile: ' + err.message });
        }
        res.redirect('/account?tab=profile&error=Server+error');
    }
});

// =============================================================
// LIVE ORDER TRACKING ROUTES
// =============================================================
app.get('/track', (req, res) => {
    const query = (req.query.q || '').trim();
    let initialOrder = null;
    if (query) {
        const orders = readJson(ORDERS_FILE, []);
        const cleanQ = query.toLowerCase();
        initialOrder = orders.find(o => {
            if (String(o.id).toLowerCase() === cleanQ) return true;
            if (o.transaction_id && o.transaction_id.toLowerCase() === cleanQ) return true;
            if (o.player_id && String(o.player_id).toLowerCase() === cleanQ) return true;
            if (o.whatsapp && o.whatsapp.replace(/[^0-9]/g, '').includes(cleanQ.replace(/[^0-9]/g, '')) && cleanQ.length >= 7) return true;
            return false;
        }) || null;
    }

    res.render('track', {
        title: 'Live Order Tracking',
        query,
        initialOrder
    });
});

app.get('/api/track-order', (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const orders = readJson(ORDERS_FILE, []);
    const cleanQ = query.toLowerCase();
    const cleanDigits = query.replace(/[^0-9]/g, '');

    const found = orders.find(o => {
        if (String(o.id).toLowerCase() === cleanQ) return true;
        if (o.transaction_id && o.transaction_id.toLowerCase() === cleanQ) return true;
        if (o.player_id && String(o.player_id).toLowerCase() === cleanQ) return true;
        if (cleanDigits.length >= 7 && o.whatsapp && o.whatsapp.replace(/[^0-9]/g, '').includes(cleanDigits)) return true;
        return false;
    });

    if (!found) {
        return res.json({ success: false, message: 'No order found with the provided details.' });
    }

    // Return safe order object for public tracking
    res.json({
        success: true,
        order: {
            id: found.id,
            product_name: found.product_name,
            variant: found.variant,
            price: found.price,
            status: found.status,
            payment_method: found.payment_method,
            transaction_id: found.transaction_id,
            player_id: found.player_id,
            license_key: (found.status === 'completed') ? found.license_key : null,
            created_at: found.created_at
        }
    });
});

// =============================================================
// PROMO CODE & COUPON SYSTEM
// =============================================================
app.post('/api/coupon/validate', (req, res) => {
    const { code, price, email } = req.body || {};
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupons = readJson(COUPONS_FILE, []);
    const coupon = coupons.find(c => c.code && c.code.toUpperCase() === cleanCode);

    if (!coupon) {
        return res.json({ valid: false, message: 'Invalid promo code.' });
    }

    // Check if promo code is expired or used up
    const maxUses = coupon.max_uses || 1;
    const currentUses = coupon.used_count || 0;
    if (!coupon.active || currentUses >= maxUses) {
        return res.json({ 
            valid: false, 
            message: 'এই প্রমো কোডটির মেয়াদ শেষ অথবা এটি ইতোমধ্যে ব্যবহার করা হয়েছে (Already Used / Expired)।' 
        });
    }

    // Check single-use per user
    const checkEmail = (req.session && req.session.user && req.session.user.email) || email || '';
    if (coupon.single_use_per_user && checkEmail && Array.isArray(coupon.used_by)) {
        const alreadyUsed = coupon.used_by.some(u => {
            if (typeof u === 'string') return u.toLowerCase() === checkEmail.toLowerCase();
            return u && u.user_email && u.user_email.toLowerCase() === checkEmail.toLowerCase();
        });
        if (alreadyUsed) {
            return res.json({ valid: false, message: 'আপনি ইতোমধ্যে এই প্রমো কোডটি ১ বার ব্যবহার করে ফেলেছেন।' });
        }
    }

    const basePrice = parseFloat(price) || 0;
    if (coupon.min_order && basePrice < coupon.min_order) {
        return res.json({ valid: false, message: `This coupon requires a minimum order of ${coupon.min_order}৳.` });
    }

    let discountAmount = 0;
    if (coupon.discount_percent) {
        discountAmount = Math.round((basePrice * coupon.discount_percent) / 100);
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
            discountAmount = coupon.max_discount;
        }
    } else if (coupon.discount_flat) {
        discountAmount = coupon.discount_flat;
    }

    discountAmount = Math.min(basePrice, discountAmount);
    const newPrice = Math.max(0, basePrice - discountAmount);

    res.json({
        valid: true,
        code: coupon.code,
        discount_type: coupon.discount_type || (coupon.discount_percent ? 'percent' : 'flat'),
        discount_percent: coupon.discount_percent || 0,
        discount_flat: coupon.discount_flat || 0,
        discount_amount: discountAmount,
        new_price: newPrice,
        message: coupon.description || `Coupon applied! You saved ${discountAmount}৳.`
    });
});

// Admin Promo Code Management Endpoints
app.get('/api/admin/coupons', (req, res) => {
    const coupons = readJson(COUPONS_FILE, []);
    res.json({ success: true, coupons });
});

app.post('/api/admin/coupons/create', (req, res) => {
    const { 
        code, 
        discount_type, 
        discount_value, 
        max_discount, 
        min_order, 
        max_uses, 
        single_use_per_user,
        description, 
        active 
    } = req.body || {};

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, message: 'Promo code name is required.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
        return res.status(400).json({ success: false, message: 'Invalid promo code characters.' });
    }

    const coupons = readJson(COUPONS_FILE, []);
    if (coupons.some(c => c.code && c.code.toUpperCase() === cleanCode)) {
        return res.status(400).json({ success: false, message: `Promo code "${cleanCode}" already exists.` });
    }

    const isPercent = (discount_type === 'percent' || !discount_type);
    const val = Math.max(0, parseFloat(discount_value) || 0);

    const newCoupon = {
        id: 'cp_' + Date.now().toString(36),
        code: cleanCode,
        discount_type: isPercent ? 'percent' : 'flat',
        discount_percent: isPercent ? val : 0,
        discount_flat: !isPercent ? val : 0,
        max_discount: parseFloat(max_discount) || 0,
        min_order: parseFloat(min_order) || 0,
        max_uses: parseInt(max_uses, 10) > 0 ? parseInt(max_uses, 10) : 1, // Default 1 for single-use!
        used_count: 0,
        used_by: [],
        single_use_per_user: single_use_per_user !== false,
        active: active !== false,
        description: description ? description.trim() : (isPercent ? `${val}% Special Discount (Single Use)` : `${val}৳ Flat Discount (Single Use)`),
        created_at: new Date().toISOString()
    };

    coupons.unshift(newCoupon);
    writeJson(COUPONS_FILE, coupons);

    res.json({ success: true, message: `Promo code ${cleanCode} created successfully!`, coupon: newCoupon });
});

app.post('/api/admin/coupons/toggle', (req, res) => {
    const { id } = req.body || {};
    const coupons = readJson(COUPONS_FILE, []);
    const c = coupons.find(item => item.id === id || item.code === id);
    if (!c) {
        return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }
    c.active = !c.active;
    writeJson(COUPONS_FILE, coupons);
    res.json({ success: true, active: c.active });
});

app.post('/api/admin/coupons/reset', (req, res) => {
    const { id } = req.body || {};
    const coupons = readJson(COUPONS_FILE, []);
    const c = coupons.find(item => item.id === id || item.code === id);
    if (!c) {
        return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }
    c.used_count = 0;
    c.used_by = [];
    c.active = true;
    writeJson(COUPONS_FILE, coupons);
    res.json({ success: true, message: `Promo code ${c.code} usage reset to 0 and reactivated.` });
});

app.post('/api/admin/coupons/delete', (req, res) => {
    const { id } = req.body || {};
    let coupons = readJson(COUPONS_FILE, []);
    const initialLen = coupons.length;
    coupons = coupons.filter(c => c.id !== id && c.code !== id);
    if (coupons.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }
    writeJson(COUPONS_FILE, coupons);
    res.json({ success: true, message: 'Promo code deleted successfully.' });
});

// =============================================================
// WALLET BALANCE & RECHARGE SYSTEM
// =============================================================
app.get(['/add-funds', '/wallet'], (req, res) => {
    if (!req.session.user && !req.session.admin) {
        req.session.loginError = 'ওয়ালেটে ফান্ড অ্যাড করার জন্য অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।';
        return req.session.save(() => {
            res.redirect('/login?returnUrl=/add-funds');
        });
    }

    let currentUser = req.session.user || req.session.adminUser || { name: 'Admin', email: 'tgsgaming2024@gmail.com', role: 'admin' };
    if (currentUser.id) {
        const allUsers = readJson(USERS_FILE, []);
        const freshUser = allUsers.find(u => String(u.id) === String(currentUser.id));
        if (freshUser) {
            currentUser = { ...currentUser, ...freshUser };
            req.session.user = currentUser;
        }
    }
    const allRequests = readJson(WALLET_REQUESTS_FILE, []);
    const myRequests = allRequests.filter(r => String(r.user_id) === String(currentUser.id) || r.user_email === currentUser.email);

    res.render('add_funds', {
        title: 'Add Funds - Recharge Wallet',
        user: currentUser,
        myRequests
    });
});

app.post('/api/wallet/topup-request', (req, res) => {
    if (!req.session.user && !req.session.admin) {
        return res.status(401).json({ success: false, message: 'Please log in to recharge wallet.' });
    }

    const currentUser = req.session.user || req.session.adminUser;
    const { amount, payment_method, transaction_id, sender_phone } = req.body || {};

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum recharge amount is 10৳.' });
    }
    if (!transaction_id || !transaction_id.trim()) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
    }

    // Anti-Fraud & Duplicate/Dummy TrxID Verification
    const fraudCheck = validateTransactionAntiFraud(transaction_id, currentUser, req);
    if (!fraudCheck.valid) {
        return res.status(400).json({
            success: false,
            message: fraudCheck.reason,
            blocked: fraudCheck.blocked || false,
            duplicate: fraudCheck.duplicate || false
        });
    }

    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const newReq = {
        id: 'WLT-' + Math.floor(10000 + Math.random() * 90000),
        user_id: currentUser.id,
        user_name: currentUser.name || 'Member',
        user_email: currentUser.email,
        sender_phone: sender_phone || currentUser.phone || 'N/A',
        amount: numAmount,
        payment_method: payment_method || 'bKash',
        transaction_id: transaction_id.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
    };

    requests.unshift(newReq);
    writeJson(WALLET_REQUESTS_FILE, requests);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordWalletAlert(newReq).catch(err => {
        console.error('[DISCORD WALLET ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: 'Recharge request submitted successfully! Admin will verify and add balance shortly.'
    });
});

app.get('/api/admin/wallet/requests', (req, res) => {
    const requests = readJson(WALLET_REQUESTS_FILE, []);
    res.json({ success: true, requests });
});

app.post('/api/admin/wallet/approve', (req, res) => {
    const { requestId, force } = req.body || {};
    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const reqItem = requests.find(r => r.id === requestId);

    if (!reqItem) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (reqItem.status === 'approved' && !force) {
        return res.status(400).json({ success: false, message: 'Already approved.' });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(reqItem.user_id));
    if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const creditAmount = Math.abs(parseFloat(reqItem.amount) || 0);
    user.wallet_balance = (parseFloat(user.wallet_balance || 0) + creditAmount);
    reqItem.status = 'approved';
    reqItem.approved_at = new Date().toISOString();

    // Award Free Spin credits for depositing 500৳ (per 500৳ deposited -> +1 spin)
    const spinCfg = getSpinSettings();
    const depositThreshold = parseFloat(spinCfg.deposit_threshold) || 500;
    user.deposited_for_spin = (parseFloat(user.deposited_for_spin) || 0) + creditAmount;
    
    let earnedSpins = 0;
    while (user.deposited_for_spin >= depositThreshold) {
        user.deposited_for_spin -= depositThreshold;
        user.spin_credits = (parseInt(user.spin_credits) || 0) + 1;
        earnedSpins++;
    }
    if (earnedSpins > 0) {
        console.log(`[SPIN CREDIT EARNED] User ${user.email} earned ${earnedSpins} Free Spin(s) for depositing ${creditAmount}৳! Total spins: ${user.spin_credits}`);
    }

    writeJson(USERS_FILE, users);
    writeJson(WALLET_REQUESTS_FILE, requests);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordWalletApprovalAlert(reqItem, false).catch(err => {
        console.error('[DISCORD WALLET APPROVE ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: `Successfully approved & added ${creditAmount}৳ to ${user.name || user.email}! New Balance: ${user.wallet_balance}৳`,
        newBalance: user.wallet_balance
    });
});

app.post('/api/admin/wallet/direct-credit', (req, res) => {
    const { userId, amount, payment_method, note } = req.body || {};
    const addAmount = parseFloat(amount);

    if (!userId || isNaN(addAmount) || addAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid user and positive amount are required.' });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    user.wallet_balance = (parseFloat(user.wallet_balance || 0) + addAmount);

    // Award Free Spin credits for direct admin credit of 500৳
    const spinCfg = getSpinSettings();
    const depositThreshold = parseFloat(spinCfg.deposit_threshold) || 500;
    user.deposited_for_spin = (parseFloat(user.deposited_for_spin) || 0) + addAmount;
    
    let earnedSpins = 0;
    while (user.deposited_for_spin >= depositThreshold) {
        user.deposited_for_spin -= depositThreshold;
        user.spin_credits = (parseInt(user.spin_credits) || 0) + 1;
        earnedSpins++;
    }

    writeJson(USERS_FILE, users);

    res.json({
        success: true,
        message: `Successfully added ${addAmount}৳ to ${user.name || user.email}! New Balance: ${user.wallet_balance}৳`,
        newBalance: user.wallet_balance
    });
});

app.post('/api/admin/wallet/revert', (req, res) => {
    const { requestId } = req.body || {};
    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const reqItem = requests.find(r => r.id === requestId);

    if (!reqItem) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (reqItem.status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Only approved requests can be reverted.' });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(reqItem.user_id));
    if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const deductAmount = parseFloat(reqItem.amount) || 0;
    const oldBalance = parseFloat(user.wallet_balance || 0);
    user.wallet_balance = Math.max(0, oldBalance - deductAmount);
    reqItem.status = 'reverted';
    reqItem.reverted_at = new Date().toISOString();

    writeJson(USERS_FILE, users);
    writeJson(WALLET_REQUESTS_FILE, requests);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordWalletApprovalAlert(reqItem, true).catch(err => {
        console.error('[DISCORD WALLET REVERT ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: `Successfully deducted ${deductAmount}৳ from ${user.name || user.email}. Request marked as REVERTED.`,
        newBalance: user.wallet_balance
    });
});

app.post('/api/admin/wallet/edit', (req, res) => {
    const { requestId, amount, user_balance, status, transaction_id, sender_phone, payment_method } = req.body || {};
    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const reqItem = requests.find(r => r.id === requestId);

    if (!reqItem) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(reqItem.user_id));

    if (user && user_balance !== undefined && user_balance !== null && user_balance !== '') {
        user.wallet_balance = Math.max(0, parseFloat(user_balance) || 0);
    }

    if (amount !== undefined && !isNaN(parseFloat(amount))) {
        reqItem.amount = parseFloat(amount);
    }
    if (status) {
        reqItem.status = status;
    }
    if (transaction_id !== undefined) {
        reqItem.transaction_id = String(transaction_id).trim();
    }
    if (sender_phone !== undefined) {
        reqItem.sender_phone = String(sender_phone).trim();
    }
    if (payment_method !== undefined) {
        reqItem.payment_method = String(payment_method).trim();
    }
    reqItem.updated_at = new Date().toISOString();

    if (user) writeJson(USERS_FILE, users);
    writeJson(WALLET_REQUESTS_FILE, requests);

    res.json({
        success: true,
        message: 'Fund request and balance updated successfully!',
        request: reqItem,
        userBalance: user ? user.wallet_balance : null
    });
});

app.post('/api/admin/wallet/delete', (req, res) => {
    const { requestId } = req.body || {};
    if (!requestId) {
        return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    requests.splice(idx, 1);
    writeJson(WALLET_REQUESTS_FILE, requests);

    res.json({
        success: true,
        message: `Fund request ${requestId} deleted successfully!`
    });
});

app.post('/api/admin/wallet/deduct', (req, res) => {
    const { userId, amount, reason } = req.body || {};
    const deductAmount = parseFloat(amount);

    if (!userId || isNaN(deductAmount) || deductAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid User ID and positive amount are required.' });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const oldBalance = parseFloat(user.wallet_balance || 0);
    user.wallet_balance = Math.max(0, oldBalance - deductAmount);

    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const deductRecord = {
        id: 'WLT-DED-' + Math.floor(10000 + Math.random() * 90000),
        user_id: user.id,
        user_name: user.name || 'Member',
        user_email: user.email || '',
        sender_phone: user.phone || 'Admin Action',
        amount: deductAmount,
        is_deduction: true,
        payment_method: 'Admin Balance Deduction',
        transaction_id: 'DED-' + Date.now().toString(36).toUpperCase(),
        reason: reason || 'Manual Admin Fund Removal',
        status: 'reverted',
        created_at: new Date().toISOString(),
        reverted_at: new Date().toISOString()
    };
    requests.unshift(deductRecord);

    writeJson(USERS_FILE, users);
    writeJson(WALLET_REQUESTS_FILE, requests);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordWalletApprovalAlert(reqItem, false).catch(err => {
        console.error('[DISCORD WALLET APPROVE ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: `Successfully deducted ${deductAmount}৳ from ${user.name || user.email}. New Balance: ${user.wallet_balance}৳`,
        newBalance: user.wallet_balance
    });
});

app.post('/api/admin/wallet/reject', (req, res) => {
    const { requestId } = req.body || {};
    const requests = readJson(WALLET_REQUESTS_FILE, []);
    const reqItem = requests.find(r => r.id === requestId);

    if (!reqItem) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    reqItem.status = 'rejected';
    reqItem.rejected_at = new Date().toISOString();
    writeJson(WALLET_REQUESTS_FILE, requests);

    res.json({ success: true });
});

app.post('/api/admin/users/update-balance', (req, res) => {
    const { userId, balance } = req.body || {};
    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.wallet_balance = Math.max(0, parseFloat(balance) || 0);
    writeJson(USERS_FILE, users);

    res.json({ success: true, balance: user.wallet_balance });
});

// -------------------------------------------------------------
// HWID / DEVICE RESET ROUTES
// -------------------------------------------------------------
app.post('/api/hwid/request', (req, res) => {
    const { order_id, license_key, product_name, reason, device_model } = req.body || {};

    if (!order_id || !license_key) {
        return res.status(400).json({ success: false, message: 'Order ID and License Key are required.' });
    }

    const currentUser = req.session.user || req.session.adminUser;
    const resets = readJson(HWID_RESETS_FILE, []);

    // 1. Check if a reset request for this key is currently pending
    const existingPending = resets.find(r => r.license_key === license_key && r.status === 'pending');
    if (existingPending) {
        return res.status(400).json({
            success: false,
            message: 'A reset request for this license key is already pending verification by admin.'
        });
    }

    // 2. Enforce Strict Single-Use Policy (Max 1 HWID Reset Per License Key)
    const approvedCount = resets.filter(r => r.license_key === license_key && r.status === 'approved').length;
    const orders = readJson(ORDERS_FILE, []);
    const matchedOrder = orders.find(o => o.id === order_id || o.license_key === license_key);
    const orderResetCount = matchedOrder ? (matchedOrder.hwid_reset_count || 0) : 0;

    if (approvedCount >= 1 || orderResetCount >= 1) {
        return res.status(400).json({
            success: false,
            message: 'এই কী-টির জন্য ইতিমধ্যে ১ বার HWID রিসেট সম্পন্ন হয়ে গেছে! একটি লাইসেন্স কীতে সর্বোচ্চ ১ বারই ডিভাইস রিসেট করা সম্ভব।'
        });
    }

    const newReset = {
        id: 'HWID-' + Math.floor(10000 + Math.random() * 90000),
        user_id: currentUser ? currentUser.id : null,
        user_name: currentUser ? (currentUser.name || 'Customer') : (req.body.user_name || 'Customer'),
        user_email: currentUser ? currentUser.email : (req.body.user_email || ''),
        user_phone: currentUser ? (currentUser.phone || '') : (req.body.user_phone || ''),
        order_id: String(order_id).trim(),
        license_key: String(license_key).trim(),
        product_name: String(product_name || 'Panel / Mod Key').trim(),
        reason: String(reason || 'Phone Changed / Reset Device').trim(),
        device_model: String(device_model || 'Android / Phone').trim(),
        status: 'pending',
        created_at: new Date().toISOString()
    };

    resets.unshift(newReset);
    writeJson(HWID_RESETS_FILE, resets);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordHwidAlert(newReset).catch(err => {
        console.error('[DISCORD HWID ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: 'Device HWID reset request submitted successfully! Admin will unlock and reset your device lock shortly.',
        request: newReset
    });
});

app.get('/api/hwid/my-requests', (req, res) => {
    const currentUser = req.session.user || req.session.adminUser;
    if (!currentUser) return res.json({ success: true, requests: [] });

    const allResets = readJson(HWID_RESETS_FILE, []);
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const myResets = allResets.filter(r => {
        if (currentUser.role === 'admin') return true;
        if (r.user_id && String(r.user_id) === String(currentUser.id)) return true;
        if (r.user_email && r.user_email.toLowerCase().trim() === userEmail) return true;
        return false;
    });

    res.json({ success: true, requests: myResets });
});

app.get('/api/admin/hwid/requests', (req, res) => {
    const resets = readJson(HWID_RESETS_FILE, []);
    res.json({ success: true, requests: resets });
});

app.post('/api/admin/hwid/approve', (req, res) => {
    const { requestId, admin_note } = req.body || {};
    const resets = readJson(HWID_RESETS_FILE, []);
    const item = resets.find(r => r.id === requestId);

    if (!item) {
        return res.status(404).json({ success: false, message: 'HWID request not found.' });
    }

    item.status = 'approved';
    item.approved_at = new Date().toISOString();
    item.admin_note = admin_note || 'HWID reset approved & device lock unbinded.';

    // Also update order record if present
    const orders = readJson(ORDERS_FILE, []);
    const order = orders.find(o => o.id === item.order_id);
    if (order) {
        order.hwid_reset_status = 'Reset Done';
        order.hwid_last_reset = new Date().toISOString();
        order.hwid_reset_count = (order.hwid_reset_count || 0) + 1;
        writeJson(ORDERS_FILE, orders);
    }

    writeJson(HWID_RESETS_FILE, resets);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordHwidApprovedAlert(item).catch(err => {
        console.error('[DISCORD HWID APPROVED ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: `HWID reset for request ${requestId} approved! Device lock unlocked for key: ${item.license_key}.`
    });
});

app.post('/api/admin/hwid/reject', (req, res) => {
    const { requestId, reason } = req.body || {};
    const resets = readJson(HWID_RESETS_FILE, []);
    const item = resets.find(r => r.id === requestId);

    if (!item) {
        return res.status(404).json({ success: false, message: 'HWID request not found.' });
    }

    item.status = 'rejected';
    item.rejected_at = new Date().toISOString();
    item.rejection_reason = reason || 'Declined by admin.';

    writeJson(HWID_RESETS_FILE, resets);

    res.json({
        success: true,
        message: `HWID request ${requestId} marked as rejected.`
    });
});

app.post('/api/admin/hwid/delete', (req, res) => {
    const { requestId } = req.body || {};
    if (!requestId) {
        return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    const resets = readJson(HWID_RESETS_FILE, []);
    const idx = resets.findIndex(r => r.id === requestId);
    if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    resets.splice(idx, 1);
    writeJson(HWID_RESETS_FILE, resets);

    // Fire Discord Notification strictly to Locked Channel 1566503959336718367
    sendDiscordHwidApprovedAlert(item).catch(err => {
        console.error('[DISCORD HWID APPROVED ALERT ERROR]', err);
    });

    res.json({
        success: true,
        message: `HWID reset request ${requestId} deleted successfully.`
    });
});

// -------------------------------------------------------------
// ADMIN ROUTES (Filament Style)
// -------------------------------------------------------------

// ZERO EXCEPTION Admin Console Routes
app.get(['/admin', '/admin.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (req, res) => {
    res.redirect('/admin');
});

// API: Save Products & Settings (Auto-sync to local files & optional GitHub)
app.post('/api/save-products', async (req, res) => {
    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) {}
        }
        const { products, settings, token: clientToken, repo, branch } = body || {};
        const results = {};

        // 1. Save products.json (both in public and data directory for live site)
        if (products && Array.isArray(products) && products.length > 0) {
            const pubProdPath = path.join(__dirname, 'public', 'products.json');
            fs.writeFileSync(pubProdPath, JSON.stringify(products, null, 4), 'utf-8');

            try {
                const existingDataProducts = readJson(PRODUCTS_FILE, []);
                const existingMap = new Map();
                existingDataProducts.forEach(p => existingMap.set(String(p.id), p));

                const convertedDataProducts = products.map((p, idx) => {
                    const strId = String(p.id || (idx + 1));
                    const existing = existingMap.get(strId) || {};
                    const durationStr = Array.isArray(p.packages) && p.packages.length > 0
                        ? p.packages.map(pkg => `${pkg.name}|${pkg.price}`).join('\n')
                        : (existing.duration_options || '1 Day Key|1\n7 Days Key|3.5\n30 Days Key|10');

                    return {
                        id: isNaN(Number(p.id)) ? p.id : Number(p.id),
                        title: p.title || existing.title || 'Product',
                        slug: (p.title || existing.title || `product-${idx}`).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        category: p.category || existing.category || 'non-root',
                        categoryName: p.categoryName || existing.categoryName || '',
                        image: p.image || existing.image || '/images/logo.jpg',
                        price: Number(p.basePrice || p.price || existing.price || 0),
                        discount: p.discount || '',
                        is_maintenance: p.status === 'maintenance',
                        maintenance_message: p.status === 'maintenance' ? (p.statusText || 'Currently under maintenance') : '',
                        description: p.description || existing.description || '',
                        stock: 999,
                        in_stock: p.status !== 'maintenance',
                        setup_url: (p.setup_url !== undefined && p.setup_url !== null) ? String(p.setup_url).trim() : (existing.setup_url || ''),
                        apk_url: (p.apk_url !== undefined && p.apk_url !== null) ? String(p.apk_url).trim() : (existing.apk_url || ''),
                        feedback_url: (p.feedback_url !== undefined && p.feedback_url !== null) ? String(p.feedback_url).trim() : (existing.feedback_url || ''),
                        supported_phones: existing.supported_phones || '',
                        duration_options: durationStr
                    };
                });

                fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(convertedDataProducts, null, 2), 'utf-8');

                // Dynamic Categories Sync: register any new custom categories
                try {
                    const existingCats = readJson(CATEGORIES_FILE, []);
                    const catMap = new Map();
                    existingCats.forEach(c => { if (c && c.id) catMap.set(c.id, c); });

                    convertedDataProducts.forEach(prod => {
                        if (prod.category && prod.category !== 'all' && prod.category !== 'custom') {
                            const catId = prod.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            if (!catMap.has(catId) && catId !== 'i-phone' && catId !== 'ios') {
                                const displayName = (prod.categoryName || catId.toUpperCase().replace(/-/g, ' ')).trim();
                                catMap.set(catId, {
                                    id: catId,
                                    name: displayName,
                                    is_primary: false
                                });
                            }
                        }
                    });

                    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(Array.from(catMap.values()), null, 2), 'utf-8');
                } catch (catErr) {
                    console.error('[SYNC CATEGORIES ERROR]', catErr);
                }
            } catch (syncSiteErr) {
                console.error('[SYNC TO DATA ERROR]', syncSiteErr);
            }

            results.products = { success: true, commit: 'local-disk' };
        }

        // 2. Save settings.json
        if (settings && typeof settings === 'object') {
            const pubSettingsPath = path.join(__dirname, 'public', 'settings.json');
            fs.writeFileSync(pubSettingsPath, JSON.stringify(settings, null, 4), 'utf-8');

            try {
                const existingSettings = readJson(SETTINGS_FILE, {});
                if (settings.storeName) existingSettings.site_name = settings.storeName;
                if (settings.noticeText) existingSettings.notice_marquee = settings.noticeText;
                if (settings.whatsappNumber) {
                    const wa = getCleanWhatsApp(settings.whatsappNumber);
                    existingSettings.whatsapp_number = wa.number;
                    existingSettings.whatsapp_intl = wa.intl;
                    existingSettings.whatsapp = wa.url;
                }
                if (settings.telegramUrl) existingSettings.telegram = settings.telegramUrl;
                if (settings.paymentMethods && typeof settings.paymentMethods === 'object') {
                    existingSettings.payment_methods = settings.paymentMethods;
                    if (settings.paymentMethods.bkash && settings.paymentMethods.bkash.number) {
                        existingSettings.payment_number = settings.paymentMethods.bkash.number;
                    }
                }
                if (settings.currencyRates && typeof settings.currencyRates === 'object') {
                    if (!existingSettings.currency_rates) existingSettings.currency_rates = {};
                    if (settings.currencyRates.USDT) {
                        existingSettings.currency_rates.USDT = {
                            rate: parseFloat(settings.currencyRates.USDT.rate) || 0.008,
                            symbol: '$',
                            name: 'US Dollar',
                            flag: '🇺🇸',
                            display_rate: settings.currencyRates.USDT.display_rate || `1 USDT = ${Math.round(1 / (settings.currencyRates.USDT.rate || 0.008))}৳`
                        };
                    }
                    if (settings.currencyRates.INR) {
                        existingSettings.currency_rates.INR = {
                            rate: parseFloat(settings.currencyRates.INR.rate) || 1,
                            symbol: '₹',
                            name: 'Indian Rupee',
                            flag: '🇮🇳',
                            display_rate: settings.currencyRates.INR.display_rate || `1 INR = ${settings.currencyRates.INR.rate || 1}৳`
                        };
                    }
                    if (settings.currencyRates.BDT) {
                        existingSettings.currency_rates.BDT = {
                            rate: 1,
                            symbol: '৳',
                            name: 'Bangladeshi Taka',
                            flag: '🇧🇩'
                        };
                    }
                }
                if (settings.admins && Array.isArray(settings.admins)) {
                    existingSettings.admins = settings.admins;
                }
                fs.writeFileSync(SETTINGS_FILE, JSON.stringify(existingSettings, null, 2), 'utf-8');
            } catch (setErr) {
                console.error('[SYNC SETTINGS ERROR]', setErr);
            }

            results.settings = { success: true, commit: 'local-disk' };
        }

        // 3. Optional GitHub Commit if token & repo configured
        const authToken = process.env.GITHUB_TOKEN || clientToken;
        const targetRepo = repo || process.env.GITHUB_REPO;
        const targetBranch = branch || process.env.GITHUB_BRANCH || 'main';

        if (authToken && targetRepo) {
            try {
                if (products && Array.isArray(products)) {
                    const pathName = 'products.json';
                    const apiUrl = `https://api.github.com/repos/${targetRepo}/contents/${pathName}?ref=${targetBranch}`;
                    let currentSha = null;
                    const getRes = await fetch(apiUrl, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Accept': 'application/vnd.github+json',
                            'User-Agent': 'Zero-Exception-Admin'
                        }
                    });
                    if (getRes.ok) {
                        const fileData = await getRes.json();
                        currentSha = fileData.sha;
                    }
                    const jsonString = JSON.stringify(products, null, 4);
                    const contentBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');
                    const putRes = await fetch(`https://api.github.com/repos/${targetRepo}/contents/${pathName}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Accept': 'application/vnd.github+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Zero-Exception-Admin'
                        },
                        body: JSON.stringify({
                            message: `Auto-sync ${pathName} via ZERO Admin Console [deploy]`,
                            content: contentBase64,
                            sha: currentSha || undefined,
                            branch: targetBranch
                        })
                    });
                    if (putRes.ok) {
                        const putData = await putRes.json();
                        results.products.commit = putData.commit?.sha;
                    }
                }
            } catch (ghErr) {
                console.error('[API SAVE GITHUB ERROR]', ghErr.message);
            }
        }

        return res.json({
            success: true,
            message: 'Products and settings saved successfully!',
            results
        });
    } catch (err) {
        console.error('[API SAVE ERROR]', err);
        return res.status(500).json({ error: err.message || 'Failed to save store data' });
    }
});

// -------------------------------------------------------------
// USER & RESELLER MANAGEMENT API
// -------------------------------------------------------------

// 1. Get all users
app.get('/api/admin/users', (req, res) => {
    try {
        const users = readJson(USERS_FILE, []);
        const settings = readJson(SETTINGS_FILE, {});
        const giftCards = readJson(GIFT_CARDS_FILE, []);
        const keys = readJson(KEYS_FILE, []);
        const now = Date.now();

        const safeUsers = users.map(u => {
            const isVip = !!(u.vip_until && new Date(u.vip_until).getTime() > now);
            const userGiftCards = u.gift_cards_count !== undefined ? Number(u.gift_cards_count) : giftCards.filter(c => (c.used_by || []).some(ub => String(ub.user_id) === String(u.id) || (ub.user_email && ub.user_email === u.email))).length;
            const mbFromKeys = keys.filter(k => (String(k.user_id) === String(u.id) || k.user_email === u.email) && k.source === 'Mystery Box Drop').length;
            const mbOpened = u.mystery_boxes_opened !== undefined ? Number(u.mystery_boxes_opened) : mbFromKeys;

            return {
                id: u.id,
                name: u.name || 'User',
                email: u.email,
                phone: u.phone || '',
                role: u.role || 'user',
                wallet_balance: u.wallet_balance !== undefined ? Number(u.wallet_balance) : 0,
                spin_credits: u.spin_credits !== undefined ? Number(u.spin_credits) : 0,
                vip_until: u.vip_until || null,
                is_vip: isVip,
                gift_cards_count: userGiftCards,
                mystery_boxes_opened: mbOpened,
                discount_percent: u.discount_percent !== undefined && u.discount_percent !== null ? Number(u.discount_percent) : (
                    u.role === 'reseller' ? (Number(settings.reseller_default_discount) || 15) :
                    (u.role === 'sub_reseller' || u.role === 'sub-reseller') ? (Number(settings.sub_reseller_default_discount) || 10) : 0
                ),
                custom_discount: u.discount_percent !== undefined && u.discount_percent !== null ? Number(u.discount_percent) : null,
                created_at: u.created_at || null
            };
        });

        res.json({
            success: true,
            users: safeUsers,
            settings: {
                reseller_default_discount: Number(settings.reseller_default_discount) || 15,
                sub_reseller_default_discount: Number(settings.sub_reseller_default_discount) || 10
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Update user role and discount
app.post('/api/admin/users/update', (req, res) => {
    try {
        const { id, role, discount_percent, name, phone, password, wallet_balance } = req.body || {};
        if (!id) {
            return res.status(400).json({ success: false, error: 'User ID is required.' });
        }

        const users = readJson(USERS_FILE, []);
        const idx = users.findIndex(u => String(u.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (role) {
            users[idx].role = role.toLowerCase().trim();
        }
        if (discount_percent !== undefined && discount_percent !== null && discount_percent !== '') {
            users[idx].discount_percent = Math.min(90, Math.max(0, parseFloat(discount_percent)));
        } else if (discount_percent === '') {
            delete users[idx].discount_percent;
        }

        if (wallet_balance !== undefined && wallet_balance !== null && wallet_balance !== '') {
            users[idx].wallet_balance = Math.max(0, parseFloat(wallet_balance) || 0);
        }

        if (req.body.spin_credits !== undefined && req.body.spin_credits !== null && req.body.spin_credits !== '') {
            users[idx].spin_credits = Math.max(0, parseInt(req.body.spin_credits) || 0);
        }

        if (req.body.mystery_boxes_opened !== undefined && req.body.mystery_boxes_opened !== null && req.body.mystery_boxes_opened !== '') {
            users[idx].mystery_boxes_opened = Math.max(0, parseInt(req.body.mystery_boxes_opened) || 0);
        }

        if (req.body.gift_cards_count !== undefined && req.body.gift_cards_count !== null && req.body.gift_cards_count !== '') {
            users[idx].gift_cards_count = Math.max(0, parseInt(req.body.gift_cards_count) || 0);
        }

        if (req.body.vip_action) {
            const now = Date.now();
            if (req.body.vip_action === 'remove') {
                users[idx].vip_until = null;
            } else if (req.body.vip_action === 'grant_7') {
                const cur = (users[idx].vip_until && new Date(users[idx].vip_until).getTime() > now) ? new Date(users[idx].vip_until).getTime() : now;
                users[idx].vip_until = new Date(cur + 7 * 86400000).toISOString();
            } else if (req.body.vip_action === 'grant_30') {
                const cur = (users[idx].vip_until && new Date(users[idx].vip_until).getTime() > now) ? new Date(users[idx].vip_until).getTime() : now;
                users[idx].vip_until = new Date(cur + 30 * 86400000).toISOString();
            } else if (req.body.vip_action === 'grant_90') {
                const cur = (users[idx].vip_until && new Date(users[idx].vip_until).getTime() > now) ? new Date(users[idx].vip_until).getTime() : now;
                users[idx].vip_until = new Date(cur + 90 * 86400000).toISOString();
            } else if (req.body.vip_action === 'grant_365') {
                const cur = (users[idx].vip_until && new Date(users[idx].vip_until).getTime() > now) ? new Date(users[idx].vip_until).getTime() : now;
                users[idx].vip_until = new Date(cur + 365 * 86400000).toISOString();
            }
        }

        if (name && name.trim()) users[idx].name = name.trim();
        if (phone !== undefined) users[idx].phone = String(phone).trim();
        if (password && password.trim()) users[idx].password = password.trim();

        writeJson(USERS_FILE, users);

        res.json({
            success: true,
            message: `User "${users[idx].name || users[idx].email}" updated successfully!`,
            user: {
                id: users[idx].id,
                name: users[idx].name,
                email: users[idx].email,
                phone: users[idx].phone,
                role: users[idx].role,
                wallet_balance: users[idx].wallet_balance,
                discount_percent: users[idx].discount_percent
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Add new user or reseller
app.post('/api/admin/users/add', (req, res) => {
    try {
        const { name, email, phone, password, role, discount_percent } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        const users = readJson(USERS_FILE, []);
        const cleanEmail = email.trim().toLowerCase();
        if (users.some(u => (u.email || '').toLowerCase() === cleanEmail)) {
            return res.status(400).json({ success: false, error: 'A user with this email already exists.' });
        }

        const assignedRole = (role || 'user').toLowerCase().trim();
        let discountNum = 0;
        if (discount_percent !== undefined && discount_percent !== null && discount_percent !== '') {
            discountNum = Math.min(90, Math.max(0, parseFloat(discount_percent)));
        } else {
            const settings = readJson(SETTINGS_FILE, {});
            discountNum = assignedRole === 'reseller' ? (Number(settings.reseller_default_discount) || 15) :
                         (assignedRole === 'sub_reseller' || assignedRole === 'sub-reseller') ? (Number(settings.sub_reseller_default_discount) || 10) : 0;
        }

        const newUser = {
            id: Date.now(),
            name: (name || 'New Member').trim(),
            email: cleanEmail,
            phone: (phone || '').trim(),
            password: password.trim(),
            role: assignedRole,
            discount_percent: discountNum,
            created_at: new Date().toISOString()
        };

        users.push(newUser);
        writeJson(USERS_FILE, users);

        res.json({
            success: true,
            message: `Created ${assignedRole.toUpperCase()} account for "${newUser.name}"!`,
            user: newUser
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Delete user
app.post('/api/admin/users/delete/:id', (req, res) => {
    try {
        const id = req.params.id;
        const users = readJson(USERS_FILE, []);
        const idx = users.findIndex(u => String(u.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        if (users[idx].email === 'tgsgaming2024@gmail.com') {
            return res.status(403).json({ success: false, error: 'Cannot delete master super admin account.' });
        }

        const deletedName = users[idx].name || users[idx].email;
        users.splice(idx, 1);
        writeJson(USERS_FILE, users);

        res.json({
            success: true,
            message: `User "${deletedName}" deleted successfully.`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Update global reseller default discount rates
app.post('/api/admin/reseller-settings', (req, res) => {
    try {
        const { reseller_default_discount, sub_reseller_default_discount } = req.body || {};
        const settings = readJson(SETTINGS_FILE, {});
        if (reseller_default_discount !== undefined) {
            settings.reseller_default_discount = Math.min(90, Math.max(0, parseFloat(reseller_default_discount)));
        }
        if (sub_reseller_default_discount !== undefined) {
            settings.sub_reseller_default_discount = Math.min(90, Math.max(0, parseFloat(sub_reseller_default_discount)));
        }

        writeJson(SETTINGS_FILE, settings);
        const pubSettingsPath = path.join(__dirname, 'public', 'settings.json');
        if (fs.existsSync(pubSettingsPath)) {
            const pubSet = readJson(pubSettingsPath, {});
            pubSet.reseller_default_discount = settings.reseller_default_discount;
            pubSet.sub_reseller_default_discount = settings.sub_reseller_default_discount;
            writeJson(pubSettingsPath, pubSet);
        }

        res.json({
            success: true,
            message: 'Default reseller discount settings saved successfully!',
            settings: {
                reseller_default_discount: settings.reseller_default_discount,
                sub_reseller_default_discount: settings.sub_reseller_default_discount
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ============================================================
// ORDERS MANAGEMENT API & CONTROLLER (ADMIN)
// ============================================================

// 1. Get all orders
app.get('/api/admin/orders', (req, res) => {
    try {
        const orders = readJson(ORDERS_FILE, []);
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Update order status (pending, processing, completed, cancelled)
app.post('/api/admin/orders/update-status', (req, res) => {
    try {
        const { orderId, status } = req.body || {};
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Missing orderId or status.' });
        }
        const orders = readJson(ORDERS_FILE, []);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        order.status = status;
        order.updated_at = new Date().toISOString();
        writeJson(ORDERS_FILE, orders);
        res.json({ success: true, message: `Order ${orderId} status set to ${status}.`, order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Assign or edit license key / credentials for order
app.post('/api/admin/orders/assign-key', (req, res) => {
    try {
        const { orderId, key, markCompleted } = req.body || {};
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Missing orderId.' });
        }
        const orders = readJson(ORDERS_FILE, []);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        const cleanKey = (key || '').trim();
        order.license_key = cleanKey || null;
        if (markCompleted && cleanKey) {
            order.status = 'completed';
        }
        order.updated_at = new Date().toISOString();
        writeJson(ORDERS_FILE, orders);
        res.json({ success: true, message: `Key successfully saved for Order ${orderId}!`, order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Delete order
app.post('/api/admin/orders/delete/:id', (req, res) => {
    try {
        const orderId = req.params.id;
        let orders = readJson(ORDERS_FILE, []);
        const initialLen = orders.length;
        orders = orders.filter(o => o.id !== orderId);
        if (orders.length === initialLen) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        writeJson(ORDERS_FILE, orders);
        res.json({ success: true, message: `Order ${orderId} deleted successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ============================================================
// FREE FIRE ACCOUNTS STORE API & CONTROLLER
// ============================================================

// 1. Get all FF Accounts (Admin API)
app.get('/api/admin/ff-accounts', (req, res) => {
    try {
        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        res.json({ success: true, accounts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Add or Edit FF Account (Admin API)
app.post('/api/admin/ff-accounts/save', (req, res) => {
    try {
        const {
            id,
            title,
            uid,
            server,
            level,
            likes,
            rank,
            evo_guns,
            login_type,
            price,
            old_price,
            discount,
            status,
            image,
            gallery,
            description,
            credentials
        } = req.body || {};

        if (!title || price === undefined) {
            return res.status(400).json({ success: false, error: 'Account title and price are required.' });
        }

        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        let targetId = id;

        if (targetId) {
            // Edit existing
            const idx = accounts.findIndex(a => a.id === targetId);
            if (idx === -1) {
                return res.status(404).json({ success: false, error: 'Account not found with ID: ' + targetId });
            }

            accounts[idx] = {
                ...accounts[idx],
                title: String(title).trim(),
                uid: uid ? String(uid).trim() : (accounts[idx].uid || ''),
                server: server || accounts[idx].server || 'BD Server',
                level: parseInt(level) || accounts[idx].level || 1,
                likes: likes ? String(likes).trim() : (accounts[idx].likes || ''),
                rank: rank ? String(rank).trim() : (accounts[idx].rank || 'Master'),
                evo_guns: evo_guns ? String(evo_guns).trim() : (accounts[idx].evo_guns || ''),
                login_type: login_type || accounts[idx].login_type || 'Gmail / Google',
                price: parseFloat(price) || 0,
                old_price: old_price ? parseFloat(old_price) : null,
                discount: discount ? String(discount).trim() : '',
                status: status === 'sold' ? 'sold' : 'available',
                image: image ? String(image).trim() : (accounts[idx].image || '/images/jitu.jpg'),
                gallery: Array.isArray(gallery) ? gallery : (accounts[idx].gallery || []),
                description: description ? String(description).trim() : (accounts[idx].description || ''),
                credentials: credentials ? String(credentials).trim() : (accounts[idx].credentials || ''),
                updated_at: new Date().toISOString()
            };
        } else {
            // Create new
            const randomSuffix = Math.floor(100 + Math.random() * 900);
            targetId = 'FFA-' + randomSuffix;

            const newAccount = {
                id: targetId,
                title: String(title).trim(),
                uid: uid ? String(uid).trim() : '',
                server: server || 'BD Server',
                level: parseInt(level) || 1,
                likes: likes ? String(likes).trim() : '0',
                rank: rank ? String(rank).trim() : 'Master',
                evo_guns: evo_guns ? String(evo_guns).trim() : '',
                login_type: login_type || 'Gmail / Google',
                price: parseFloat(price) || 0,
                old_price: old_price ? parseFloat(old_price) : null,
                discount: discount ? String(discount).trim() : '',
                status: status === 'sold' ? 'sold' : 'available',
                image: image ? String(image).trim() : '/images/jitu.jpg',
                gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery : [image || '/images/jitu.jpg'],
                description: description ? String(description).trim() : '',
                credentials: credentials ? String(credentials).trim() : '',
                created_at: new Date().toISOString()
            };

            accounts.unshift(newAccount);
        }

        writeJson(FF_ACCOUNTS_FILE, accounts);

        res.json({
            success: true,
            message: targetId ? 'Free Fire account updated successfully!' : 'New Free Fire account added successfully!',
            account_id: targetId
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Toggle Status (Available / Sold) (Admin API)
app.post('/api/admin/ff-accounts/toggle-status/:id', (req, res) => {
    try {
        const { id } = req.params;
        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        const acc = accounts.find(a => a.id === id);

        if (!acc) {
            return res.status(404).json({ success: false, error: 'Account not found.' });
        }

        acc.status = acc.status === 'available' ? 'sold' : 'available';
        acc.updated_at = new Date().toISOString();
        writeJson(FF_ACCOUNTS_FILE, accounts);

        res.json({
            success: true,
            message: 'Account "' + acc.id + '" status changed to ' + acc.status.toUpperCase(),
            new_status: acc.status
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Delete Account (Admin API)
app.post('/api/admin/ff-accounts/delete/:id', (req, res) => {
    try {
        const { id } = req.params;
        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        const idx = accounts.findIndex(a => a.id === id);

        if (idx === -1) {
            return res.status(404).json({ success: false, error: 'Account not found.' });
        }

        const deletedTitle = accounts[idx].title;
        accounts.splice(idx, 1);
        writeJson(FF_ACCOUNTS_FILE, accounts);

        res.json({
            success: true,
            message: 'Free Fire account "' + deletedTitle + '" deleted successfully.'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// HOME BANNERS & SLIDERS REST API
// ============================================================
app.get('/api/admin/sliders', (req, res) => {
    try {
        const sliders = readJson(SLIDERS_FILE, []);
        res.json({ success: true, sliders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/sliders/save', (req, res) => {
    try {
        const { id, title, image, link } = req.body;
        if (!image || !image.trim()) {
            return res.status(400).json({ success: false, error: 'Banner image is required.' });
        }
        const sliders = readJson(SLIDERS_FILE, []);
        let savedBanner = null;

        if (id) {
            const idx = sliders.findIndex(s => String(s.id) === String(id));
            if (idx !== -1) {
                sliders[idx] = {
                    ...sliders[idx],
                    title: title || sliders[idx].title || `Slide ${id}`,
                    image: image.trim(),
                    link: (link || '#').trim()
                };
                savedBanner = sliders[idx];
            } else {
                savedBanner = {
                    id: Number(id) || Date.now(),
                    title: title || 'New Banner',
                    image: image.trim(),
                    link: (link || '#').trim()
                };
                sliders.push(savedBanner);
            }
        } else {
            const newId = sliders.length ? Math.max(...sliders.map(s => Number(s.id) || 0)) + 1 : 1;
            savedBanner = {
                id: newId,
                title: title || `Slide ${newId}`,
                image: image.trim(),
                link: (link || '#').trim()
            };
            sliders.push(savedBanner);
        }

        writeJson(SLIDERS_FILE, sliders);
        res.json({ success: true, message: 'Banner saved successfully!', banner: savedBanner, sliders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/sliders/delete/:id', (req, res) => {
    try {
        const id = req.params.id;
        let sliders = readJson(SLIDERS_FILE, []);
        const initialCount = sliders.length;
        sliders = sliders.filter(s => String(s.id) !== String(id));

        if (sliders.length === initialCount) {
            return res.status(404).json({ success: false, error: 'Banner not found.' });
        }

        writeJson(SLIDERS_FILE, sliders);
        res.json({ success: true, message: 'Banner deleted successfully!', sliders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Categories API
app.get('/api/admin/categories', (req, res) => {
    const categories = readJson(CATEGORIES_FILE, []);
    res.json({ success: true, categories });
});

// Delete Custom Category (Admin)
app.post('/api/admin/category/delete', (req, res) => {
    try {
        const { categoryId } = req.body;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'Category ID is required.' });
        }

        const protectedIds = ['all', 'non-root', 'root', 'accounts', 'i-phone', 'ios', 'pc', 'other', 'pubg', 'demo'];
        if (protectedIds.includes(String(categoryId).toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Cannot delete default system category.' });
        }

        // 1. Remove from CATEGORIES_FILE
        const categories = readJson(CATEGORIES_FILE, []);
        const filteredCategories = categories.filter(c => String(c.id).toLowerCase() !== String(categoryId).toLowerCase());
        fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(filteredCategories, null, 2), 'utf-8');

        // 2. Re-assign any products with this category to 'other'
        const dataProducts = readJson(PRODUCTS_FILE, []);
        let updatedCount = 0;
        dataProducts.forEach(p => {
            if (p.category && String(p.category).toLowerCase() === String(categoryId).toLowerCase()) {
                p.category = 'other';
                p.categoryName = 'OTHER';
                updatedCount++;
            }
        });
        if (updatedCount > 0) {
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(dataProducts, null, 2), 'utf-8');
        }

        // 3. Sync public/products.json if exists
        const pubProdPath = path.join(__dirname, 'public', 'products.json');
        if (fs.existsSync(pubProdPath)) {
            const pubProducts = readJson(pubProdPath, []);
            pubProducts.forEach(p => {
                if (p.category && String(p.category).toLowerCase() === String(categoryId).toLowerCase()) {
                    p.category = 'other';
                    p.categoryName = 'OTHER';
                }
            });
            fs.writeFileSync(pubProdPath, JSON.stringify(pubProducts, null, 4), 'utf-8');
        }

        console.log(`[CATEGORY DELETED] Custom category "${categoryId}" deleted. Reassigned ${updatedCount} products to "other".`);
        return res.json({
            success: true,
            message: `Category "${categoryId}" deleted successfully.`,
            categories: filteredCategories,
            reassignedProducts: updatedCount
        });
    } catch (err) {
        console.error('[CATEGORY DELETE ERROR]', err);
        return res.status(500).json({ success: false, message: 'Server error deleting category.' });
    }
});

// 5. Public Store: Free Fire Accounts Listing Page
app.get('/accounts', (req, res) => {
    try {
        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        const siteSettings = readJson(SETTINGS_FILE, {});
        const activeDiscount = getUserDiscount(req.session.user, siteSettings);

        res.render('accounts', {
            title: 'Free Fire Accounts Store | Buy Safe VIP IDs',
            accounts,
            userDiscount: activeDiscount
        });
    } catch (err) {
        console.error('Error rendering accounts page:', err);
        res.redirect('/');
    }
});

// 6. Public Store: Account Detail & Buy Page
app.get('/account-detail/:id', (req, res) => {
    try {
        const { id } = req.params;
        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        const account = accounts.find(a => a.id.toLowerCase() === id.toLowerCase());

        if (!account) {
            return res.redirect('/accounts');
        }

        const relatedAccounts = accounts.filter(a => a.id !== account.id).slice(0, 4);
        const siteSettings = readJson(SETTINGS_FILE, {});
        const activeDiscount = getUserDiscount(req.session.user, siteSettings);

        res.render('account-detail', {
            title: account.title + ' | Buy Free Fire Account',
            account,
            relatedAccounts,
            userDiscount: activeDiscount
        });
    } catch (err) {
        console.error('Error rendering account detail page:', err);
        res.redirect('/accounts');
    }
});

// 7. Public Store: Submit Account Purchase (Requires Login)
app.post('/accounts/buy', async (req, res) => {
    try {
        if (!req.session.user && !req.session.admin) {
            req.session.loginError = 'ফ্রি ফায়ার একাউন্ট কিনতে অনুগ্রহ করে প্রথমে লগইন করুন।';
            return req.session.save(() => {
                res.redirect('/login');
            });
        }

        const {
            account_id,
            customer_name,
            customer_phone,
            customer_email,
            payment_method,
            transaction_id
        } = req.body || {};

        const accounts = readJson(FF_ACCOUNTS_FILE, []);
        const account = accounts.find(a => a.id === account_id);

        if (!account) {
            return res.status(404).send('Selected Free Fire account does not exist.');
        }

        if (account.status === 'sold') {
            return res.status(400).send('Sorry, this Free Fire account has already been sold.');
        }

        const siteSettings = readJson(SETTINGS_FILE, {});
        const activeDiscount = getUserDiscount(req.session.user, siteSettings);

        let finalPrice = parseFloat(account.price) || 0;
        if (activeDiscount > 0) {
            finalPrice = Math.round(finalPrice * (1 - (activeDiscount / 100)));
        }

        const orders = readJson(ORDERS_FILE, []);
        const newOrderId = 'ORD-FF-' + Math.floor(10000 + Math.random() * 90000);

        const newOrder = {
            id: newOrderId,
            product_id: account.id,
            product_name: 'Free Fire Account - ' + account.title,
            variant: 'Full Access (' + account.server + ' / Lv.' + account.level + ')',
            price: finalPrice,
            original_price: account.price,
            discount_percent: activeDiscount,
            payment_method: payment_method || 'bKash Personal',
            transaction_id: transaction_id || 'PENDING',
            whatsapp: customer_phone || '',
            email: customer_email || (req.session.user ? req.session.user.email : ''),
            customer_name: customer_name || (req.session.user ? req.session.user.name : 'Valued Customer'),
            player_id: account.uid || 'N/A',
            license_key: account.credentials ? '(Credentials ready: see admin or WhatsApp)' : 'Pending Admin Verification',
            account_id: account.id,
            is_ff_account: true,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        orders.unshift(newOrder);
        writeJson(ORDERS_FILE, orders);

        // Mark account as pending / sold to avoid double purchase
        account.status = 'sold';
        account.sold_at = new Date().toISOString();
        writeJson(FF_ACCOUNTS_FILE, accounts);

        // Send Email Notification to Admin if configured
        sendOrderNotificationEmail(newOrder, siteSettings).catch(err => {
            console.error('Email notify failed for FF account order:', err.message);
        });

        // Fire Discord Notification strictly to Locked Channel 1566503959336718367
        sendDiscordOrderAlert(newOrder).catch(err => {
            console.error('[DISCORD FF ORDER ERROR]', err);
        });

        res.redirect('/order-success/' + newOrderId);
    } catch (err) {
        console.error('Error processing FF account order:', err);
        res.status(500).send('Error processing order: ' + err.message);
    }
});

// Admin Classic Dashboard Fallback
app.get('/admin/classic', requireAdmin, (req, res) => {
    const products = readJson(PRODUCTS_FILE, []).map(hydrateProduct);
    const orders = readJson(ORDERS_FILE, []);
    const sliders = readJson(SLIDERS_FILE, []);
    const categories = readJson(CATEGORIES_FILE, []);
    const keys = readJson(KEYS_FILE, []);

    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        user: req.session.adminUser || { name: 'Super Admin', email: 'tgsgaming2024@gmail.com' },
        products,
        orders,
        sliders,
        categories,
        keys,
        successMessage: req.session.adminSuccess || null,
        errorMessage: req.session.adminError || null
    });
    req.session.adminSuccess = null;
    req.session.adminError = null;
});

// Add Product (Supports both direct image upload and image URL/path)
app.post('/admin/products/add', requireAdmin, uploadProductImage.single('image_file'), (req, res) => {
    const { title, category, price, discount, is_maintenance, image, setup_url, apk_url, feedback_url, maintenance_message, supported_phones, description, duration_options } = req.body;
    const products = readJson(PRODUCTS_FILE, []);

    let imagePath = '/uploads/media/203/01M1S8RJ1CTP1MQHG8AA5QYEJA.jpg';
    if (req.file) {
        imagePath = '/uploads/products/' + req.file.filename;
    } else if (image && image.trim()) {
        imagePath = image.trim();
    }

    const cleanTitle = (title || 'New Game Panel').trim();
    const newSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newId = products.length ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;
    const safeCategory = category || 'non-root';
    const itemDurationOptions = parseDurationOptions(duration_options, {
        title: cleanTitle,
        category: safeCategory,
        price: parseInt(price) || 50
    });

    const newProduct = {
        id: newId,
        title: cleanTitle,
        slug: newSlug || `product-${newId}`,
        category: safeCategory,
        image: imagePath,
        price: parseInt(price) || 50,
        discount: discount || '',
        is_maintenance: is_maintenance === '1' || is_maintenance === true,
        setup_url: setup_url || '',
        apk_url: apk_url || '',
        feedback_url: feedback_url || '',
        maintenance_message: maintenance_message || '',
        description: description || `High performance gaming panel for ${cleanTitle}. Safe and 24/7 delivery.`,
        stock: 999,
        in_stock: true,
        supported_phones: supported_phones || '',
        duration_options: serializeDurationOptions(itemDurationOptions)
    };

    products.unshift(newProduct);
    writeJson(PRODUCTS_FILE, products);

    req.session.adminSuccess = `Product "${cleanTitle}" created successfully! It is now live on the store.`;
    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Edit Product (Supports image replacement via file upload or URL)
app.post('/admin/products/edit/:id', requireAdmin, uploadProductImage.single('image_file'), (req, res) => {
    const id = parseInt(req.params.id);
    const { title, category, price, discount, is_maintenance, image, setup_url, apk_url, feedback_url, maintenance_message, supported_phones, description, duration_options } = req.body;
    const products = readJson(PRODUCTS_FILE, []);

    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
        const safeCategory = category || products[idx].category || 'non-root';
        products[idx].title = title ? title.trim() : products[idx].title;
        products[idx].category = safeCategory;
        products[idx].price = parseInt(price) || products[idx].price;
        products[idx].discount = discount !== undefined ? discount : products[idx].discount;
        products[idx].is_maintenance = is_maintenance === '1' || is_maintenance === true;
        
        if (req.file) {
            products[idx].image = '/uploads/products/' + req.file.filename;
        } else if (image && image.trim()) {
            products[idx].image = image.trim();
        }

        products[idx].setup_url = setup_url !== undefined ? setup_url : products[idx].setup_url;
        products[idx].apk_url = apk_url !== undefined ? apk_url : products[idx].apk_url;
        products[idx].feedback_url = feedback_url !== undefined ? feedback_url : products[idx].feedback_url;
        products[idx].maintenance_message = maintenance_message !== undefined ? maintenance_message : products[idx].maintenance_message;
        if (description) {
            products[idx].description = description;
        }
        if (supported_phones !== undefined) {
            products[idx].supported_phones = supported_phones;
        }
        if (duration_options !== undefined) {
            products[idx].duration_options = serializeDurationOptions(parseDurationOptions(duration_options, {
                title: products[idx].title,
                category: safeCategory,
                id: products[idx].id,
                slug: products[idx].slug,
                price: products[idx].price
            }));
        }

        writeJson(PRODUCTS_FILE, products);
        req.session.adminSuccess = `Product "${products[idx].title}" updated successfully!`;
    }

    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Delete Product
app.post('/admin/products/delete/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    let products = readJson(PRODUCTS_FILE, []);
    products = products.filter(p => p.id !== id);
    writeJson(PRODUCTS_FILE, products);

    req.session.adminSuccess = 'Product deleted successfully!';
    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Toggle Maintenance Status
app.post('/admin/products/toggle-maintenance/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const products = readJson(PRODUCTS_FILE, []);

    const prod = products.find(p => p.id === id);
    if (prod) {
        prod.is_maintenance = !prod.is_maintenance;
        writeJson(PRODUCTS_FILE, products);
        req.session.adminSuccess = `Status updated for "${prod.title}"!`;
    }

    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Update Order Status
app.post('/admin/orders/status/:id', requireAdmin, (req, res) => {
    const { status } = req.body;
    const orders = readJson(ORDERS_FILE, []);

    const order = orders.find(o => o.id === req.params.id);
    if (order) {
        order.status = status;
        writeJson(ORDERS_FILE, orders);
        req.session.adminSuccess = `Order ${order.id} status set to ${status}.`;
    }

    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Add Slider
app.post('/admin/sliders/add', requireAdmin, (req, res) => {
    const { title, image, link } = req.body;
    const sliders = readJson(SLIDERS_FILE, []);

    const newId = sliders.length ? Math.max(...sliders.map(s => s.id || 0)) + 1 : 1;
    sliders.push({
        id: newId,
        title: title || `Slide ${newId}`,
        image: image || '/uploads/media/229/01M4S90187Y7K0RG8V7G62ZMN0.png',
        link: link || '#'
    });

    writeJson(SLIDERS_FILE, sliders);
    req.session.adminSuccess = 'Hero banner added successfully!';
    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Delete Slider
app.post('/admin/sliders/delete/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    let sliders = readJson(SLIDERS_FILE, []);
    sliders = sliders.filter(s => s.id !== id);
    writeJson(SLIDERS_FILE, sliders);

    req.session.adminSuccess = 'Banner removed!';
    req.session.save(() => {
        res.redirect('/admin');
    });
});

// -------------------------------------------------------------
// PRODUCT KEY MANAGEMENT ROUTES
// -------------------------------------------------------------

// Add Single Product Key
app.post('/admin/keys/add', requireAdmin, (req, res) => {
    const { product_id, variant, license_key, notes } = req.body;
    if (!license_key || !license_key.trim()) {
        req.session.adminError = 'License Key string is required.';
        return req.session.save(() => res.redirect('/admin#keys'));
    }

    const products = readJson(PRODUCTS_FILE, []);
    const keys = readJson(KEYS_FILE, []);
    const prod = products.find(p => p.id === parseInt(product_id));

    const newKey = {
        id: 'KEY-' + Math.floor(1000 + Math.random() * 9000),
        product_id: prod ? prod.id : parseInt(product_id) || 1,
        product_title: prod ? prod.title : 'Game Panel',
        variant: variant || '1 Day Key',
        license_key: license_key.trim(),
        status: 'available',
        assigned_order_id: null,
        assigned_to: null,
        created_at: new Date().toISOString(),
        used_at: null,
        notes: notes ? notes.trim() : ''
    };

    keys.unshift(newKey);
    writeJson(KEYS_FILE, keys);

    req.session.adminSuccess = `Key "${newKey.license_key}" added to inventory for ${newKey.product_title} (${newKey.variant})!`;
    req.session.save(() => {
        res.redirect('/admin#keys');
    });
});

// Bulk Add Product Keys
app.post('/admin/keys/bulk-add', requireAdmin, (req, res) => {
    const { product_id, variant, bulk_keys, notes } = req.body;
    if (!bulk_keys || !bulk_keys.trim()) {
        req.session.adminError = 'Please paste at least one license key.';
        return req.session.save(() => res.redirect('/admin#keys'));
    }

    const products = readJson(PRODUCTS_FILE, []);
    const keys = readJson(KEYS_FILE, []);
    const prod = products.find(p => p.id === parseInt(product_id));
    const prodTitle = prod ? prod.title : 'Game Panel';
    const prodIdNum = prod ? prod.id : parseInt(product_id) || 1;

    // Parse keys line-by-line
    const rawKeys = bulk_keys.split(/[\r\n]+/).map(k => k.trim()).filter(k => k.length > 0);
    let addedCount = 0;

    rawKeys.forEach(kStr => {
        keys.unshift({
            id: 'KEY-' + Math.floor(1000 + Math.random() * 9000),
            product_id: prodIdNum,
            product_title: prodTitle,
            variant: variant || '1 Day Key',
            license_key: kStr,
            status: 'available',
            assigned_order_id: null,
            assigned_to: null,
            created_at: new Date().toISOString(),
            used_at: null,
            notes: notes ? notes.trim() : 'Bulk Import'
        });
        addedCount++;
    });

    writeJson(KEYS_FILE, keys);

    req.session.adminSuccess = `Successfully added ${addedCount} product keys for ${prodTitle} (${variant})!`;
    req.session.save(() => {
        res.redirect('/admin#keys');
    });
});

// Edit Product Key
app.post('/admin/keys/edit/:id', requireAdmin, (req, res) => {
    const keyId = req.params.id;
    const { product_id, variant, license_key, status, assigned_order_id, assigned_to, notes } = req.body;

    const products = readJson(PRODUCTS_FILE, []);
    const keys = readJson(KEYS_FILE, []);
    const keyIndex = keys.findIndex(k => k.id === keyId);

    if (keyIndex !== -1) {
        const prod = products.find(p => p.id === parseInt(product_id));
        if (prod) {
            keys[keyIndex].product_id = prod.id;
            keys[keyIndex].product_title = prod.title;
        }
        if (variant) keys[keyIndex].variant = variant;
        if (license_key) keys[keyIndex].license_key = license_key.trim();
        if (status) keys[keyIndex].status = status;
        if (assigned_order_id !== undefined) keys[keyIndex].assigned_order_id = assigned_order_id.trim() || null;
        if (assigned_to !== undefined) keys[keyIndex].assigned_to = assigned_to.trim() || null;
        if (notes !== undefined) keys[keyIndex].notes = notes.trim();

        if (status === 'used' && !keys[keyIndex].used_at) {
            keys[keyIndex].used_at = new Date().toISOString();
        } else if (status === 'available') {
            keys[keyIndex].used_at = null;
            keys[keyIndex].assigned_order_id = null;
            keys[keyIndex].assigned_to = null;
        }

        writeJson(KEYS_FILE, keys);
        req.session.adminSuccess = `Product Key ${keyId} updated successfully!`;
    }

    req.session.save(() => {
        res.redirect('/admin#keys');
    });
});

// Delete Product Key
app.post('/admin/keys/delete/:id', requireAdmin, (req, res) => {
    const keyId = req.params.id;
    let keys = readJson(KEYS_FILE, []);
    keys = keys.filter(k => k.id !== keyId);
    writeJson(KEYS_FILE, keys);

    req.session.adminSuccess = `Product Key ${keyId} deleted from inventory.`;
    req.session.save(() => {
        res.redirect('/admin#keys');
    });
});

// Toggle Key Status (Available <-> Used)
app.post('/admin/keys/toggle-status/:id', requireAdmin, (req, res) => {
    const keyId = req.params.id;
    const keys = readJson(KEYS_FILE, []);
    const key = keys.find(k => k.id === keyId);

    if (key) {
        if (key.status === 'available') {
            key.status = 'used';
            key.used_at = new Date().toISOString();
        } else {
            key.status = 'available';
            key.used_at = null;
            key.assigned_order_id = null;
            key.assigned_to = null;
        }
        writeJson(KEYS_FILE, keys);
        req.session.adminSuccess = `Key ${key.id} status changed to ${key.status.toUpperCase()}.`;
    }

    req.session.save(() => {
        res.redirect('/admin#keys');
    });
});

// Assign Key to Order
app.post('/admin/orders/assign-key/:id', requireAdmin, (req, res) => {
    const orderId = req.params.id;
    const { key_input, selected_key_id } = req.body;

    const orders = readJson(ORDERS_FILE, []);
    const keys = readJson(KEYS_FILE, []);
    const order = orders.find(o => o.id === orderId);

    if (order) {
        let finalKey = null;

        if (selected_key_id && selected_key_id.trim()) {
            const matchedKey = keys.find(k => k.id === selected_key_id.trim());
            if (matchedKey) {
                matchedKey.status = 'used';
                matchedKey.assigned_order_id = order.id;
                matchedKey.assigned_to = order.player_id || order.whatsapp || 'Customer';
                matchedKey.used_at = new Date().toISOString();
                finalKey = matchedKey.license_key;
            }
        }

        if (!finalKey && key_input && key_input.trim()) {
            finalKey = key_input.trim();
            // Also check if this exact key string exists in keys.json
            const existingKey = keys.find(k => k.license_key === finalKey);
            if (existingKey) {
                existingKey.status = 'used';
                existingKey.assigned_order_id = order.id;
                existingKey.assigned_to = order.player_id || order.whatsapp || 'Customer';
                existingKey.used_at = new Date().toISOString();
            } else {
                // Register it in keys.json
                keys.unshift({
                    id: 'KEY-' + Math.floor(1000 + Math.random() * 9000),
                    product_id: order.product_id || 1,
                    product_title: order.product_name,
                    variant: order.variant || '1 Day Key',
                    license_key: finalKey,
                    status: 'used',
                    assigned_order_id: order.id,
                    assigned_to: order.player_id || order.whatsapp || 'Customer',
                    created_at: new Date().toISOString(),
                    used_at: new Date().toISOString(),
                    notes: `Manually assigned to Order ${order.id}`
                });
            }
        }

        if (finalKey) {
            order.license_key = finalKey;
            writeJson(ORDERS_FILE, orders);
            writeJson(KEYS_FILE, keys);
            req.session.adminSuccess = `Key "${finalKey}" assigned to Order ${order.id}!`;
        }
    }

    req.session.save(() => {
        res.redirect('/admin#orders');
    });
});

// Update Site Settings
app.post('/admin/settings', requireAdmin, (req, res) => {
    const {
        site_name,
        notice_marquee,
        whatsapp,
        whatsapp_number,
        payment_number,
        telegram,
        youtube,
        telegram_feedback,
        admin_email,
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_pass,
        whatsapp_auto_redirect
    } = req.body;

    const settings = readJson(SETTINGS_FILE, {});

    settings.site_name = site_name || settings.site_name;
    settings.notice_marquee = notice_marquee !== undefined ? notice_marquee : settings.notice_marquee;
    const waNormalized = getCleanWhatsApp(whatsapp_number || whatsapp || settings.whatsapp_number || '01727400370');
    settings.whatsapp = waNormalized.url;
    settings.whatsapp_number = waNormalized.number;
    settings.whatsapp_intl = waNormalized.intl;
    settings.payment_number = payment_number || settings.payment_number || '01700878400';
    settings.telegram = telegram !== undefined ? telegram : settings.telegram;
    settings.youtube = youtube !== undefined ? youtube : settings.youtube;
    settings.telegram_feedback = telegram_feedback !== undefined ? telegram_feedback : settings.telegram_feedback;

    // Email & Gmail SMTP Notification settings
    settings.admin_email = admin_email || settings.admin_email || 'tgsgaming2024@gmail.com';
    settings.smtp_host = smtp_host || settings.smtp_host || 'smtp.gmail.com';
    settings.smtp_port = parseInt(smtp_port) || settings.smtp_port || 465;
    settings.smtp_user = smtp_user !== undefined ? smtp_user.trim() : settings.smtp_user;
    if (smtp_pass && smtp_pass.trim()) {
        settings.smtp_pass = smtp_pass.trim().replace(/\s+/g, ''); // strip spaces from App Password
    }
    settings.whatsapp_auto_redirect = whatsapp_auto_redirect === '1' || whatsapp_auto_redirect === true;

    writeJson(SETTINGS_FILE, settings);
    req.session.adminSuccess = 'Site, payment, and Gmail notification settings saved successfully!';
    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Test Gmail SMTP Notification
app.post('/admin/settings/test-email', requireAdmin, async (req, res) => {
    const settings = readJson(SETTINGS_FILE, {});
    const targetEmail = settings.admin_email || 'tgsgaming2024@gmail.com';

    const testOrder = {
        id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        product_name: 'TEST PRODUCT (SMTP Notification Check)',
        variant: '7 Days Key',
        price: 105,
        payment_method: 'bKash',
        transaction_id: 'TEST_TRX_99999',
        player_id: '9988776655',
        whatsapp: settings.whatsapp_number || '01727400370'
    };

    const result = await sendOrderNotificationEmail(testOrder, settings);
    if (result.success) {
        req.session.adminSuccess = `✅ Test notification email successfully delivered to ${targetEmail}! Please check your Gmail Inbox & Spam folder.`;
    } else {
        req.session.adminError = `❌ Email failed to send: ${result.error || result.message}. Please verify your Gmail address and 16-character App Password.`;
    }

    req.session.save(() => {
        res.redirect('/admin');
    });
});

// Test Discord Bot Notification (Strict Channel Lock: 1566503959336718367)
app.post('/api/admin/discord/test', async (req, res) => {
    try {
        const result = await sendDiscordNotification({
            title: '🧪 DISCORD BOT TEST • CHANNEL VERIFIED',
            description: `Test alert from **Zero Exception Store**.\n\n**Locked Notification Channel:** <#${LOCKED_DISCORD_CHANNEL_ID}>`,
            color: 0x5865F2,
            fields: [
                { name: '🤖 Bot Name', value: '`ZE PRODUCT`', inline: true },
                { name: '🔒 Channel Restriction', value: `\`${LOCKED_DISCORD_CHANNEL_ID}\` (Hard-locked)`, inline: true },
                { name: '🌐 Server Status', value: '🟢 **Online & Ready to Send Alerts**', inline: true }
            ],
            footerText: `Sent by Admin test action • Channel strictly locked to #${LOCKED_DISCORD_CHANNEL_ID}`
        });

        if (result.success) {
            return res.json({
                success: true,
                message: `✅ Test notification delivered successfully to Discord channel #${LOCKED_DISCORD_CHANNEL_ID}! (Message ID: ${result.messageId})`
            });
        } else {
            return res.status(500).json({
                success: false,
                message: `❌ Failed to send Discord alert: ${JSON.stringify(result.error || result.message)}`
            });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// =========================================================================
// FEATURE 8: DAILY SPIN & WIN API ENDPOINTS
// =========================================================================
app.get('/api/spin/status', (req, res) => {
    const spinCfg = getSpinSettings();
    const currentUser = req.session.user || req.session.adminUser;

    if (!spinCfg.enabled) {
        return res.json({
            enabled: false,
            canSpin: false,
            message: 'Free Spin is currently under maintenance.',
            segments: spinCfg.segments
        });
    }

    if (!currentUser) {
        return res.json({
            enabled: true,
            loggedIn: false,
            canSpin: false,
            spinCredits: 0,
            message: 'Please login to spin and claim daily rewards.',
            segments: spinCfg.segments
        });
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(currentUser.id) || u.email === currentUser.email);
    if (!user) {
        return res.json({ enabled: true, loggedIn: false, canSpin: false, spinCredits: 0, segments: spinCfg.segments });
    }

    const spinCredits = parseInt(user.spin_credits) || 0;
    const canSpin = spinCredits > 0;
    const depositThreshold = parseFloat(spinCfg.deposit_threshold) || 500;
    const spendThreshold = parseFloat(spinCfg.spend_threshold) || 500;
    const depositedProgress = parseFloat(user.deposited_for_spin) || 0;
    const spentProgress = parseFloat(user.spent_for_spin) || 0;

    res.json({
        enabled: true,
        loggedIn: true,
        canSpin,
        spinCredits,
        depositThreshold,
        spendThreshold,
        depositedProgress,
        spentProgress,
        depositRemaining: Math.max(0, depositThreshold - depositedProgress),
        spendRemaining: Math.max(0, spendThreshold - spentProgress),
        walletBalance: user.wallet_balance || 0,
        userName: user.name || 'Member',
        title: spinCfg.title || 'LUCKY SPIN & WIN REWARDS',
        subtitle: spinCfg.subtitle || 'প্রতি ৫০০৳ ডিপোজিট অথবা ৫০০৳ খরচে পাবেন ১টি লাকি স্পিন!',
        segments: spinCfg.segments
    });
});

app.post('/api/spin/play', (req, res) => {
    const spinCfg = getSpinSettings();
    if (!spinCfg.enabled) {
        return res.status(400).json({ success: false, message: 'Free Spin is currently disabled.' });
    }

    const currentUser = req.session.user || req.session.adminUser;
    if (!currentUser) {
        return res.status(401).json({ success: false, message: 'Please login to spin the lucky wheel!' });
    }

    const users = readJson(USERS_FILE, []);
    const uIdx = users.findIndex(u => String(u.id) === String(currentUser.id) || u.email === currentUser.email);
    if (uIdx === -1) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const user = users[uIdx];

    // Check anti-fraud lock
    if (user.fraud_blocked) {
        return res.status(403).json({ success: false, message: 'Your account is currently restricted by security filter.' });
    }

    // Spin credits check (Earned per 500৳ deposit or 500৳ spend)
    const spinCredits = parseInt(user.spin_credits) || 0;
    if (spinCredits <= 0) {
        return res.status(400).json({
            success: false,
            canSpin: false,
            message: 'আপনার কোনো ফ্রি স্পিন টিকিট নেই! প্রতি ৫০০৳ ডিপোজিট অথবা ৫০০৳ খরচে ১টি ফ্রি স্পিন পাবেন।'
        });
    }

    // Deduct 1 spin credit
    user.spin_credits = spinCredits - 1;
    user.last_spin_at = new Date().toISOString();

    // Determine random winning segment according to admin configured weights
    const prize = selectSpinReward(spinCfg.segments);

    let couponCode = null;
    let messageText = '';

    if (prize.type === 'balance' && parseFloat(prize.value) > 0) {
        const addAmount = parseFloat(prize.value);
        user.wallet_balance = (parseFloat(user.wallet_balance || 0) + addAmount);
        messageText = `🎉 অভিনন্দন! আপনি জিতেছেন ${prize.label}! আপনার ওয়ালেটে ${addAmount}৳ ক্রেডিট হয়েছে।`;
    } else if (prize.type === 'coupon' && parseFloat(prize.value) > 0) {
        couponCode = 'SPIN' + prize.value + '-' + Math.floor(1000 + Math.random() * 9000);
        const coupons = readJson(COUPONS_FILE, []);
        coupons.unshift({
            code: couponCode,
            discount_percent: parseFloat(prize.value),
            max_uses: 1,
            used_count: 0,
            active: true,
            created_at: new Date().toISOString(),
            user_email: user.email,
            notes: `Won by ${user.name || user.email} on Lucky Spin & Win`
        });
        writeJson(COUPONS_FILE, coupons);
        messageText = `🎉 অভিনন্দন! আপনি জিতেছেন ${prize.label}! কুপন কোড: ${couponCode} (১ বার ব্যবহারের জন্য)`;
    } else {
        messageText = `Better Luck Next Time! আজকের মতো ভাগ্য সহায় হয়নি। আবার ডিপোজিট বা শপিং করে স্পিন জিতুন!`;
    }

    writeJson(USERS_FILE, users);
    req.session.user = user;

    // Send Discord Celebration Alert for highest wins (10৳ balance or 5% VIP coupon)
    if (parseFloat(prize.value) >= 5) {
        sendDiscordNotification({
            title: '🎁 LUCKY SPIN & WIN • PRIZE WINNER!',
            description: `A member just won on the **Lucky Wheel**!`,
            color: 0xec4899,
            fields: [
                { name: '👤 Lucky Winner', value: `**${user.name || 'Member'}** (${user.email})`, inline: true },
                { name: '🏆 Prize Won', value: `**${prize.label}**`, inline: true },
                { name: '🎟️ Promo/Reward', value: couponCode ? `Code: \`${couponCode}\`` : `Wallet Balance: **+${prize.value}৳**`, inline: false },
                { name: '🎟️ Remaining Spins', value: `**${user.spin_credits}**`, inline: true }
            ],
            footerText: `Spin & Win Engine • Channel locked to #${LOCKED_DISCORD_CHANNEL_ID}`
        }).catch(e => console.error('[SPIN DISCORD ALERT ERROR]', e));
    }

    res.json({
        success: true,
        prizeIndex: prize.index,
        prize,
        couponCode,
        message: messageText,
        newBalance: user.wallet_balance || 0,
        spinCredits: user.spin_credits
    });
});

// Admin Get Spin Settings
app.get('/api/admin/spin/settings', (req, res) => {
    const cfg = getSpinSettings();
    res.json({ success: true, settings: cfg });
});

// Admin Save Spin Settings
app.post('/api/admin/spin/settings', (req, res) => {
    try {
        const { enabled, deposit_threshold, spend_threshold, title, subtitle, segments } = req.body || {};
        const current = getSpinSettings();

        const updated = {
            enabled: enabled !== undefined ? !!enabled : current.enabled,
            deposit_threshold: parseFloat(deposit_threshold) || 500,
            spend_threshold: parseFloat(spend_threshold) || 500,
            title: title || current.title,
            subtitle: subtitle || current.subtitle,
            segments: Array.isArray(segments) && segments.length ? segments : current.segments
        };

        // Ensure indices are 0 to 7
        updated.segments.forEach((s, idx) => {
            s.index = idx;
            s.value = parseFloat(s.value) || 0;
            s.weight = parseFloat(s.weight) || 10;
        });

        writeJson(SPIN_SETTINGS_FILE, updated);

        res.json({
            success: true,
            message: '✅ Free Spin Rewards & Wheel Settings successfully updated!',
            settings: updated
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================================
// ADMIN VIP & MYSTERY BOX MANAGEMENT APIS
// =============================================================

// Admin Get VIP Settings
app.get('/api/admin/vip/settings', (req, res) => {
    const vipSettings = readJson(VIP_SETTINGS_FILE, {
        enabled: true,
        price: 250,
        duration_days: 30,
        discount_percent: 10,
        title: "ZERO VIP PASS",
        perks: []
    });
    const users = readJson(USERS_FILE, []);
    const now = Date.now();
    const activeVipUsers = users.filter(u => u.vip_until && new Date(u.vip_until).getTime() > now).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        vip_until: u.vip_until,
        days_left: Math.ceil((new Date(u.vip_until).getTime() - now) / 86400000)
    }));

    res.json({ success: true, settings: vipSettings, activeVipUsers });
});

// Admin Save VIP Settings
app.post('/api/admin/vip/settings', (req, res) => {
    try {
        const { enabled, price, duration_days, discount_percent, title, perks } = req.body || {};
        const current = readJson(VIP_SETTINGS_FILE, {});
        
        let perkList = current.perks || [];
        if (typeof perks === 'string') {
            perkList = perks.split('\n').map(p => p.trim()).filter(Boolean);
        } else if (Array.isArray(perks)) {
            perkList = perks;
        }

        const updated = {
            enabled: enabled !== undefined ? !!enabled : (current.enabled !== false),
            price: parseFloat(price) || 250,
            duration_days: parseInt(duration_days) || 30,
            discount_percent: parseFloat(discount_percent) || 10,
            title: title ? title.trim() : (current.title || 'ZERO VIP PASS'),
            perks: perkList
        };

        writeJson(VIP_SETTINGS_FILE, updated);
        res.json({ success: true, message: '✅ VIP Settings updated successfully!', settings: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Grant VIP to User
app.post('/api/admin/vip/grant', (req, res) => {
    const { userId, days } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const grantDays = parseInt(days) || 30;
    const now = Date.now();
    const currentVip = (user.vip_until && new Date(user.vip_until).getTime() > now) ? new Date(user.vip_until).getTime() : now;
    user.vip_until = new Date(currentVip + grantDays * 86400000).toISOString();
    writeJson(USERS_FILE, users);

    res.json({ success: true, message: `VIP granted to ${user.name} for ${grantDays} days!` });
});

// Admin Revoke VIP from User
app.post('/api/admin/vip/revoke', (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.vip_until = null;
    writeJson(USERS_FILE, users);

    res.json({ success: true, message: `VIP revoked for ${user.name}!` });
});

// Admin Get Mystery Box Settings
app.get('/api/admin/mystery/settings', (req, res) => {
    const mysterySettings = readJson(MYSTERY_SETTINGS_FILE, {
        enabled: true,
        box_cost: 50,
        title: "CYBER MYSTERY BOX",
        rewards: [],
        recent_drops: []
    });
    res.json({ success: true, settings: mysterySettings });
});

// Admin Save Mystery Box Settings
app.post('/api/admin/mystery/settings', (req, res) => {
    try {
        const { enabled, box_cost, title, rewards } = req.body || {};
        const current = readJson(MYSTERY_SETTINGS_FILE, {});

        let processedRewards = current.rewards || [];
        if (Array.isArray(rewards)) {
            processedRewards = rewards.map((r, i) => ({
                id: r.id || ('rew_' + (i + 1) + '_' + Date.now()),
                name: String(r.name || 'Reward').trim(),
                type: ['wallet', 'key', 'spin'].includes(r.type) ? r.type : 'wallet',
                amount: Number(r.amount) || 0,
                product_name: String(r.product_name || 'Free Fire Non-Root').trim(),
                duration: String(r.duration || '1 Day').trim(),
                chance: Number(r.chance) || 1,
                badge: String(r.badge || 'WIN').trim().toUpperCase(),
                color: String(r.color || '#00f0ff').trim(),
                icon: String(r.icon || 'fa-gift').trim()
            }));
        }

        const updated = {
            enabled: enabled !== undefined ? !!enabled : (current.enabled !== false),
            box_cost: parseFloat(box_cost) || 50,
            title: title ? title.trim() : (current.title || 'CYBER MYSTERY BOX'),
            rewards: processedRewards,
            recent_drops: current.recent_drops || []
        };

        writeJson(MYSTERY_SETTINGS_FILE, updated);
        res.json({ success: true, message: '✅ Cyber Mystery Box settings updated successfully!', settings: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Clear Mystery Drops Log
app.post('/api/admin/mystery/clear-drops', (req, res) => {
    const current = readJson(MYSTERY_SETTINGS_FILE, {});
    current.recent_drops = [];
    writeJson(MYSTERY_SETTINGS_FILE, current);
    res.json({ success: true, message: 'Mystery Box winner logs cleared.' });
});

// Admin unblock fraud user
app.post('/api/admin/users/unblock-fraud', (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.fraud_blocked = false;
    user.fraud_attempts = 0;
    writeJson(USERS_FILE, users);

    res.json({
        success: true,
        message: `Fraud restriction cleared for ${user.name || user.email}! User can now transact normally.`
    });
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
    req.session.admin = false;
    req.session.adminUser = null;
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
});

// =============================================================
// DISCORD REFERRAL & EARN ROUTES (10 Refers -> 10৳ Wallet Reward)
// =============================================================

// 1. Referral Invite Landing Page
app.get('/invite', (req, res) => {
    const ref = (req.query.ref || req.query.r || '').trim();
    if (ref) {
        req.session.ref_by = ref;
        res.cookie('ref_by', ref, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }
    const refCfg = getReferralSettings();
    const discordUrl = refCfg.discord_invite_url || 'https://discord.gg/your-server';

    let referrerName = 'Zero Exception Member';
    if (ref) {
        const cleanRef = String(ref).replace(/^REF-?/i, '');
        const users = readJson(USERS_FILE, []);
        const refUser = users.find(u => String(u.id) === cleanRef || (u.referral_code && u.referral_code.toLowerCase() === ref.toLowerCase()));
        if (refUser && refUser.name) referrerName = refUser.name;
    }

    res.render('invite', {
        title: 'Join Our Discord Community & Claim Rewards',
        refCode: ref,
        referrerName,
        discordUrl,
        settings: refCfg
    });
});

// 2. Member Live Referral Status API
app.get('/api/referrals/my-status', (req, res) => {
    if (!req.session.user && !req.session.adminUser) {
        return res.status(401).json({ success: false, message: 'Please log in' });
    }
    const currentUser = req.session.user || req.session.adminUser;
    const users = readJson(USERS_FILE, []);
    const user = users.find(u => String(u.id) === String(currentUser.id)) || currentUser;

    const refCfg = getReferralSettings();
    const allReferrals = readJson(REFERRALS_FILE, []);
    const myReferrals = allReferrals.filter(r => String(r.referrer_id) === String(user.id));

    const refCode = 'REF' + (user.id || 'MEM');
    const inviteUrl = `${req.protocol}://${req.get('host')}/invite?ref=${refCode}`;

    res.json({
        success: true,
        enabled: refCfg.enabled,
        current: parseInt(user.referral_current) || 0,
        target: parseInt(refCfg.target_count) || 10,
        total: parseInt(user.referral_total) || 0,
        earnings: parseFloat(user.referral_earnings) || 0,
        rewardAmount: parseFloat(refCfg.reward_amount) || 10,
        refCode,
        inviteUrl,
        discordInviteUrl: refCfg.discord_invite_url,
        recentReferrals: myReferrals.slice(0, 15)
    });
});

// 3. User links Discord tag
app.post('/api/referrals/link-discord', (req, res) => {
    if (!req.session.user && !req.session.adminUser) {
        return res.status(401).json({ success: false, message: 'Please log in' });
    }
    const currentUser = req.session.user || req.session.adminUser;
    const discordTag = (req.body.discord_tag || '').trim();
    if (!discordTag) return res.status(400).json({ success: false, message: 'Discord username is required.' });

    const users = readJson(USERS_FILE, []);
    const userIdx = users.findIndex(u => String(u.id) === String(currentUser.id));
    if (userIdx !== -1) {
        users[userIdx].discord_tag = discordTag;
        writeJson(USERS_FILE, users);
        if (req.session.user) req.session.user.discord_tag = discordTag;
    }
    res.json({ success: true, message: `Discord tag ${discordTag} linked successfully!` });
});

// 4. Admin: Get Referral System Data
app.get('/api/admin/referrals/data', (req, res) => {
    const cfg = getReferralSettings();
    const referrals = readJson(REFERRALS_FILE, []);
    const users = readJson(USERS_FILE, []);

    const enhanced = referrals.slice(0, 50).map(r => {
        const u = users.find(usr => String(usr.id) === String(r.referrer_id));
        return {
            ...r,
            referrer_balance: u ? u.wallet_balance : 0,
            referrer_current: u ? u.referral_current : 0
        };
    });

    res.json({
        success: true,
        settings: cfg,
        referrals: enhanced,
        totalReferralsLogged: referrals.length
    });
});

// 5. Admin: Save Referral Settings
app.post('/api/admin/referrals/settings', (req, res) => {
    try {
        const { enabled, target_count, reward_amount, discord_invite_url, title, description } = req.body || {};
        const current = getReferralSettings();

        const updated = {
            enabled: enabled !== undefined ? !!enabled : current.enabled,
            target_count: parseInt(target_count) || 10,
            reward_amount: parseFloat(reward_amount) || 10,
            discord_invite_url: discord_invite_url || current.discord_invite_url,
            title: title || current.title,
            description: description || current.description
        };

        writeJson(REFERRAL_SETTINGS_FILE, updated);
        res.json({ success: true, message: '✅ Referral settings saved successfully!', settings: updated });
    } catch(err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Admin: Manual Credit Referral (e.g. from Discord Bot tracker)
app.post('/api/admin/referrals/manual-credit', (req, res) => {
    try {
        const { user_identifier, count, note } = req.body || {};
        if (!user_identifier) return res.status(400).json({ success: false, message: 'User ID or Email is required.' });

        const addCount = Math.max(1, parseInt(count) || 1);
        const users = readJson(USERS_FILE, []);
        const cleanId = String(user_identifier).trim().toLowerCase();
        const user = users.find(u => String(u.id) === cleanId || (u.email && u.email.toLowerCase() === cleanId));

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        let awardedMilestones = 0;
        for (let i = 0; i < addCount; i++) {
            const fakeReferred = {
                id: 'MANUAL-' + Date.now() + '-' + i,
                name: note ? `Member (${note})` : 'Discord Member',
                email: `discord-${Date.now()}-${i}@community`
            };
            const result = awardReferralCredit(user.id, fakeReferred, 'admin_manual');
            if (result && result.milestoneReached) awardedMilestones++;
        }

        const updatedUsers = readJson(USERS_FILE, []);
        const freshUser = updatedUsers.find(u => String(u.id) === String(user.id));

        res.json({
            success: true,
            message: `Credited ${addCount} referral(s) to ${freshUser.name || freshUser.email}! Current progress: ${freshUser.referral_current || 0}/10. Milestones achieved: ${awardedMilestones}.`,
            user: {
                referral_current: freshUser.referral_current || 0,
                referral_total: freshUser.referral_total || 0,
                wallet_balance: freshUser.wallet_balance || 0
            }
        });
    } catch(err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 404 Fallback
app.use((req, res) => {
    res.status(404).redirect('/');
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Panel Sell Store Server running on port ${PORT}`);
});

// Keep process alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);
