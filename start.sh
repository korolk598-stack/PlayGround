#!/usr/bin/env bash
# start.sh — serve the built static Arabic app (sport-time-app -> dist/) in the foreground.
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
PORT="${PORT:-3000}"
export PORT
DIST="$PROJECT_DIR/dist"
SRC="$PROJECT_DIR/sport-time-app"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DEPLOY_JSON="$WEB_DIR/deployment-output.json"
FIXED_JSON="/home/runner/work/_temp/omgithub-web/deployment-output.json"
export DIST_DIR="$DIST"
export PROJECT_DIR DEPLOY_JSON FIXED_JSON

# 1) Prepare directories (worker metadata stays in OPENCODE_WEB_DIR, build stays in PROJECT_DIR).
/usr/bin/time -p mkdir -p "$DIST" "$WEB_DIR"
/usr/bin/time -p test -f "$SRC/index.html"
/usr/bin/time -p test -f "$SRC/app.js"
/usr/bin/time -p test -f "$SRC/style.css"

# 2) Install dependencies / build only when a package project exists (currently pure static).
if [ -f "$PROJECT_DIR/package.json" ]; then
  if [ -f "$PROJECT_DIR/package-lock.json" ]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  if /usr/bin/time -p node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.build?0:1)"; then
    /usr/bin/time -p npm run build
  fi
fi

# 3) Build: copy static sources into dist/ (source + output both inside PROJECT_DIR).
/usr/bin/time -p cp -f "$SRC/index.html" "$DIST/index.html"
/usr/bin/time -p cp -f "$SRC/app.js" "$DIST/app.js"
/usr/bin/time -p cp -f "$SRC/style.css" "$DIST/style.css"
/usr/bin/time -p cp -f "$SRC/manifest.json" "$DIST/manifest.json"
/usr/bin/time -p test -f "$DIST/index.html"

# 4) Publish deployment output for the controller (absolute paths, dist inside PROJECT_DIR).
/usr/bin/time -p node -e "
const fs=require('node:fs');
const out={project:process.env.PROJECT_DIR||process.cwd(),directory:process.env.DIST_DIR};
fs.mkdirSync(require('node:path').dirname(process.env.DEPLOY_JSON),{recursive:true});
fs.writeFileSync(process.env.DEPLOY_JSON,JSON.stringify(out));
if(process.env.FIXED_JSON!==process.env.DEPLOY_JSON){fs.mkdirSync(require('node:path').dirname(process.env.FIXED_JSON),{recursive:true});fs.writeFileSync(process.env.FIXED_JSON,JSON.stringify(out));}
console.log('deployment-output:',JSON.stringify(out));
"
echo "Serving $DIST on port $PORT (project $PROJECT_DIR)"

# 5) Serve dist/ in the foreground.
exec node -e "
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=process.env.DIST_DIR,port=Number(process.env.PORT||3000);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    let p=path.normalize(path.join(root,decodeURIComponent(u.pathname)));
    if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return;}
    let st;try{st=fs.statSync(p);}catch{res.writeHead(404);res.end('Not found');return;}
    if(st.isDirectory())p=path.join(p,'index.html');
    const ext=path.extname(p).toLowerCase();
    res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
    res.setHeader('Cache-Control','no-cache');
    res.end(fs.readFileSync(p));
  }catch{try{res.writeHead(404);res.end('Not found');}catch{}}
});
server.listen(port,'0.0.0.0',()=>console.log('Ready on http://127.0.0.1:'+port));
"
