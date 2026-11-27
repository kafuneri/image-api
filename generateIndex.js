const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const outputFile = path.join(distDir, "index.html");

// 黑名单配置：
const ignoreList = [
  ".git", 
  ".edgeone", 
  "node_modules", 
  "generateIndex.js", 
  "package.json", 
  "package-lock.json", 
  "index.html",
  ".gitignore",
  "edgeone.json",
  "dist", 
  "esa.jsonc", 
  "functions"
];

const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i.test(filename);
const isVideo = (filename) => /\.(mp4|webm|mov)$/i.test(filename);

// 提取数据数组存放容器
let virtualFileSystem = [];

// 1. 初始化构建目录 (每次构建前清空旧的 dist 目录)
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. 递归白名单文件并拷贝至 dist 目录
function processDirectory(currentDir, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = fs.readdirSync(currentDir);
  files.forEach((file) => {
    // 仅在根目录级别拦截黑名单文件
    if (currentDir === rootDir && ignoreList.includes(file)) {
      return;
    }

    const srcPath = path.join(currentDir, file);
    const destPath = path.join(targetDir, file);
    const stat = fs.statSync(srcPath);

    // 获取相对路径用于生成 URL 数据
    const relativePath = path.relative(rootDir, srcPath).replace(/\\/g, "/");

    if (stat.isDirectory()) {
      // 递归处理子文件夹
      processDirectory(srcPath, destPath);
    } else {
      // 物理拷贝非黑名单文件至 dist
      fs.copyFileSync(srcPath, destPath);

      // 提取媒体文件数据
      if (isImage(relativePath) || isVideo(relativePath)) {
        virtualFileSystem.push({
          path: relativePath,
          url: `/${relativePath}`, // 直接使用根相对路径
          type: isImage(relativePath) ? 'image' : 'video',
          filename: file
        });
      }
    }
  });
}

// 执行目录拷贝与数据提取
processDirectory(rootDir, distDir);
const fileDataJson = JSON.stringify(virtualFileSystem);

