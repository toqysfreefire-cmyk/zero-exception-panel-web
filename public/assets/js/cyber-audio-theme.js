// cyber-audio-theme.js - Gaming Audio FX & Futuristic Theme Customizer
(function() {
    'use strict';

    // ==========================================
    // 1. THEME COLOR ENGINE
    // ==========================================
    const THEMES = {
        cyan: {
            name: 'Neon Cyan',
            color: '#00f0ff',
            accent: '#00c2cf',
            glow: 'rgba(0, 240, 255, 0.4)',
            rgb: '0, 240, 255'
        },
        green: {
            name: 'Toxic Green',
            color: '#00ff66',
            accent: '#00cc52',
            glow: 'rgba(0, 255, 102, 0.4)',
            rgb: '0, 255, 102'
        },
        pink: {
            name: 'Cyber Pink',
            color: '#ff007f',
            accent: '#e60073',
            glow: 'rgba(255, 0, 127, 0.4)',
            rgb: '255, 0, 127'
        },
        gold: {
            name: 'Royal Gold',
            color: '#f59e0b',
            accent: '#d97706',
            glow: 'rgba(245, 158, 11, 0.4)',
            rgb: '245, 158, 11'
        }
    };

    function applyTheme(themeKey) {
        const t = THEMES[themeKey] || THEMES.cyan;
        const root = document.documentElement;
        root.style.setProperty('--theme-color', t.color);
        root.style.setProperty('--main-accent', t.color);
        root.style.setProperty('--logo-color', t.color);
        root.style.setProperty('--theme-glow', t.glow);
        root.style.setProperty('--theme-rgb', t.rgb);
        localStorage.setItem('cyber_theme', themeKey);
        
        // Update UI indicator dots if present
        document.querySelectorAll('.theme-dot').forEach(el => {
            el.classList.toggle('ring-2', el.getAttribute('data-theme') === themeKey);
            el.classList.toggle('ring-white', el.getAttribute('data-theme') === themeKey);
        });
    }

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('cyber_theme') || 'cyan';
    applyTheme(savedTheme);

    // ==========================================
    // 2. WEB AUDIO API SYNTHESIS (Zero External Files)
    // ==========================================
    let audioCtx = null;
    let sfxEnabled = localStorage.getItem('cyber_sfx') !== 'false';

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    window.playCyberSfx = function(type) {
        if (!sfxEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;

            const now = audioCtx.currentTime;

            if (type === 'click') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'hover') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, now);
                gain.gain.setValueAtTime(0.02, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.025);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.025);
            } else if (type === 'success') {
                // Futuristic 3-chord harmonic sweep
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                    gain.gain.setValueAtTime(0.1, now + idx * 0.07);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now + idx * 0.07);
                    osc.stop(now + idx * 0.07 + 0.25);
                });
            } else if (type === 'mystery') {
                // Ascending tension whoosh
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(950, now + 0.6);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.65);
            }
        } catch (e) {
            // Audio context silently handled
        }
    };

    window.toggleCyberSfx = function() {
        sfxEnabled = !sfxEnabled;
        localStorage.setItem('cyber_sfx', sfxEnabled);
        updateSfxUi();
        if (sfxEnabled) {
            window.playCyberSfx('success');
        }
    };

    window.setCyberTheme = function(themeKey) {
        applyTheme(themeKey);
        window.playCyberSfx('click');
    };

    function updateSfxUi() {
        const icons = document.querySelectorAll('.cyber-sfx-icon');
        icons.forEach(icon => {
            if (sfxEnabled) {
                icon.className = 'fas fa-volume-high cyber-sfx-icon text-cyan-400';
            } else {
                icon.className = 'fas fa-volume-xmark cyber-sfx-icon text-slate-500';
            }
        });
    }

    // Attach click audio to buttons and interactive cards
    document.addEventListener('DOMContentLoaded', () => {
        updateSfxUi();

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, .btn, .btn-glass-login, .header-wallet-btn, .product-item, a[href]');
            if (btn && !btn.closest('#cyberThemeMenu')) {
                window.playCyberSfx('click');
            }
        }, { passive: true });
    });

})();
