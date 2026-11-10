/* Example game: tic-tac-toe. Turn based. Red (bottom) plays X, blue (top) plays O. */
Duel.register({
  id: 'tictactoe', title: L('إكس أو', 'Tic-Tac-Toe', 'XOX'), emoji: '❌', bg: '#ff8fa3',
  help: L('كل واحد بدوره بيكبس على مربع. اللي بيعمل ٣ ورا بعض بيربح', 'Take turns tapping a square. Get 3 in a row to win!', 'Sırayla bir kareye dokun. Yan yana 3 tane yapan kazanır!'),
  create(api){
    const cells = Array(9).fill(-1);
    let turn = Math.random() < 0.5 ? 0 : 1, line = null, t = 0;
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    function geo(){ const S = Math.min(api.W * 0.86, api.H * 0.5); return { S, c: S / 3, x: (api.W - S) / 2, y: (api.H - S) / 2 }; }
    function check(){
      for(const L of LINES){ const v = cells[L[0]]; if(v >= 0 && v === cells[L[1]] && v === cells[L[2]]){ line = L; return v; } }
      return cells.every(v => v >= 0) ? 'draw' : null;
    }
    return {
      update(dt){ t += dt; },
      pointerDown(p){
        if(p.player !== turn || line) return;
        const g = geo(), cx = Math.floor((p.x - g.x) / g.c), cy = Math.floor((p.y - g.y) / g.c);
        if(cx < 0 || cy < 0 || cx > 2 || cy > 2) return;
        const i = cy * 3 + cx; if(cells[i] >= 0) return;
        cells[i] = turn; api.sfx.tap();
        const r = check();
        if(r === 'draw') return api.win(null);
        if(r === 0 || r === 1){ setTimeout(() => api.win(r), 500); return; }
        turn = 1 - turn;
      },
      draw(c){
        const W = api.W, H = api.H, g = geo();
        c.fillStyle = '#ffd6dd'; c.fillRect(0, 0, W, H);
        c.fillStyle = turn === 0 ? 'rgba(255,90,95,.18)' : 'rgba(63,169,255,.18)';
        if(turn === 0) c.fillRect(0, H / 2, W, H / 2); else c.fillRect(0, 0, W, H / 2);
        c.strokeStyle = '#1c1838'; c.lineWidth = 8; c.lineCap = 'round';
        for(let k = 1; k < 3; k++){
          c.beginPath(); c.moveTo(g.x + g.c * k, g.y + 8); c.lineTo(g.x + g.c * k, g.y + g.S - 8); c.stroke();
          c.beginPath(); c.moveTo(g.x + 8, g.y + g.c * k); c.lineTo(g.x + g.S - 8, g.y + g.c * k); c.stroke();
        }
        cells.forEach((v, i) => {
          if(v < 0) return;
          const x = g.x + (i % 3 + 0.5) * g.c, y = g.y + (Math.floor(i / 3) + 0.5) * g.c, r = g.c * 0.3;
          c.lineWidth = 12; c.strokeStyle = api.players[v].color;
          c.beginPath();
          if(v === 0){ c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); }
          else c.arc(x, y, r, 0, Math.PI * 2);
          c.stroke();
        });
        if(line){
          const a = line[0], b = line[2];
          c.strokeStyle = '#ffcd4d'; c.lineWidth = 14;
          c.beginPath(); c.moveTo(g.x + (a % 3 + 0.5) * g.c, g.y + (Math.floor(a / 3) + 0.5) * g.c); c.lineTo(g.x + (b % 3 + 0.5) * g.c, g.y + (Math.floor(b / 3) + 0.5) * g.c); c.stroke();
        }
        for(const pl of [0, 1]){
          const y = pl === 0 ? H - 70 : 70;
          api.text(c, turn === pl ? api.L('دورك! 👆', 'Your turn! 👆', 'Sıra sende! 👆') : api.L('استنى دورك', 'Wait your turn', 'Sıranı bekle'), W / 2, y, 26, turn === pl ? api.players[pl].dark : 'rgba(28,24,56,.5)', pl);
        }
      }
    };
  }
});
