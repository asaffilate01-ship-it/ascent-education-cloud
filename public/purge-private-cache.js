// Remove authenticated responses cached by older releases on shared devices.
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.delete('supabase-api'),caches.delete('images-cache')]));
});
