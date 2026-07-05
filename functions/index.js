export default {
  async fetch(request) {
    // 1. 获取原始的请求响应（即拉取您的静态 HTML/图片 资源）
    const response = await fetch(request);
    
    // 2. 创建一个新的 Response 对象，以便我们可以修改响应头
    const newResponse = new Response(response.body, response);
    
    // 解析当前请求的 URL 路径
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ==========================================
    // 步骤 A：注入全局通用响应头 (对应原 /* 规则)
    // ==========================================
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    newResponse.headers.set("Access-Control-Max-Age", "86400");
    newResponse.headers.set("Cache-Control", "max-age=7200"); // 默认的两小时缓存

    // ==========================================
    // 步骤 B：针对特定静态资源目录的强缓存覆盖
    // ==========================================
    const longCachePaths = [
      '/avatar/', 
      '/image/', 
      '/Mobile/', 
      '/PC/', 
      '/pixiv/'
    ];

    // 如果当前请求的路径属于上述任一目录，则覆盖为 1 年强缓存
    const isLongCache = longCachePaths.some(path => pathname.startsWith(path));
    
    if (isLongCache) {
      // .set() 方法会直接覆盖前面设置的 max-age=7200
      newResponse.headers.set("Cache-Control", "max-age=31536000");
    }

    // 3. 将修改好头部的响应返回给客户端
    return newResponse;
  }
}
