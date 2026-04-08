// 1. توليد الـ Manifest ديناميكياً
const manifest = {
    "name": "Game Hub Pro",
    "short_name": "GameHub",
    "start_url": window.location.origin + window.location.pathname,
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#0f172a",
    "icons": [{
        "src": "https://cdn-icons-png.flaticon.com/512/5260/5260478.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
    }]
};

const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
const manifestURL = URL.createObjectURL(blob);
const link = document.createElement('link');
link.rel = 'manifest';
link.href = manifestURL;
document.head.appendChild(link);

// 2. تسجيل Service Worker محسن لتجنب أخطاء الـ Blob في بعض المتصفحات
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `
            self.addEventListener('install', (e) => self.skipWaiting());
            self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
            self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => {})));
        `;
        const swBlob = new Blob([swCode], {type: 'text/javascript'});
        const swURL = URL.createObjectURL(swBlob);
        navigator.serviceWorker.register(swURL).catch(err => console.log('SW Stage:', err));
    });
}