// 3. 生成包含高性能无限滚动与真实懒加载的 SPA 页面
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CDN 文件索引</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='50' font-size='48'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E">
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; margin: 0; }
    h1 { margin-bottom: 0.5rem; }
    
    /* 面包屑导航样式 */
    #breadcrumb { margin-bottom: 2rem; font-size: 1.1rem; color: #555; }
    #breadcrumb a { color: #0066cc; text-decoration: none; }
    #breadcrumb a:hover { text-decoration: underline; }

    ul#gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li.gallery-item {
      background: white;
      padding: 1rem;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      overflow: hidden;
      word-break: break-all;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    li.gallery-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    /* 文件夹图标样式 */
    .folder-icon { font-size: 3.5rem; line-height: 1; margin-bottom: 0.8rem; text-align: center; }
    .folder-link {
      text-decoration: none;
      color: #333;
      text-align: center;
      font-weight: bold;
      width: 100%;
      display: block;
      padding: 20px 0;
    }
    .folder-count {
      font-weight: normal;
      color: #888;
      font-size: 0.9rem;
    }
    
    .preview {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      flex-grow: 1;
      cursor: pointer;
    }
    .preview-video {
      cursor: default;
    }
    .preview img, .preview video {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: block;
      background-color: #eee;
    }
    .preview img.lazy-img {
      opacity: 0.3;
      transition: opacity 0.3s ease;
    }
    .preview img.lazy-img.loaded,
    .preview img.lazy-img.error {
      opacity: 1;
    }
    .preview .item-name {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #333;
      text-align: center;
      flex-grow: 1;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .video-link {
      text-decoration: none;
      color: #0066cc;
    }
    .video-link:hover {
      text-decoration: underline;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 99;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      justify-content: center;
      align-items: center;
    }
    .modal img {
      max-width: 90%;
      max-height: 90%;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(255,255,255,0.2);
    }

    .copy-btn {
      padding: 6px 16px;
      font-size: 14px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: background 0.2s ease;
      align-self: center;
      width: 80%;
      max-width: 120px;
    }
    .copy-btn:hover {
      background: #43a047;
    }

    /* 滚动哨兵及加载提示样式 */
    .sentinel-item {
      grid-column: 1 / -1;
      text-align: center;
      padding: 20px 0;
      color: #888;
      font-size: 0.9rem;
      list-style: none;
    }
  </style>
</head>
<body>
  <h1>📦 CDN 文件索引 <span class="folder-count">(${virtualFileSystem.length})</span></h1>
  <div id="breadcrumb"></div>
  <ul id="gallery"></ul>

  <div class="modal" id="modal">
    <img id="modal-img" src="" alt="预览大图">
  </div>

  <script>
    // 注入后端生成的数据集
    const fileData = ${fileDataJson};
    
    const gallery = document.getElementById('gallery');
    const breadcrumb = document.getElementById('breadcrumb');
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');

    const BATCH_SIZE = 36; // 每次追加渲染 36 张卡片，保证首屏零卡顿
    const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'%3E%3Crect width='100%25' height='100%25' fill='%23ebebeb'/%3E%3C/svg%3E";

    let currentFiles = [];
    let renderedCount = 0;

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // 对空格、括号等字符进行 URL 编码，防止复制链接到 Markdown 时语法断裂
    function encodeUrlPath(rawUrl) {
      return encodeURI(rawUrl).replace(/\\(/g, '%28').replace(/\\)/g, '%29');
    }

    function copyTextWithFallback(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise((resolve, reject) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          ok ? resolve() : reject(new Error('execCommand copy failed'));
        } catch (err) {
          document.body.removeChild(textarea);
          reject(err);
        }
      });
    }

    // 1. 媒体资源懒加载器：只在快进入视口 200px 内时才给 src 赋值并请求资源
    const mediaObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.src) {
            el.src = el.dataset.src;
            el.removeAttribute('data-src');
            if (el.tagName === 'IMG') {
              el.onload = () => el.classList.add('loaded');
              el.onerror = () => {
                el.onerror = null;
                el.classList.add('error');
              };
            }
          }
          observer.unobserve(el);
        }
      });
    }, {
      rootMargin: '200px 0px 200px 0px'
    });

    // 2. 滚动哨兵监听器：触底前 300px 自动追加下一批卡片
    const sentinelObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          renderNextBatch();
        }
      });
    }, {
      rootMargin: '300px 0px 300px 0px'
    });

    // 单张卡片 HTML 生成
    function createCardHtml(file) {
      const encodedUrl = escapeHtml(encodeUrlPath(file.url));
      const safeName = escapeHtml(file.filename);
      if (file.type === 'image') {
        return \`
          <li class="gallery-item">
            <a href="#" class="preview" data-full="\${encodedUrl}">
              <img src="\${PLACEHOLDER_SVG}" data-src="\${encodedUrl}" alt="\${safeName}" class="lazy-img" />
              <div class="item-name">\${safeName}</div>
            </a>
            <button class="copy-btn" data-url="\${encodedUrl}">复制</button>
          </li>\`;
      } else {
        return \`
          <li class="gallery-item">
            <div class="preview preview-video">
              <video data-src="\${encodedUrl}" preload="metadata" muted playsinline controls></video>
              <div class="item-name"><a href="\${encodedUrl}" class="video-link" target="_blank" title="新窗口打开">🎬 \${safeName}</a></div>
            </div>
            <button class="copy-btn" data-url="\${encodedUrl}">复制</button>
          </li>\`;
      }
    }

    // 分批渲染逻辑
    function renderNextBatch() {
      // 移除旧的哨兵节点
      const oldSentinel = document.getElementById('sentinel');
      if (oldSentinel) {
        sentinelObserver.unobserve(oldSentinel);
        oldSentinel.remove();
      }

      if (renderedCount >= currentFiles.length) {
        if (currentFiles.length > BATCH_SIZE) {
          gallery.insertAdjacentHTML('beforeend', \`<li class="sentinel-item">🎉 已加载全部资源 (\${currentFiles.length} 项)</li>\`);
        }
        return;
      }

      const nextBatch = currentFiles.slice(renderedCount, renderedCount + BATCH_SIZE);
      const batchHtml = nextBatch.map(createCardHtml).join('');
      gallery.insertAdjacentHTML('beforeend', batchHtml);

      // 对新增的图片/视频注册懒加载监听
      const newItems = gallery.querySelectorAll('img.lazy-img[data-src], video[data-src]');
      newItems.forEach(el => mediaObserver.observe(el));

      renderedCount += nextBatch.length;

      // 如果还有未加载项，追加新哨兵
      if (renderedCount < currentFiles.length) {
        gallery.insertAdjacentHTML('beforeend', '<li id="sentinel" class="sentinel-item">⏳ 正在加载更多...</li>');
        const sentinel = document.getElementById('sentinel');
        if (sentinel) {
          sentinelObserver.observe(sentinel);
        }
      }
    }

    // 核心渲染函数：根据 Hash 路径生成 DOM
    function renderView(currentPath) {
      mediaObserver.disconnect();
      sentinelObserver.disconnect();
      gallery.innerHTML = '';
      renderedCount = 0;

      // 1. 渲染面包屑导航
      const pathParts = currentPath.split('/').filter(Boolean);
      let breadcrumbHtml = '<a href="#/">🏠 根目录</a>';
      let cumulativePath = '';
      pathParts.forEach(part => {
        cumulativePath += (cumulativePath ? '/' : '') + part;
        breadcrumbHtml += ' / <a href="#/' + escapeHtml(encodeUrlPath(cumulativePath)) + '">' + escapeHtml(part) + '</a>';
      });
      breadcrumb.innerHTML = breadcrumbHtml;

      // 2. 解析当前层级下的文件夹（附带文件数量统计）与当前目录文件
      const folderCounts = new Map();
      currentFiles = [];

      fileData.forEach(item => {
        const prefix = currentPath ? currentPath + '/' : '';
        if (item.path.startsWith(prefix)) {
          const relativeToCurrent = item.path.substring(prefix.length);
          const subParts = relativeToCurrent.split('/');
          
          if (subParts.length > 1) {
            const folderName = subParts[0];
            folderCounts.set(folderName, (folderCounts.get(folderName) || 0) + 1);
          } else {
            currentFiles.push(item);
          }
        }
      });

      // 3. 一次性批量写入文件夹 DOM
      const folderCards = Array.from(folderCounts.entries()).map(([folder, count]) => {
        const targetPath = currentPath ? currentPath + '/' + folder : folder;
        return \`
          <li class="gallery-item">
            <a href="#/\${escapeHtml(encodeUrlPath(targetPath))}" class="folder-link">
              <div class="folder-icon">📁</div>
              <div>\${escapeHtml(folder)} <span class="folder-count">(\${count})</span></div>
            </a>
          </li>
        \`;
      }).join('');
      
      if (folderCards) {
        gallery.innerHTML = folderCards;
      }

      // 4. 开始分批加载文件卡片
      if (currentFiles.length > 0) {
        renderNextBatch();
      }
    }

    function closeModal() {
      modal.style.display = 'none';
      modalImg.src = '';
    }

    // 事件代理：统一监听所有的动态按钮和链接点击
    document.body.addEventListener('click', (e) => {
      // 匹配复制按钮
      if (e.target.classList.contains('copy-btn')) {
        const btn = e.target;
        const absoluteUrl = window.location.origin + btn.dataset.url;
        const originalText = btn.textContent;

        copyTextWithFallback(absoluteUrl).then(() => {
          btn.textContent = "✅ 已复制";
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
          }, 1500);
        }).catch(() => {
          btn.textContent = "❌ 复制失败";
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1500);
        });
        return;
      }

      // 匹配图片预览
      const previewLink = e.target.closest('.preview[data-full]');
      if (previewLink) {
        e.preventDefault();
        modalImg.src = previewLink.dataset.full;
        modal.style.display = 'flex';
      }
    });

    // 点击遮罩或按 Esc 关闭模态框
    modal.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
      }
    });

    function getHashPath() {
      const raw = window.location.hash.replace(/^#\\/?/, '');
      try {
        return decodeURIComponent(raw);
      } catch {
        return '';
      }
    }

    // 监听前端路由变化
    window.addEventListener('hashchange', () => {
      renderView(getHashPath());
    });

    // 页面首次加载渲染
    renderView(getHashPath());
  </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);
console.log("✅ 构建完成：所有静态资源已隔离提取至 dist 目录，索引页生成完毕");
