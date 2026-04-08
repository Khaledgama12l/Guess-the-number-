let mySecret = "", opReady = false, meReady = false;
let turnStatus = "WAIT", currentPendingGuess = null, isOnline = false, gameStarted = false;
let startRetryInterval = null, opponentSecret = "";

function setGuessMode(m) {
    document.getElementById('modeSelection').classList.add('hidden');
    isOnline = (m === 'online');
    if(isOnline) showOnlineOptions();
    else document.getElementById('localSetup').classList.remove('hidden');
}

// ... دوال UI (showOnlineOptions, showJoinInput, backToMode) تتبع هنا ...

function setupConn(code) {
    roomChannel = supabaseClient.channel(`room_${code}`, { config: { broadcast: { self: false } } });
    roomChannel
        .on('broadcast', { event: 'ready' }, (p) => { 
            opReady = true; 
            opponentSecret = p.payload.secret;
            if (isHost && meReady) attemptStartGame();
        })
        .on('broadcast', { event: 'start_signal' }, (p) => { 
            roomChannel.send({ type: 'broadcast', event: 'start_ack' });
            if (gameStarted) return;
            const hostStarts = p.payload.hostStarts;
            if (isHost) { turnStatus = hostStarts ? "GUESS" : "WAIT"; } 
            else { turnStatus = hostStarts ? "WAIT" : "GUESS"; }
            runCountdown(); 
        })
        .on('broadcast', { event: 'guess_sent' }, (p) => {
            currentPendingGuess = p.payload.g;
            turnStatus = "REPLY"; 
            updateUI();
        })
        .on('broadcast', { event: 'reply_sent' }, (p) => {
            addLog(p.payload.g, p.payload.r, "ME"); 
            if (p.payload.r.startsWith("3✅")) { showResult(true); return; }
            turnStatus = "WAIT"; 
            updateUI();
        })
        .on('broadcast', { event: 'game_over' }, (p) => {
            if (p.payload.winner !== myClientId) showResult(false, "الخصم خمن رقمك صح!");
        })
        .subscribe();
}

function handleAction() {
    if (!isOnline) { saveLocalLog(); return; }
    if (turnStatus === "REPLY") {
        const s1 = parseInt(document.getElementById('s1').innerText);
        const s2 = parseInt(document.getElementById('s2').innerText);
        const s3 = parseInt(document.getElementById('s3').innerText);
        if (s1 + s2 + s3 !== 3) { alert("لازم مجموع النتائج = 3"); return; }
        const r = `${s1}✅ ${s2}🔄 ${s3}❌`;
        roomChannel.send({ type: 'broadcast', event: 'reply_sent', payload: { g: currentPendingGuess, r: r } });
        addLog(currentPendingGuess, r, "OP");
        if (r.startsWith("3✅")) { showResult(false, "كشف الخصم رقمك!"); return; }
        currentPendingGuess = null; turnStatus = "GUESS"; updateUI(); resetInputs();
    } else if (turnStatus === "GUESS") {
        const g = document.getElementById('currentGuess').value;
        if (!/^\d{3}$/.test(g)) { alert("أدخل 3 أرقام"); return; }
        roomChannel.send({ type: 'broadcast', event: 'guess_sent', payload: { g: g } });
        turnStatus = "WAIT"; updateUI(); resetInputs();
    }
}
// تابع بقية الدوال (uStep, addLog, resetInputs, runCountdown)