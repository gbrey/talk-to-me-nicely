/**
 * Cloudflare Web Analytics
 * 
 * Para usar:
 * 1. Obtén tu token de Cloudflare Web Analytics
 * 2. Agrega la variable de entorno CF_WEB_ANALYTICS_TOKEN en Cloudflare Pages
 * 3. Incluye este script en tus páginas HTML
 */

// El token se puede obtener del servidor o configurarse aquí
// Por ahora, lo obtenemos de una variable de entorno del servidor
// que se puede inyectar en el HTML

/**
 * Inicializa Cloudflare Web Analytics
 * @param {string} token - Token de Cloudflare Web Analytics
 */
export function initCloudflareAnalytics(token) {
  if (!token) {
    console.warn('Cloudflare Web Analytics token not configured');
    return;
  }

  // Cloudflare Web Analytics script
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon', JSON.stringify({
    token: token
  }));
  document.head.appendChild(script);
}

// Auto-inicializar si hay un token disponible
if (typeof window !== 'undefined' && window.CF_WEB_ANALYTICS_TOKEN) {
  initCloudflareAnalytics(window.CF_WEB_ANALYTICS_TOKEN);
}
