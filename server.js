var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = 8765;
var HOST = '127.0.0.1';

var mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

var server = http.createServer(function(req, res) {
  var urlPath = req.url === '/' ? 'index.html' : req.url.substring(1);
  var filePath = path.join(__dirname, urlPath);
  
  // 安全检测
  if (filePath.indexOf(__dirname) !== 0) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  var ext = path.extname(filePath);
  var contentType = mime[ext] || 'text/plain';
  
  try {
    var data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
    console.log('[200] ' + req.url);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
    console.log('[404] ' + req.url);
  }
});

server.listen(PORT, HOST, function() {
  console.log('Server running at http://' + HOST + ':' + PORT + '/');
});

// 保持进程运行
setInterval(function() {}, 60000);
