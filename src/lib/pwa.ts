/**
 * Guarded service-worker registration.
 * Never registers in dev, inside an iframe, or in Lovable preview hosts.
 */
export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const refuse =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    new URL(window.location.href).searchParams.has("sw") ;

  if (refuse) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/sw.js")) void r.unregister();
      });
    });
    return;
  }

  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    /* offline caching is optional */
  });
}
