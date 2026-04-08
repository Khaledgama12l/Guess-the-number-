let xoBoard = Array(9).fill(null), mySymbol = "", xoTurn = "X", starter = "X", myScore = 0, opScore = 0, xoActive = false;

function initXOConn(code) {
    cleanupConnection();
    roomChannel = supabaseClient.channel(`xo_${code}`, { config: { broadcast: { self: false } } });
    roomChannel
        .on('broadcast', { event: 'player_joined' }, () => { 
            if(isHost) { 
                roomChannel.send({ type: 'broadcast', event: 'sync_start', payload: { starter } }); 
                startXO(); 
            } 
        })
        .on('broadcast', { event: 'sync_start' }, (p) => { 
            if(!isHost) { starter = p.payload.starter; startXO(); } 
        })
        .on('broadcast', { event: 'move' }, (p) => { applyXOMove(p.payload.idx, p.payload.symbol); })
        .subscribe();

    document.getElementById('xoSetup').classList.add('hidden');
    document.getElementById('xoPlay').classList.remove('hidden');
    renderXO();
}

function applyXOMove(idx, symbol) {
    xoBoard[idx] = symbol; 
    xoTurn = (symbol === "X") ? "O" : "X";
    renderXO(); 
    checkXOWinner(); 
    if(xoActive) updateXOUI();
}

function checkXOWinner() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let winner = null;
    for (let p of wins) { 
        if(xoBoard[p[0]] && xoBoard[p[0]] === xoBoard[p[1]] && xoBoard[p[0]] === xoBoard[p[2]]) { 
            winner = xoBoard[p[0]]; break; 
        } 
    }
    if(winner || !xoBoard.includes(null)) {
        xoActive = false;
        if(winner === mySymbol) myScore++; else if(winner) opScore++;
        setTimeout(() => {
            alert(winner ? (winner === mySymbol ? "فزت!" : "خسرت!") : "تعادل!");
            if(isHost) resetXO(); 
        }, 500);
    }
}