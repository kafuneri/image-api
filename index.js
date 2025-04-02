const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();

const ALLOW_RAW_OUTPUT = false;

// 检测移动设备
function isMobile(ua) {
    return /mobile|android|iphone|ipod|ipad|windows phone/i.test(ua);
}

// 加载 CSV 文件
function loadCSV(csvFile) {
    const paths = [
        path.join(__dirname, csvFile),
        path.join(__dirname, '../' + csvFile)
    ];
    
    for (const p of paths) {
        try {
            const data = fs.readFileSync(p, 'utf8');
            return data.split(/\r?\n/).filter(line => line.trim());
        } catch (e) {
            continue;
        }
    }
    return null;
}

app.get('/', async (req, res) => {
    try {
        // 确定 CSV 文件名
        const ua = req.headers['user-agent'] || '';
        const csvFile = isMobile(ua) ? 'moburl.csv' : 'url.csv';
        
        // 加载图片数组
        let imgsArray = loadCSV(csvFile) || [];
        if (imgsArray.length === 0) {
            try {
                const remoteCSV = await axios.get(`http://${req.headers.host}/${csvFile}`);
                imgsArray = remoteCSV.data.split(/\r?\n/).filter(line => line.trim());
            } catch (e) {
                imgsArray = ['https://http.cat/503'];
            }
        }

        // 处理 ID 参数
        let id;
        if (req.query.id && /^\d+$/.test(req.query.id)) {
            id = parseInt(req.query.id);
            if (id >= imgsArray.length || id < 0) {
                id = Math.floor(Math.random() * imgsArray.length);
            } else {
                res.set('Cache-Control', 'public, max-age=86400');
            }
        } else {
            res.set('Cache-Control', 'no-cache');
            id = Math.floor(Math.random() * imgsArray.length);
        }

        // 处理不同输出类型
        if (req.query.json) {
            res.set('Access-Control-Allow-Origin', '*');
            return res.json({ id, url: imgsArray[id] });
        }

        if (req.query.raw) {
            if (!ALLOW_RAW_OUTPUT) return res.status(403).send('Forbidden');
            
            try {
                const image = await axios.get(imgsArray[id], { 
                    responseType: 'stream' 
                });
                res.set('Content-Type', image.headers['content-type']);
                image.data.pipe(res);
            } catch (e) {
                return res.redirect(imgsArray[id]);
            }
            return;
        }

        res.set('Referrer-Policy', 'no-referrer');
        res.redirect(imgsArray[id]);
    } catch (e) {
        res.status(500).send('Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
