const fs = require("fs");
const path = require("path");
// 图床域名配置
const baseUrl = "https://photo.api.kafuchino.top";
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
  "dist"
];

const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
const isVideo = (filename) => /\.(mp4|webm|mov)$/i.test(filename);

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
          url: `${baseUrl}/${relativePath}`,
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

// 3. 生成包含前端路由的 SPA 页面
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>CDN 文件索引</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    h1 { margin-bottom: 0.5rem; }
    
    /* 面包屑导航样式 */
    #breadcrumb { margin-bottom: 2rem; font-size: 1.1rem; color: #555; }
    #breadcrumb a { color: #0066cc; text-decoration: none; }
    #breadcrumb a:hover { text-decoration: underline; }

    ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; list-style: none; padding: 0; }
    li { background: white; padding: 1rem; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); overflow: hidden; word-break: break-all; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between; transition: transform 0.2s; }
    li:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    
    /* 文件夹图标样式 */
    .folder-icon { font-size: 3.5rem; line-height: 1; margin-bottom: 0.8rem; }
    .folder-link { text-decoration: none; color: #333; text-align: center; font-weight: bold; width: 100%; display: block; padding: 20px 0; }
    
    .preview img, .preview video {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: block;
    }
    .preview div {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #333;
      text-align: center;
      flex-grow: 1;
      margin-bottom: 10px;
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
  </style>
</head>
<body>
  <h1>📦 CDN 文件索引</h1>
  <div id="breadcrumb"></div>
  <ul id="gallery"></ul>

  <div class="modal" id="modal">
    <img id="modal-img" src="" alt="预览大图">
  </div>

  <script>
    const fileData = ${fileDataJson};
    
    const gallery = document.getElementById('gallery');
    const breadcrumb = document.getElementById('breadcrumb');
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');

    function renderView(currentPath) {
      gallery.innerHTML = '';
      
      const pathParts = currentPath.split('/').filter(Boolean);
      let breadcrumbHtml = '<a href="#/">🏠 根目录</a>';
      let cumulativePath = '';
      pathParts.forEach(part => {
        cumulativePath += (cumulativePath ? '/' : '') + part;
        breadcrumbHtml += ' / <a href="#/' + cumulativePath + '">' + part + '</a>';
      });
      breadcrumb.innerHTML = breadcrumbHtml;

      const folders = new Set();
      const files = [];

      fileData.forEach(item => {
        const prefix = currentPath ? currentPath + '/' : '';
        if (item.path.startsWith(prefix)) {
          const relativeToCurrent = item.path.substring(prefix.length);
          const subParts = relativeToCurrent.split('/');
          
          if (subParts.length > 1) {
            folders.add(subParts[0]); 
          } else {
            files.push(item);
          }
        }
      });

      folders.forEach(folder => {
        const targetPath = currentPath ? currentPath + '/' + folder : folder;
        gallery.innerHTML += \`
          <li>
            <a href="#/\${targetPath}" class="folder-link">
              <div class="folder-icon">📁</div>
              <div>\${folder}</div>
            </a>
          </li>
        \`;
      });

      files.forEach(file => {
        if (file.type === 'image') {
          gallery.innerHTML += \`
            <li>
              <a href="#" class="preview" data-full="\${file.url}">
                <img src="\${file.url}" alt="\${file.filename}" loading="lazy" />
                <div>\${file.filename}</div>
              </a>
              <button class="copy-btn" data-url="\${file.url}">复制</button>
            </li>\`;
        } else {
          gallery.innerHTML += \`
            <li>
              <a href="\${file.url}" class="preview" target="_blank">
                <video src="\${file.url}" preload="metadata" muted playsinline controls></video>
                <div>\${file.filename}</div>
              </a>
              <button class="copy-btn" data-url="\${file.url}">复制</button>
            </li>\`;
        }
      });
    }

    document.body.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn')) {
        const btn = e.target;
        navigator.clipboard.writeText(btn.dataset.url).then(() => {
          const originalText = btn.textContent;
          btn.textContent = "✅ 已复制";
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
          }, 1500);
        });
        return;
      }

      const previewLink = e.target.closest('.preview[data-full]');
      if (previewLink) {
        e.preventDefault();
        modalImg.src = previewLink.dataset.full;
        modal.style.display = 'flex';
      }
    });

    modal.addEventListener('click', () => {
      modal.style.display = 'none';
      modalImg.src = '';
    });

    window.addEventListener('hashchange', () => {
      const hashPath = decodeURIComponent(window.location.hash.substring(2));
      renderView(hashPath);
    });

    const initialPath = window.location.hash.length > 2 ? decodeURIComponent(window.location.hash.substring(2)) : '';
    renderView(initialPath);
  </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);
console.log("✅ 构建完成：所有静态资源已隔离提取至 dist 目录，索引页生成完毕");