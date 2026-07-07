async function handleRequest(request) {
  // 1. 拦截 OPTIONS 预检请求并直接返回 204
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

  // 2. 异常状态直接放行
  if (!response.ok) {
    return response;
  }

  const newResponse = new Response(response.body, response);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 3. 基础安全与跨域响应头配置
  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  newResponse.headers.set("Access-Control-Max-Age", "86400");
  newResponse.headers.set("Cache-Control", "max-age=7200");

  // 4. 边缘缓存时长策略
  const longCachePaths = ['/avatar/', '/image/', '/Mobile/', '/PC/', '/pixiv/'];
  const isLongCache = longCachePaths.some(path => pathname.startsWith(path));
  if (isLongCache) {
    newResponse.headers.set("Cache-Control", "max-age=31536000");
  }

  // 5. 核心修复：基于后缀名动态修正 Content-Type 和内联展现属性
  const extMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    
    // 常见静态资源 MIME 映射表
    const mimeTypes = {
      'webp': 'image/webp',
      'png':  'image/png',
      'jpg':  'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif':  'image/gif',
      'svg':  'image/svg+xml',
      'mp4':  'video/mp4'
    };

    if (mimeTypes[ext]) {
      // 强行覆盖底层存储返回的错误类型
      newResponse.headers.set("Content-Type", mimeTypes[ext]);
      // 显式指示浏览器内联渲染
      newResponse.headers.set("Content-Disposition", "inline");
    }
  }

  return newResponse;
}

export default {
  async fetch(request) {
    return handleRequest(request);
  }
}
