/* Neon Tetris - app.js
   Vanilla JS, Canvas, mobile-first
*/
(() => {
  'use strict';

  // DOM
  const boardCanvas = document.getElementById('board');
  const holdCanvas = document.getElementById('hold');
  const queueCanvas = document.getElementById('queue');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best-score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const levelDupEl = document.getElementById('level-dup');
  const restartBtn = document.getElementById('restart');
  const shareBtn = document.getElementById('share');
  const gameOverDiv = document.getElementById('game-over');
  const pauseBtn = document.getElementById('pause-button');

  // touch hud buttons
  // touch hud buttons (note: direction/rotate buttons removed for simpler HUD)
  const btnDown = document.getElementById('btn-down');
  const btnDrop = document.getElementById('btn-drop');
  const btnHold = document.getElementById('btn-hold');

  // canvas contexts (set later with DPR transform)
  let ctx, holdCtx, queueCtx;

  // Game constants
  const COLS = 10, ROWS = 20, HIDDEN = 2;
  const COLORS = { I:'#00ffff', O:'#ff4d4d', T:'#8a2be2', S:'#33ff55', Z:'#ffcc00', J:'#3b82f6', L:'#ff8c2a' };
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };

  // SRS-like wallkick data (I vs others)
  const KICKS = {
    I: {
      '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
      '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
      '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
      '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
      '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
      '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
      '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
      '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
    },
    OTH: {
      '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
      '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
      '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
      '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
      '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
      '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
      '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
      '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
    }
  };

  // game state
  let board = [];
  let current = null;
  let nextBag = [];
  let held = null;
  let canHold = true;
  let score = 0, level = 1, lines = 0;
  let dropInterval = 1000; // ms
  let dropCounter = 0, lastTime = 0;
  let running = true;
  let gameOver = false;

  // audio (simple tones)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const aCtx = AudioCtx ? new AudioCtx() : null;
  function tone(freq=440,dur=0.08, type='sine', vol=0.06){
    if(!aCtx) return;
    const o=aCtx.createOscillator(), g=aCtx.createGain(); o.type=type;
    o.frequency.setValueAtTime(freq,aCtx.currentTime);
    g.gain.setValueAtTime(vol,aCtx.currentTime);
    o.connect(g); g.connect(aCtx.destination);
    o.start(); o.stop(aCtx.currentTime+dur);
  }

  // utils: 7-bag randomizer
  function refillBag(){
    const pieces = Object.keys(SHAPES);
    let bag = pieces.slice();
    for(let i=bag.length-1;i>0;i--){
      const r=Math.floor(Math.random()*(i+1)); [bag[i],bag[r]]=[bag[r],bag[i]];
    }
    nextBag.push(...bag);
  }

  // piece abstraction
  class Piece {
    constructor(shape){
      this.shape = shape;
      this.matrix = SHAPES[shape].map(r=>r.slice());
      this.x = Math.floor(COLS/2 - this.matrix[0].length/2);
      this.y = 0;
      this.rot = 0; // 0..3
    }
    rotateCW(){
      const m = this.matrix;
      const n = m[0].map((_,i)=>m.map(r=>r[i]).reverse());
      this.matrix = n;
      this.rot = (this.rot+1)%4;
    }
    rotateCCW(){
      const m = this.matrix;
      const n = m[0].map((_,i)=>m.map(r=>r[i])).reverse();
      this.matrix = n;
      this.rot = (this.rot+3)%4;
    }
  }

  // board helpers
  function resetBoard(){
    board = Array.from({length: ROWS+HIDDEN}, ()=>Array(COLS).fill(0));
  }

  function valid(matrix, x, y){
    for(let r=0;r<matrix.length;r++){
      for(let c=0;c<matrix[r].length;c++){
        if(matrix[r][c]){
          const bx = x+c, by = y+r;
          if(bx<0 || bx>=COLS || by>=ROWS+HIDDEN) return false;
          if(by>=0 && board[by][bx]) return false;
        }
      }
    }
    return true;
  }

  // spawn next piece
  function spawn(){
    if(nextBag.length===0) refillBag();
    const shape = nextBag.shift();
    current = new Piece(shape);
    current.y = -HIDDEN; // start above visible
    canHold = true;
    if(!valid(current.matrix, current.x, current.y)){
      endGame();
    }
  }

  // solidify
  function lockPiece(){
    current.matrix.forEach((row,ry)=> row.forEach((val,cx)=>{
      if(val){
        const bx = current.x + cx, by = current.y + ry;
        if(by>=0 && by<board.length && bx>=0 && bx<COLS) board[by][bx] = current.shape;
      }
    }));
    tone(320,0.06,'triangle',0.06);
    clearLines();
    spawn();
  }

  function clearLines(){
    let cleared = 0;
    for(let r=board.length-1;r>=0;r--){
      if(board[r].every(v=>v!==0)){
        board.splice(r,1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // re-evaluate same index
      }
    }
    if(cleared>0){
      const scoreMap={1:100,2:300,3:500,4:800};
      score += (scoreMap[cleared] || (cleared*200)) * level;
      lines += cleared;
      tone(880,0.12,'triangle',0.08);
      if(lines >= level*10){ level++; dropInterval = Math.max(120, 1000 - (level-1)*80); }
      syncUI();
    }
  }

  // scoring / UI
  function syncUI(){
    scoreEl && (scoreEl.textContent = score);
    bestEl && (bestEl.textContent = localStorageGet('neon_best')||0);
    linesEl && (linesEl.textContent = lines);
    levelEl && (levelEl.textContent = level);
    levelDupEl && (levelDupEl.textContent = level);
    // mirror to other score display if needed
    const dup = document.getElementById('score-dup'); if(dup) dup.textContent = score;
  }

  // local storage helpers
  function localStorageGet(key){ try{return JSON.parse(localStorage.getItem(key));}catch(e){return null}}
  function localStorageSet(key,val){ try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}

  // input: rotation with wallkicks
  function tryRotate(dir){ // dir=1 cw, -1 ccw
    const original = current.matrix.map(r=>r.slice());
    const originalRot = current.rot;
    // perform rotation on a copy
    let rotated;
    if(dir>0){
      rotated = original[0].map((_,i)=>original.map(row=>row[i]).reverse());
    } else {
      rotated = original[0].map((_,i)=>original.map(row=>row[i])).reverse();
    }
    const from = originalRot, to = (originalRot + (dir>0?1:3))%4;
    const kickTable = (current.shape==='I' ? KICKS.I : KICKS.OTH);
    const tests = kickTable[`${from}>${to}`] || [[0,0]];
    for(const [kx,ky] of tests){
      if(valid(rotated, current.x + kx, current.y - ky)){
        current.matrix = rotated;
        current.x += kx;
        current.y -= ky;
        current.rot = to;
        return;
      }
    }
    // else reject
  }

  // ghost piece y
  function ghostY(){
    let gy = current.y;
    while(valid(current.matrix, current.x, gy+1)) gy++;
    return gy;
  }

  // rendering
  let DPR = window.devicePixelRatio || 1;
  function setupCanvas(){
    DPR = window.devicePixelRatio || 1;
    // board CSS size is in style.css; adjust backing store
    const rect = boardCanvas.getBoundingClientRect();
    boardCanvas.width = Math.round(rect.width * DPR);
    boardCanvas.height = Math.round(rect.height * DPR);
    ctx = boardCanvas.getContext('2d');
    ctx.setTransform(DPR,0,0,DPR,0,0);

    // hold
    const hr = holdCanvas.getBoundingClientRect();
    holdCanvas.width = Math.round(hr.width*DPR);
    holdCanvas.height = Math.round(hr.height*DPR);
    holdCtx = holdCanvas.getContext('2d');
    holdCtx.setTransform(DPR,0,0,DPR,0,0);

    // queue
    const qr = queueCanvas.getBoundingClientRect();
    queueCanvas.width = Math.round(qr.width*DPR);
    queueCanvas.height = Math.round(qr.height*DPR);
    queueCtx = queueCanvas.getContext('2d');
    queueCtx.setTransform(DPR,0,0,DPR,0,0);
  }

  function draw(){
    if(!ctx) return;
    // clear
    ctx.clearRect(0,0,boardCanvas.width/DPR,boardCanvas.height/DPR);
    // background grid
    const cellW = (boardCanvas.getBoundingClientRect().width) / COLS;
    const cellH = (boardCanvas.getBoundingClientRect().height) / ROWS;
    const cell = Math.min(cellW,cellH);

    // draw faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for(let x=0;x<=COLS;x++){
      ctx.beginPath(); ctx.moveTo(x*cell,0); ctx.lineTo(x*cell,ROWS*cell); ctx.stroke();
    }
    for(let y=0;y<=ROWS;y++){
      ctx.beginPath(); ctx.moveTo(0,y*cell); ctx.lineTo(COLS*cell,y*cell); ctx.stroke();
    }

    // draw locked blocks
    for(let r=HIDDEN;r<ROWS+HIDDEN;r++){
      for(let c=0;c<COLS;c++){
        const s = board[r][c];
        if(s){
          drawBlock(ctx,c,(r-HIDDEN), cell, COLORS[s], true);
        }
      }
    }

    if(current){
      // ghost
      const gy = ghostY();
      drawPieceAt(ctx, current.matrix, current.x, gy - HIDDEN, cell, 'rgba(255,255,255,0.12)');

      // current piece
      drawPieceAt(ctx, current.matrix, current.x, current.y - HIDDEN, cell, COLORS[current.shape], true, true);
    }

    // draw queue
    drawQueue();

    // draw hold small
    drawHold();

    // optionally other UI
  }

  function drawBlock(ctxRef, col, row, size, color, glow=false){
    ctxRef.save();
    if(glow){
      ctxRef.shadowColor = color; ctxRef.shadowBlur = 12;
    }
    ctxRef.fillStyle = color;
    ctxRef.fillRect(col*size+1, row*size+1, size-2, size-2);
    // inner glossy highlight
    ctxRef.fillStyle = 'rgba(255,255,255,0.06)';
    ctxRef.fillRect(col*size+2, row*size+2, size/2, size/6);
    ctxRef.restore();
  }

  function drawPieceAt(ctxRef, matrix, x, y, size, color, glow=false, pulse=false){
    ctxRef.save();
    for(let r=0;r<matrix.length;r++){
      for(let c=0;c<matrix[r].length;c++){
        if(matrix[r][c]){
          const px = x + c, py = y + r;
          if(py>=0) drawBlock(ctxRef, px, py, size, color, glow);
        }
      }
    }
    ctxRef.restore();
  }

  function drawQueue(){
    if(!queueCtx) return;
    queueCtx.clearRect(0,0,queueCanvas.width/DPR,queueCanvas.height/DPR);
    const visible = Math.min(5, nextBag.length);
    const pad = 10;
    const slotW = (queueCanvas.getBoundingClientRect().width - pad*2) / visible;
    const cell = Math.floor(slotW / 4);
    for(let i=0;i<visible;i++){
      const shape = nextBag[i];
      const matrix = SHAPES[shape];
      const cols = matrix[0].length, rows = matrix.length;
      const startX = pad + i*slotW + Math.floor((slotW - cols*cell)/2);
      const startY = Math.floor((queueCanvas.getBoundingClientRect().height - rows*cell)/2);
      queueCtx.save();
      queueCtx.fillStyle = COLORS[shape];
      queueCtx.shadowColor = COLORS[shape]; queueCtx.shadowBlur = 8;
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        if(matrix[r][c]) queueCtx.fillRect(startX + c*cell, startY + r*cell, cell-2, cell-2);
      }
      queueCtx.restore();
    }
  }

  function drawHold(){
    if(!holdCtx) return;
    holdCtx.clearRect(0,0,holdCanvas.width/DPR, holdCanvas.height/DPR);
    if(!held) return;
    const matrix = SHAPES[held];
    const w = holdCanvas.getBoundingClientRect().width;
    const cell = Math.floor(Math.min(w/4, 20));
    const startX = Math.floor((w - matrix[0].length*cell)/2);
    const startY = Math.floor((holdCanvas.getBoundingClientRect().height - matrix.length*cell)/2);
    holdCtx.save();
    holdCtx.fillStyle = COLORS[held];
    holdCtx.shadowColor = COLORS[held]; holdCtx.shadowBlur = 8;
    for(let r=0;r<matrix.length;r++) for(let c=0;c<matrix[r].length;c++){
      if(matrix[r][c]) holdCtx.fillRect(startX + c*cell, startY + r*cell, cell-2, cell-2);
    }
    holdCtx.restore();
  }

  // actions
  function move(dx){
    if(!current || gameOver) return;
    if(valid(current.matrix, current.x + dx, current.y)) { current.x += dx; draw(); }
  }
  function softDrop(){
    if(!current || gameOver) return;
    if(valid(current.matrix, current.x, current.y+1)) { current.y++; score++; syncUI(); }
    else lockPiece();
    draw();
  }
  function hardDrop(){
    if(!current || gameOver) return;
    let count=0;
    while(valid(current.matrix, current.x, current.y+1)){ current.y++; count++; }
    score += count*2; syncUI();
    lockPiece();
    draw();
  }
  function rotate(dir=1){
    if(!current || gameOver) return;
    tryRotate(dir); draw();
  }
  function hold(){
    if(!current || gameOver || !canHold) return;
    canHold = false;
    if(held){
      const tmp = held; held = current.shape; current = new Piece(tmp);
    } else {
      held = current.shape; spawn();
    }
    draw();
  }

  // keyboard & hud wiring
  function wireInputs(){
    document.addEventListener('keydown', (e)=>{
      if(gameOver) return;
      switch(e.code){
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowUp': rotate(1); break;
        case 'KeyX': rotate(1); break;
        case 'KeyZ': rotate(-1); break;
        case 'ArrowDown': softDrop(); break;
        case 'Space': hardDrop(); break;
        case 'KeyC': hold(); break;
        case 'KeyP': running=!running; if(running) requestAnimationFrame(loop); break;
      }
    });

    // HUD touch
    const bindTouch = (el,fn) => {
      if(!el) return;
      el.addEventListener('touchstart', (ev)=>{ ev.preventDefault(); fn(); }, {passive:false});
      el.addEventListener('mousedown', (ev)=>{ ev.preventDefault(); fn(); });
    };
  // directional movement now uses gestures and keyboard; HUD keeps drop/hold
    bindTouch(btnDown, ()=>softDrop());
    bindTouch(btnDrop, ()=>hardDrop());
    bindTouch(btnHold, ()=>hold());

  // gestures on board: tap to rotate, swipe left/right to move, swipe down soft drop, long press hard drop
    let tstartX=0,tstartY=0,tstartTime=0,longPressTimer=null;
    boardCanvas.addEventListener('touchstart', (e)=>{
      if(e.touches.length>1) return;
      const t=e.touches[0];
      tstartX=t.clientX; tstartY=t.clientY; tstartTime=Date.now();
      longPressTimer = setTimeout(()=>{ hardDrop(); longPressTimer=null; }, 450);
    }, {passive:false});
    boardCanvas.addEventListener('touchmove', (e)=>{
      if(e.touches.length>1) return;
      const t=e.touches[0];
      const dx=t.clientX - tstartX, dy=t.clientY - tstartY;
      if(Math.abs(dx)>30){ if(longPressTimer){clearTimeout(longPressTimer); longPressTimer=null;} if(dx>0){move(1); tstartX=t.clientX;} else {move(-1); tstartX=t.clientX;} }
      if(Math.abs(dy)>40){ if(longPressTimer){clearTimeout(longPressTimer); longPressTimer=null;} if(dy>0){ softDrop(); tstartY=t.clientY; } }
    }, {passive:false});
    boardCanvas.addEventListener('touchend', (e)=>{
      if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; }
      const dt = Date.now()-tstartTime;
      const touch = e.changedTouches && e.changedTouches[0];
      if(!touch) return;
      const dx = touch.clientX - tstartX, dy = touch.clientY - tstartY;
      // quick tap => rotate
      if(Math.abs(dx)<10 && Math.abs(dy)<10 && dt<250) rotate(1);
    }, {passive:false});

    // single mouse click / pointer click rotates as well (desktop & in-app click)
    boardCanvas.addEventListener('click', ()=>{ rotate(1); });

    // restart/share buttons
    restartBtn.addEventListener('click', ()=>{ init(true); });
    shareBtn.addEventListener('click', shareScore);

    // pause
    pauseBtn.addEventListener('click', ()=>{ running=!running; if(running) requestAnimationFrame(loop); });

    // telegram init
    try {
      if(window.Telegram && Telegram.WebApp){
        const tg = Telegram.WebApp;
        tg.ready();
        try{ tg.expand(); }catch(e){}
        const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if(user && user.username) document.getElementById('best-score').textContent = localStorageGet('neon_best')||0;
        // share uses tg.sendData or switchInlineQuery - we use switchInlineQuery to suggest text in chat
        shareBtn.addEventListener('click', ()=>{
          const text = `I scored ${score} in Neon Tetris!`;
          try{ tg.switchInlineQuery(text); }catch(e){ tg.sendData && tg.sendData(JSON.stringify({score})); }
        });
      }
    } catch(e){}
  }

  // share fallback
  function shareScore(){
    try{
      if(window.navigator.share){
        navigator.share({title:'Neon Tetris', text:`I scored ${score} in Neon Tetris!`});
      } else {
        alert(`Share: I scored ${score} in Neon Tetris!`);
      }
    }catch(e){}
  }

  // game loop
  function loop(ts){
    if(!lastTime) lastTime = ts;
    const delta = ts - lastTime;
    lastTime = ts;
    if(!running) { lastTime = 0; return; }
    dropCounter += delta;
    if(dropCounter > dropInterval){
      if(current) {
        if(valid(current.matrix, current.x, current.y+1)) current.y++; else lockPiece();
      }
      dropCounter = 0;
    }
    draw();
    if(!gameOver) requestAnimationFrame(loop);
  }

  function init(resetBest=false){
    if(resetBest) localStorageSet('neon_best',0);
    resetBoard();
    score = 0; lines = 0; level = 1; dropInterval = 1000;
    nextBag = []; refillBag();
    held = null; canHold = true; gameOver=false; running=true;
    spawn();
    setupCanvas();
    syncUI();
    requestAnimationFrame(loop);
  }

  function endGame(){
    gameOver = true;
    running = false;
    gameOverDiv.classList.remove('hidden');
    // update best
    const best = localStorageGet('neon_best') || 0;
    if(score > best) localStorageSet('neon_best', score);
    syncUI();
    tone(220,0.6,'sawtooth',0.08);
  }

  // handle resizing
  let resizeTimeout;
  function onResize(){
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(()=> {
      setupCanvas();
      draw();
    }, 120);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // helpers to set/get local storage
  function localStorageGet(k){ try{return JSON.parse(localStorage.getItem(k));}catch(e){return null} }
  function localStorageSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  // start
  wireInputs();
  setupCanvas();
  init();

  // expose for debugging
  window.NeonTetris = { init, board, spawn, hardDrop, softDrop, rotate, move, endGame };
})();