/* Neon Tetris - app.js
	 Vanilla JS Tetris implementation optimized for mobile/TG WebApp with Canvas rendering
*/

(() => {
	'use strict';

	// Config
	const COLS = 10;
	const VISIBLE_ROWS = 20;
	const HIDDEN_ROWS = 2;
	const ROWS = VISIBLE_ROWS + HIDDEN_ROWS; // 22 total
	const START_X = 3;
	const START_Y = -1; // spawn in hidden rows
	const BAG = ['I','O','T','S','Z','J','L'];

	// Scoring
	const SCORE_TABLE = {1:100,2:300,3:500,4:800};
	const SOFT_DROP_POINT = 1;
	const HARD_DROP_POINT = 2;

	// DOM
	const cvs = document.getElementById('gameCanvas');
	const holdCanvas = document.getElementById('holdCanvas');
	const nextCanvases = [document.getElementById('next0'), document.getElementById('next1'), document.getElementById('next2')];
	const bestEl = document.getElementById('bestScore');
	const scoreEl = document.getElementById('score');
	const levelEl = document.getElementById('level');
	const overlay = document.getElementById('overlay');
	const playerNameEl = document.getElementById('playerName');

	const btnStart = document.getElementById('btnStart');
	const btnPause = document.getElementById('btnPause');
	const btnShare = document.getElementById('btnShare');

	// Canvas contexts
	const ctx = cvs.getContext('2d');
	const holdCtx = holdCanvas.getContext('2d');
	const nextCtxs = nextCanvases.map(c=>c.getContext('2d'));

	// State
	let board = createMatrix(ROWS, COLS);
	let current = null;
	let hold = null; let holdUsed = false;
	let queue = [];
	let bag = [];
	let score = 0;
	let best = parseInt(localStorage.getItem('neonTetris_best')||'0',10);
	let lines = 0;
	let level = 1;
	let dropAccumulator = 0;
	let lastTime = 0;
	let paused = false;
	let running = false;

	bestEl.textContent = `Best: ${best}`;

	// Colors (neon palette)
	const COLORS = {
		'I': '#3FE7FF',
		'O': '#FF6B6B',
		'T': '#B86BFF',
		'S': '#5CFF8A',
		'Z': '#FFE66D',
		'J': '#57B0FF',
		'L': '#FF9A3C'
	};

	// Tetromino shapes (4x4 grids for rotations)
	const SHAPES = {
		'I': [
			[0,0,0,0,
			 1,1,1,1,
			 0,0,0,0,
			 0,0,0,0],
			[0,0,1,0,
			 0,0,1,0,
			 0,0,1,0,
			 0,0,1,0],
			[0,0,0,0,
			 0,0,0,0,
			 1,1,1,1,
			 0,0,0,0],
			[0,1,0,0,
			 0,1,0,0,
			 0,1,0,0,
			 0,1,0,0]
		],
		'O': [
			[0,1,1,0,
			 0,1,1,0,
			 0,0,0,0,
			 0,0,0,0]
		,null,null,null],
		'T': [
			[0,1,0,0,
			 1,1,1,0,
			 0,0,0,0,
			 0,0,0,0],
			[0,1,0,0,
			 0,1,1,0,
			 0,1,0,0,
			 0,0,0,0],
			[0,0,0,0,
			 1,1,1,0,
			 0,1,0,0,
			 0,0,0,0],
			[0,1,0,0,
			 1,1,0,0,
			 0,1,0,0,
			 0,0,0,0]
		],
		'S': [
			[0,1,1,0,
			 1,1,0,0,
			 0,0,0,0,
			 0,0,0,0],
			[0,1,0,0,
			 0,1,1,0,
			 0,0,1,0,
			 0,0,0,0],
			[0,0,0,0,
			 0,1,1,0,
			 1,1,0,0,
			 0,0,0,0],
			[1,0,0,0,
			 1,1,0,0,
			 0,1,0,0,
			 0,0,0,0]
		],
		'Z': [
			[1,1,0,0,
			 0,1,1,0,
			 0,0,0,0,
			 0,0,0,0],
			[0,0,1,0,
			 0,1,1,0,
			 0,1,0,0,
			 0,0,0,0],
			[0,0,0,0,
			 1,1,0,0,
			 0,1,1,0,
			 0,0,0,0],
			[0,1,0,0,
			 1,1,0,0,
			 1,0,0,0,
			 0,0,0,0]
		],
		'J': [
			[1,0,0,0,
			 1,1,1,0,
			 0,0,0,0,
			 0,0,0,0],
			[0,1,1,0,
			 0,1,0,0,
			 0,1,0,0,
			 0,0,0,0],
			[0,0,0,0,
			 1,1,1,0,
			 0,0,1,0,
			 0,0,0,0],
			[0,1,0,0,
			 0,1,0,0,
			 1,1,0,0,
			 0,0,0,0]
		],
		'L': [
			[0,0,1,0,
			 1,1,1,0,
			 0,0,0,0,
			 0,0,0,0],
			[0,1,0,0,
			 0,1,0,0,
			 0,1,1,0,
			 0,0,0,0],
			[0,0,0,0,
			 1,1,1,0,
			 1,0,0,0,
			 0,0,0,0],
			[1,1,0,0,
			 0,1,0,0,
			 0,1,0,0,
			 0,0,0,0]
		]
	};

	// SRS wall kick data (JLSTZ)
	const KICKS = {
		normal: {
			'0->1': [[0,0],[ -1,0 ],[ -1,1 ],[ 0,-2 ],[ -1,-2 ]],
			'1->0': [[0,0],[ 1,0 ],[ 1,-1 ],[ 0,2 ],[ 1,2 ]],
			'1->2': [[0,0],[ 1,0 ],[ 1,-1 ],[ 0,2 ],[ 1,2 ]],
			'2->1': [[0,0],[ -1,0 ],[ -1,1 ],[ 0,-2 ],[ -1,-2 ]],
			'2->3': [[0,0],[ 1,0 ],[ 1,1 ],[ 0,-2 ],[ 1,-2 ]],
			'3->2': [[0,0],[ -1,0 ],[ -1,-1 ],[ 0,2 ],[ -1,2 ]],
			'3->0': [[0,0],[ -1,0 ],[ -1,-1 ],[ 0,2 ],[ -1,2 ]],
			'0->3': [[0,0],[ 1,0 ],[ 1,1 ],[ 0,-2 ],[ 1,-2 ]]
		},
		I: {
			'0->1': [[0,0],[ -2,0 ],[ 1,0 ],[ -2,-1 ],[ 1,2 ]],
			'1->0': [[0,0],[ 2,0 ],[ -1,0 ],[ 2,1 ],[ -1,-2 ]],
			'1->2': [[0,0],[ -1,0 ],[ 2,0 ],[ -1,2 ],[ 2,-1 ]],
			'2->1': [[0,0],[ 1,0 ],[ -2,0 ],[ 1,-2 ],[ -2,1 ]],
			'2->3': [[0,0],[ 2,0 ],[ -1,0 ],[ 2,1 ],[ -1,-2 ]],
			'3->2': [[0,0],[ -2,0 ],[ 1,0 ],[ -2,-1 ],[ 1,2 ]],
			'3->0': [[0,0],[ 1,0 ],[ -2,0 ],[ 1,-2 ],[ -2,1 ]],
			'0->3': [[0,0],[ -1,0 ],[ 2,0 ],[ -1,2 ],[ 2,-1 ]]
		}
	};

	// Utilities
	function createMatrix(r,c){
		const m = [];
		for(let y=0;y<r;y++){ m[y]=new Array(c).fill(null); }
		return m;
	}

	function clone(v){ return JSON.parse(JSON.stringify(v)); }

	// Bag generator
	function refillBag(){
		bag = BAG.slice();
		for(let i=bag.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
	}

	function nextPiece(){
		if(bag.length===0) refillBag();
		return bag.pop();
	}

	function spawn(){
		if(queue.length<7) for(let i=0;i<7;i++) queue.push(nextPiece());
		const type = queue.shift();
		current = {type, rotation:0, x: START_X, y: START_Y };
		holdUsed = false;
		if(collides(current)){
			gameOver();
		}
	}

	function collides(piece){
		const shape = getShape(piece.type, piece.rotation);
		for(let i=0;i<16;i++){
			if(!shape[i]) continue;
			const sx = i%4; const sy = Math.floor(i/4);
			const x = piece.x + sx;
			const y = piece.y + sy;
			if(x<0 || x>=COLS || y>=ROWS) return true;
			if(y>=0 && board[y][x]) return true;
		}
		return false;
	}

	function getShape(type,rot){
		const arr = SHAPES[type];
		if(type==='O') return arr[0];
		return arr[rot%arr.length];
	}

	function rotatePiece(dir){
		if(!current) return;
		const oldRot = current.rotation;
		const newRot = (oldRot + (dir>0?1:3))%4;
		const fromTo = `${oldRot}->${newRot}`;
		const kicks = (current.type==='I')?KICKS.I[fromTo]:KICKS.normal[fromTo];
		if(!kicks) return;
		for(const k of kicks){
			const nx = current.x + k[0];
			const ny = current.y + k[1];
			const test = {type:current.type, rotation:newRot, x:nx, y:ny};
			if(!collides(test)){
				current.rotation = newRot;
				current.x = nx; current.y = ny;
				return true;
			}
		}
		return false;
	}

	function move(dx,dy){
		const copy = { ...current, x: current.x + dx, y: current.y + dy };
		if(!collides(copy)) { current.x = copy.x; current.y = copy.y; return true; }
		return false;
	}

	function hardDrop(){
		if(!current) return;
		let drop = 0;
		while(true){ const test = { ...current, y: current.y +1}; if(collides(test)) break; current.y++; drop++; }
		score += drop * HARD_DROP_POINT;
		lock();
	}

	function softDrop(){ if(move(0,1)) score += SOFT_DROP_POINT; }

	function lock(){
		const shape = getShape(current.type, current.rotation);
		for(let i=0;i<16;i++){
			if(!shape[i]) continue;
			const sx = i%4; const sy = Math.floor(i/4);
			const x = current.x + sx;
			const y = current.y + sy;
			if(y>=0 && y<ROWS && x>=0 && x<COLS) board[y][x] = current.type;
		}
		clearLines();
		current = null;
		spawn();
	}

	function clearLines(){
		const removed = [];
		for(let y=0;y<ROWS;y++){
			if(board[y].every(c=>c!==null)) removed.push(y);
		}
		if(removed.length===0) return;
		// scoring
		score += SCORE_TABLE[removed.length] || 0;
		lines += removed.length;
		const oldLevel = level;
		level = Math.floor(lines/10)+1;
		// remove rows
		for(const row of removed){ board.splice(row,1); board.unshift(new Array(COLS).fill(null)); }
		// update best
		if(score>best){ best = score; localStorage.setItem('neonTetris_best', String(best)); bestEl.textContent = `Best: ${best}`; }
	}

	function holdPiece(){
		if(holdUsed) return;
		if(!hold){ hold = current.type; current = null; spawn(); }
		else { const t = hold; hold = current.type; current = { type: t, rotation:0, x:START_X, y:START_Y }; if(collides(current)) gameOver(); }
		holdUsed = true;
	}

	function gameOver(){
		running = false; paused = false;
		overlay.classList.remove('hidden'); overlay.innerHTML = '<div class="game-over">GAME OVER</div>';
		if(window.Telegram && Telegram.WebApp){
			try{ Telegram.WebApp.sendData(JSON.stringify({type:'game_over', score})); }catch(e){}
		}
	}

	// Rendering
	function resize(){
		const containerW = Math.min(window.innerWidth, 520);
		const maxWidth = containerW * 0.62; // for center canvas
		const cellSize = Math.floor(Math.min(window.innerHeight*0.04, Math.floor(maxWidth/COLS)));
		const width = cellSize * COLS;
		const height = cellSize * VISIBLE_ROWS;
		const ratio = window.devicePixelRatio || 1;
		cvs.style.width = width + 'px'; cvs.style.height = height + 'px';
		cvs.width = Math.floor(width * ratio); cvs.height = Math.floor(height * ratio);
		ctx.setTransform(ratio,0,0,ratio,0,0);
		ctx.imageSmoothingEnabled = false;
	}

	function draw(){
		// background gradient
		const w = cvs.width/(window.devicePixelRatio||1);
		const h = cvs.height/(window.devicePixelRatio||1);
		const g = ctx.createLinearGradient(0,0,0,h);
		g.addColorStop(0,'#071033'); g.addColorStop(1,'#0b1433');
		ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

		// grid background faint lines
		const cellW = w/COLS; const cellH = h/VISIBLE_ROWS;
		ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth=1;
		for(let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*cellW,0); ctx.lineTo(x*cellW,h); ctx.stroke(); }
		for(let y=0;y<=VISIBLE_ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*cellH); ctx.lineTo(w,y*cellH); ctx.stroke(); }

		// drawplaced blocks
		for(let y=HIDDEN_ROWS;y<ROWS;y++){
			for(let x=0;x<COLS;x++){
				const t = board[y][x];
				if(!t) continue;
				drawCell(x, y-HIDDEN_ROWS, COLORS[t], true);
			}
		}

		// ghost piece
		if(current){
			const ghost = clone(current);
			while(!collides({...ghost, y: ghost.y+1})) ghost.y++;
			drawPiece(ghost, true);
			drawPiece(current, false);
		}
	}

	function drawPiece(p, ghost){
		const shape = getShape(p.type, p.rotation);
		for(let i=0;i<16;i++){
			if(!shape[i]) continue;
			const sx = i%4; const sy = Math.floor(i/4);
			const x = p.x + sx; const y = p.y + sy - HIDDEN_ROWS;
			if(y<0) continue;
			drawCell(x,y, COLORS[p.type], ghost);
		}
	}

	function drawCell(col,row,color,ghost){
		const w = cvs.width/(window.devicePixelRatio||1);
		const h = cvs.height/(window.devicePixelRatio||1);
		const cw = w/COLS; const ch = h/VISIBLE_ROWS;
		const x = col * cw; const y = row * ch;
		ctx.save();
		if(ghost){ ctx.globalAlpha = 0.28; ctx.shadowBlur = 6; ctx.shadowColor = '#ffffff'; }
		else { ctx.globalAlpha = 1; ctx.shadowBlur = 18; ctx.shadowColor = color; }
		ctx.fillStyle = color; ctx.fillRect(x+2,y+2,cw-4,ch-4);
		// outline
		ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(x+2,y+2,cw-4,ch-4);
		ctx.restore();
	}

	// UI and control wiring
	function tick(ts){
		if(!lastTime) lastTime = ts;
		const dt = ts - lastTime; lastTime = ts;
		if(!running || paused){ requestAnimationFrame(tick); return; }
		// gravity
		const fallInterval = Math.max(100, 1000 * Math.pow(0.85, level-1));
		dropAccumulator += dt;
		if(dropAccumulator >= fallInterval){ dropAccumulator = 0; if(!move(0,1)) { lock(); } }
		// render
		draw(); updateUI();
		requestAnimationFrame(tick);
	}

	function updateUI(){ scoreEl.textContent = `Score: ${score}`; levelEl.textContent = `Level: ${level}`; }

	// Input
	document.addEventListener('keydown', e=>{
		if(!running) return;
		if(e.code==='ArrowLeft') move(-1,0);
		if(e.code==='ArrowRight') move(1,0);
		if(e.code==='ArrowDown') softDrop();
		if(e.code==='ArrowUp' || e.code==='KeyX') rotatePiece(1);
		if(e.code==='KeyZ') rotatePiece(-1);
		if(e.code==='Space') hardDrop();
		if(e.code==='KeyC') holdPiece();
	});

	// Touch: tap rotate, swipe left/right move, swipe down soft drop, double-tap hard drop, long-press hold
	(function touchControls(){
		let startX=0,startY=0,startT=0,tapCount=0,tapTimer=null,longPressTimer=null;
		const threshold = 30;
		cvs.addEventListener('touchstart', e=>{
			const t = e.touches[0]; startX=t.clientX; startY=t.clientY; startT=Date.now();
			longPressTimer = setTimeout(()=>{ holdPiece(); },600);
		});
		cvs.addEventListener('touchmove', e=>{
			clearTimeout(longPressTimer);
			const t = e.touches[0]; const dx = t.clientX - startX; const dy = t.clientY - startY;
			if(Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)){
				if(dx>0) move(1,0); else move(-1,0);
				startX = t.clientX; startY = t.clientY;
			} else if(Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)){
				if(dy>0) softDrop();
				startX = t.clientX; startY = t.clientY;
			}
		});
		cvs.addEventListener('touchend', e=>{
			clearTimeout(longPressTimer);
			const dt = Date.now()-startT;
			tapCount++; if(tapTimer) clearTimeout(tapTimer);
			tapTimer = setTimeout(()=>{ if(tapCount===1){ rotatePiece(1); } else if(tapCount===2){ hardDrop(); } tapCount=0; },250);
		});
	})();

	// Previews
	function drawPreview(ctx, type){ ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height); if(!type) return; const sz = ctx.canvas.width; const cell = sz/4; ctx.save(); ctx.translate((sz-cell*4)/2,(sz-cell*4)/2); const shape = getShape(type,0); for(let i=0;i<16;i++){ if(!shape[i]) continue; const x=i%4,y=Math.floor(i/4); ctx.fillStyle=COLORS[type]; ctx.shadowBlur=14; ctx.shadowColor=COLORS[type]; ctx.fillRect(x*cell+6,y*cell+6,cell-12,cell-12); } ctx.restore(); }

	function renderPreviews(){ drawPreview(holdCtx, hold); for(let i=0;i<3;i++) drawPreview(nextCtxs[i], queue[i]||null); }

	// Buttons
	btnStart.addEventListener('click', ()=>{ startGame(); });
	btnPause.addEventListener('click', ()=>{ paused = !paused; btnPause.textContent = paused? 'Resume':'Pause'; });
	btnShare.addEventListener('click', ()=>{ shareScore(); });

	function shareScore(){
		if(window.Telegram && Telegram.WebApp){
			try{ Telegram.WebApp.sendData(JSON.stringify({type:'share_score', score})); }
			catch(e){ console.warn(e); }
		} else {
			alert('Share: score ' + score);
		}
	}

	// Start game
	function startGame(){
		board = createMatrix(ROWS,COLS); queue = []; refillBag(); for(let i=0;i<7;i++) queue.push(nextPiece()); spawn(); score=0; lines=0; level=1; running=true; paused=false; overlay.classList.add('hidden'); lastTime=0; requestAnimationFrame(tick); renderPreviews(); if(window.Telegram && Telegram.WebApp){ try{ Telegram.WebApp.sendData(JSON.stringify({type:'start'})); }catch(e){} }
	}

	// setup Telegram display
	if(window.Telegram && Telegram.WebApp){
		try{ Telegram.WebApp.expand(); const u = Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user; if(u) playerNameEl.textContent = u.username? '@'+u.username : (u.first_name||'Player'); }
		catch(e){}
	}

	// initial resize and draw
	window.addEventListener('resize', ()=>{ resize(); draw(); });
	resize(); draw(); renderPreviews();

	// Expose minimal API for debugging
	window.NeonTetris = { start: startGame, pause: ()=>paused=!paused, hardDrop, softDrop, rotate: ()=>rotatePiece(1) };

})();

