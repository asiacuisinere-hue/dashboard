export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests to the main site's functions
    if (url.pathname.startsWith('/api/')) {
      // Re-route to the production function URL
      const newUrl = new URL(url.pathname.replace('/api', ''), 'https://www.asiacuisine.re');
      const newRequest = new Request(newUrl, request);
      return fetch(newRequest);
    }

    // For all other requests, let the static assets be served
    return env.ASSETS.fetch(request);
  }
}
