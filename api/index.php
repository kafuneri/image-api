<?php
const ALLOW_RAW_OUTPUT = false;
// 是否开启 ?raw 选项，可能会消耗服务器较多流量

function has_query($query) {
    return isset($_GET[$query]);
}

function is_mobile() {
    // 简单的 User-Agent 检测方法
    return preg_match('/mobile|android|iphone|ipod|ipad|windows phone/i', $_SERVER['HTTP_USER_AGENT']);
}

// 根据设备类型选择不同的 CSV 文件
if (is_mobile()) {
    $csv_file = 'moburl.csv';  // 手机壁纸
} else {
    $csv_file = 'url.csv';     // 电脑壁纸
}

// 加载 CSV 文件
if (file_exists(__DIR__ . '/' . $csv_file)) // in the same folder
    $imgs_array = file(__DIR__ . '/' . $csv_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
else if (file_exists('../' . $csv_file))    // in the parent folder
    $imgs_array = file('../' . $csv_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
else                                        // for vercel runtime or if the file does not exist
    $imgs_array = file('http://' . $_SERVER['HTTP_HOST'] . '/' . $csv_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

// 如果 CSV 文件没有加载到任何 URL，则使用备用图片
if (count($imgs_array) == 0) $imgs_array = array('https://http.cat/503');

$id = has_query('id') ? $_GET['id'] : "";
if (strlen($id) > 0 && is_numeric($id)) {
    settype($id, 'int');
    $len = count($imgs_array);
    if ($id >= $len || $id < 0) {
        $id = array_rand($imgs_array);
    } else {
        header('Cache-Control: public, max-age=86400');
    }
} else {
    header('Cache-Control: no-cache');
    $id = array_rand($imgs_array);
}

if (has_query('json')) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    echo json_encode(array('id' => $id, 'url' => $imgs_array[$id]));
} else if (has_query('raw')) {
    if (!ALLOW_RAW_OUTPUT) {
        header('HTTP/1.1 403 Forbidden');
        exit();
    }
    header('Content-Type: image/png');
    echo file_get_contents($imgs_array[$id]);
} else {
    header('Referrer-Policy: no-referrer');
    header('Location: ' . $imgs_array[$id]);
}

exit();
