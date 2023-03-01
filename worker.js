/* global caches clients location fetch globalThis */
var isProduction = true
var cacheName = 'palette'
var pathsToCache = [
    
    '', 'script.js', 'style.css', 
    
    'section/', 'section/page1', 'section/page2', 'section/page3', 
    'feature', 'minimal', 'contact', 'privacy', 
    
    '-/content/section/index.md', '-/content/section/page1.md', '-/content/section/page2.md', '-/content/section/page3.md',
    '-/content/contact.md', '-/content/feature.md', '-/content/index.md', '-/content/minimal.md', '-/content/privacy.md',  

    '-/elements/index.json', 

    '-/image/cover/default.webp', 
    '-/image/icon/192.png', '-/image/icon/192.webp', '-/image/icon/512.png', '-/image/icon/512.webp', 
    '-/image/icon/dark/192.png', '-/image/icon/dark/192.webp', '-/image/icon/dark/512.png', '-/image/icon/dark/512.webp', 
    '-/image/logo/default.webp', '-/image/logo/dark/default.webp', 

    '-/include/head.html', '-/include/index.html', 

    '-/meta/sitetree.json', 

    '-/template/palette.html', 

    '-/palette.json', 

    'manifest.webmanifest'

].map(u => globalThis.location.href.replace('/worker.js', `/${u}`)).concat([
    'https://cdn.jsdelivr.net/gh/cloudouble/element@2.0.0/element.min.js', 
    'https://cdn.jsdelivr.net/gh/cloudouble/live@2.0.0/live.min.js', 
    'https://cdn.jsdelivr.net/npm/jsonata@1.8.5/jsonata.min.js', 
    'https://cdn.jsdelivr.net/npm/marked@4.0.0/marked.min.js', 
    'https://cdn.jsdelivr.net/gh/jeremyfa/yaml.js@0.3.0/dist/yaml.legacy.min.js', 
    'https://cdn.jsdelivr.net/npm/pwacompat@2.0.17', 
    'https://cdn.jsdelivr.net/gh/cloudouble/palette@3.1.7/-/palette.min.js', 
    'https://cdn.jsdelivr.net/gh/cloudouble/palette@3.1.7/-/palette.css'
])

globalThis.addEventListener('install', function (event) {
    event.waitUntil(clients.matchAll({type: 'all', includeUncontrolled: true}).then(function (windowClients) {
        if (isProduction) {
            caches.delete(cacheName)
            caches.open(cacheName).then(function(cache) {
                return cache.addAll(pathsToCache)
            })
        }
    }))
})
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request)
        })
    )
})
globalThis.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim())
    event.waitUntil(clients.matchAll({type: 'all', includeUncontrolled: true}).then(function (windowClients) {
        // service worker active
    }))
})

