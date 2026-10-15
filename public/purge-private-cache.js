// Remove authenticated responses cached by older releases on shared devices.
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('supabase-api'));
});
