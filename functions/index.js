async function handleRequest(request) {
  // 1. 拦截 OPTIONS 预检请求并直接返回 204（关键修复）
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  const response = await fetch(request);

  // 2. 补充异常状态拦截（关键修复）
  if (!response.ok) {
    return response;
  }

  const newResponse = new Response(response.body, response);
  const url = new URL(request.url);
  const pathname = url.pathname;

  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  newResponse.headers.set("Access-Control-Max-Age", "86400");
  newResponse.headers.set("Cache-Control", "max-age=7200"); 

  const longCachePaths = ['/avatar/', '/image/', '/Mobile/', '/PC/', '/pixiv/'];
  const isLongCache = longCachePaths.some(path => pathname.startsWith(path));

  if (isLongCache) {
    newResponse.headers.set("Cache-Control", "max-age=31536000");
  }

  return newResponse;
}

export default {
  async fetch(request) {
    return handleRequest(request);
  }
}
