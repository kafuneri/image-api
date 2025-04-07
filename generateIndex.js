const fs = require("fs");
const path = require("path");

const baseUrl = "https://photo.api.kafuchino.top";
const outputFile = "index.html";
const rootDir = process.cwd();
const ignoreList = [".git", ".edgeone", "node_modules", "generateIndex.js", "package.json", "package-lock.json", "index.html"];

const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
const isVideo = (filename) => /\.(mp4|webm|mov)$/i.test(filename);

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filepath).replace(/\\/g, "/");

    if (ignoreList.some(ignored => relativePath.startsWith(ignored))) return;

    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath, relativePath);
    }
  });
}

let html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>CDN 文件索引</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; list-style: none; padding: 0; }
    li { background: white; padding: 1rem; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); overflow: hidden; word-break: break-all; position: relative; display: flex; flex-direction: column; align-items: center; }
    .preview img, .preview video {
      width: 100%;
      max-height: 140px;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .preview div {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #333;
      text-align: center;
    }
    .preview {
      text-decoration: none;
      color: inherit;
      display: block;
      cursor: pointer;
      width: 100%;
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
      margin-top: 10px;
      padding: 6px 16px;
      font-size: 14px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: background 0.2s ease;
    }
    .copy-btn:hover {
      background: #43a047;
    }
  </style>
</head>
<body>
  <h1>📦 CDN 文件索引</h1>
  <ul>
`;

walk(rootDir, (filepath, relativePath) => {
  const url = `${baseUrl}/${relativePath}`;

  if (isImage(relativePath)) {
    html += `
    <li>
      <a href="#" class="preview" data-full="${url}">
        <img src="${url}" alt="${relativePath}" loading="lazy" />
        <div>${relativePath}</div>
      </a>
      <button class="copy-btn" data-url="${url}">复制</button>
    </li>`;
  } else if (isVideo(relativePath)) {
    html += `
    <li>
      <a href="${url}" class="preview" data-full="${url}">
        <video src="${url}" preload="metadata" muted playsinline controls></video>
        <div>${relativePath}</div>
      </a>
      <button class="copy-btn" data-url="${url}">复制</button>
    </li>`;
  }
});

html += `
  </ul>

  <div class="modal" id="modal">
    <img id="modal-img" src="" alt="预览大图">
  </div>

  <script>
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');

    document.querySelectorAll('.preview').forEach(link => {
      const img = link.querySelector('img');
      if (img) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          modalImg.src = link.dataset.full;
          modal.style.display = 'flex';
        });
      }
    });

    modal.addEventListener('click', () => {
      modal.style.display = 'none';
      modalImg.src = '';
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          btn.textContent = "✅ 已复制";
          setTimeout(() => btn.textContent = "复制", 1500);
        });
      });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(outputFile, html);
console.log("✅ 已生成 index.html，含图片和视频的复制按钮，按钮居中美化完成");
