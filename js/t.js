
    const supabaseUrl = 'https://euqgkffgmiqbdmtsnxwo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cWdrZmZnbWlxYmRtdHNueHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDU3MzIsImV4cCI6MjA5MTA4MTczMn0.Oe8L89X0dPJXd5oY0vS5KtlNejx5OAL4T2iKTrsPnNM';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
}
    let roomChannel = null, mySecret = "", opReady = false, meReady = false, isHost = false;
    let turnStatus = "WAIT", currentPendingGuess = null, isOnline = false, gameStarted = false;
    let startRetryInterval = null;
    let opponentSecret = "";
    let mMaxPlayers = 2;
    let mPlayers = [];
    let mMyIdx = -1;
    let mTurn = 0;
    let mOnlineActive = false;
    let mReadyCount = 0;
    let mangoRoomCode = "";
    let playerName = localStorage.getItem("playerName");
    
    if (!playerName) {
        playerName = prompt("اكتب اسمك:");
        if (!playerName) playerName = "لاعب_" + Math.floor(Math.random() * 10000);
        localStorage.setItem("playerName", playerName);
    }
function savePlayerName() {
    const input = document.getElementById('playerNameInput').value.trim();
    if(!input) return showToast("ااكتب اسمك أولاً");
    playerName = input;
    localStorage.setItem("playerName", playerName);
    document.getElementById('playerNameSetup').classList.add('hidden');
}


let myClientId = Math.random().toString(36).substr(2, 9);

    function switchView(v) {
    // إخفاء كل العناصر اللي عندها ID وينتهي بـ View
    const views = ['homeView', 'mangoView', 'guessView', 'xoView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // إظهار الواجهة المطلوبة فقط
    const target = document.getElementById(v);
    if (target) {
        target.classList.remove('hidden');
    }

    // لو رجعنا للرئيسية، نفصل القنوات المفتوحة عشان نوفر رامات وباندويث
    if (v === 'homeView') {
        cleanupConnection();
        // إعادة تعيين متغيرات اللعب
        gameStarted = false;
        xoActive = false;
    }
}


    // --- Mango Logic ---
    let mData = [], mCount = 1, mStarted = false;
    function initMango() {
        const g = document.getElementById('grid'); g.innerHTML = '';
        mData = new Array(25).fill(null).map(() => ({v: null, m: false}));
        mCount = 1; mStarted = false;
        document.getElementById('mangoWord').innerHTML = '';
        document.getElementById('mangoStartBtn').classList.remove('hidden');
        for(let i=0; i<25; i++) {
            const c = document.createElement('div'); c.className = 'cell';
            c.onclick = () => {
                if(!mStarted) {
                    if(mData[i].v !== null || mCount > 25) return;
                    mData[i].v = mCount; c.innerText = mCount++; c.classList.add('occupied');
                } else if(mData[i].v && !mData[i].m) {
                    mData[i].m = true; c.classList.add('marked'); checkM();
                }
            };
            g.appendChild(c);
        }
    }
    function startMangoMode() { if(mCount === 26) { mStarted = true; document.getElementById('mangoStartBtn').classList.add('hidden'); } }
    function checkM() {
        const w = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];
        let c = 0; w.forEach(p => { if(p.every(idx => mData[idx].m)) c++; });
        let word = "MANGO", res = ""; for(let i=0; i<5; i++) res += i<c ? `<span class="crossed">${word[i]}</span>` : word[i];
        document.getElementById('mangoWord').innerHTML = res;
    }

    // --- Guess Logic ---
    function setGuessMode(m) {
        document.getElementById('modeSelection').classList.add('hidden');
        isOnline = (m === 'online');
        if(isOnline) showOnlineOptions();
        else document.getElementById('localSetup').classList.remove('hidden');
    }
    function showOnlineOptions() {
        document.querySelectorAll('#modeSelection, #joinInput, #onlineOptions, #localSetup').forEach(e => e.classList.add('hidden'));
        document.getElementById('onlineOptions').classList.remove('hidden');
    }
    function showJoinInput() {
        document.getElementById('onlineOptions').classList.add('hidden');
        document.getElementById('joinInput').classList.remove('hidden');
    }
    function backToMode() {
        document.querySelectorAll('#localSetup, #onlineOptions, #joinInput, #secretInputArea').forEach(e => e.classList.add('hidden'));
        document.getElementById('modeSelection').classList.remove('hidden');
    }

    function startLocalGame() {
        mySecret = document.getElementById('localSecret').value;
        if(!mySecret) return;
        document.getElementById('displaySecret').innerText = mySecret;
        document.getElementById('guessSetup').classList.add('hidden');
        document.getElementById('guessPlay').classList.remove('hidden');
    }

    function hostRoom() {
        isHost = true;
        const code = Math.floor(1000 + Math.random() * 9000);
        cleanupConnection();
        setupConn(code);
        document.getElementById('roomDisplay').innerText = "كود الغرفة: " + code;
        document.getElementById('onlineOptions').classList.add('hidden');
        document.getElementById('secretInputArea').classList.remove('hidden');
    }

    function joinRoom() {
        isHost = false;
        const code = document.getElementById('roomID').value;
        if(!code) return;
        cleanupConnection();
        setupConn(code);
        document.getElementById('roomDisplay').innerText = "غرفة: " + code;
        document.getElementById('joinInput').classList.add('hidden');
        document.getElementById('secretInputArea').classList.remove('hidden');
    }

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
            .on('broadcast', { event: 'start_ack' }, () => {
                if (isHost && !gameStarted) {
                    clearInterval(startRetryInterval);
                    runCountdown();
                }
            })
            .on('broadcast', { event: 'guess_sent' }, (p) => {
                currentPendingGuess = p.payload.g;
                turnStatus = "REPLY"; 
                updateUI();
            })
            .on('broadcast', { event: 'game_over' }, (p) => {
    if (p.payload.winner !== myClientId) {
        showResult(false, "الخصم خمن رقمك صح!");
    }
})
            .on('broadcast', { event: 'reply_sent' }, (p) => {
                addLog(p.payload.g, p.payload.r, "ME"); 
                // التحقق إذا كان تخميني أنا (ME) قد نجح
                if (p.payload.r.startsWith("3✅")) {
                    showResult(true);
                    return;
                }
                turnStatus = "WAIT"; 
                updateUI();
            })
            .subscribe((s) => {
                if(s === 'SUBSCRIBED') document.getElementById('waitMsg').innerText = "متصل ✅";
            });
            
    }

    function sendReady() {
        mySecret = document.getElementById('onlineSecretInput').value;
        if(!mySecret) return;
        meReady = true;
        document.getElementById('readyBtn').disabled = true;
        document.getElementById('waitMsg').innerText = "تمت الجاهزية.. بانتظار الخصم";
        roomChannel.send({ 
    type: 'broadcast', 
    event: 'ready', 
    payload: { id: myClientId, secret: mySecret } 
});
        if (isHost && opReady) attemptStartGame();
    }

    function attemptStartGame() {
        if (gameStarted) return;
        const hostStarts = Math.random() < 0.5;
        turnStatus = hostStarts ? "GUESS" : "WAIT";
        startRetryInterval = setInterval(() => {
            if(!gameStarted) {
                roomChannel.send({ 
                    type: 'broadcast', 
                    event: 'start_signal', 
                    payload: { hostStarts: hostStarts } 
                });
            }
        }, 800);
    }

    function runCountdown() {
        if (gameStarted) return;
        gameStarted = true;
        let sec = 3;
        const cd = document.getElementById('countdown');
        cd.classList.remove('hidden');
        const t = setInterval(() => {
            cd.innerText = sec;
            if(sec <= 0) {
                clearInterval(t); cd.classList.add('hidden');
                document.getElementById('guessSetup').classList.add('hidden');
                document.getElementById('guessPlay').classList.remove('hidden');
                document.getElementById('displaySecret').innerText = mySecret;
                updateUI();
            }
            sec--;
        }, 1000);
    }

    function updateUI() {
        if (!isOnline) return;
        const btn = document.getElementById('actionBtn');
        const input = document.getElementById('currentGuess');
        const ind = document.getElementById('turnIndicator');
        
        switch(turnStatus) {
            case "REPLY":
                ind.innerText = "🚨 الخصم خمن: " + currentPendingGuess;
                ind.style.color = "var(--secondary)";
                btn.innerText = "رد بالنتيجة";
                btn.disabled = false; input.disabled = true;
                break;
            case "GUESS":
                ind.innerText = "🟢 دورك تخمن رقم";
                ind.style.color = "var(--accent)";
                btn.innerText = "إرسال تخمين";
                btn.disabled = false; input.disabled = false;
                break;
            case "WAIT":
                ind.innerText = "⌛ بانتظار حركة الخصم...";
                ind.style.color = "#94a3b8";
                btn.innerText = "انتظر...";
                btn.disabled = true; input.disabled = true;
                break;
        }
    }

    function handleAction() {
        if (!isOnline) { saveLocalLog(); return; }
        if (turnStatus === "REPLY") {
            
const s1 = parseInt(document.getElementById('s1').innerText);
const s2 = parseInt(document.getElementById('s2').innerText);
const s3 = parseInt(document.getElementById('s3').innerText);

if (s1 + s2 + s3 !== 3) {
    alert("لازم مجموع النتائج = 3");
    return;
}

const r = `${s1}✅ ${s2}🔄 ${s3}❌`;            roomChannel.send({ type: 'broadcast', event: 'reply_sent', payload: { g: currentPendingGuess, r: r } });
            if (currentPendingGuess !== null) {
    addLog(currentPendingGuess, r, "OP");
}
            
            // إذا كان الخصم (OP) هو من خمن صح
            if (r.startsWith("3✅")) {
                showResult(false, "للأسف، الخصم كشف رقمك السري!"); 
                return;
            }
            currentPendingGuess = null; turnStatus = "GUESS"; updateUI();
            resetInputs();
        } else if (turnStatus === "GUESS") {
            const g = document.getElementById('currentGuess').value;
            if (g === opponentSecret) {
    roomChannel.send({
        type: 'broadcast',
        event: 'game_over',
        payload: { winner: myClientId }
    });

    showResult(true, "كسبت فورًا! خمنت الرقم صح 🔥");
    return;
}
            if (!/^\d{3}$/.test(g)) {
    showToast("لازم رقم مكون من 3 أرقام");
    return;
}
            roomChannel.httpSend({
  type: 'broadcast',
  event: 'guess_sent',
  payload: { g: g }
});
            turnStatus = "WAIT"; updateUI();
            resetInputs();
        }
    }

    function saveLocalLog() {
        const g = document.getElementById('currentGuess').value;
        if(!g) return;
        const s1 = parseInt(document.getElementById('s1').innerText);
const s2 = parseInt(document.getElementById('s2').innerText);
const s3 = parseInt(document.getElementById('s3').innerText);

if (s1 + s2 + s3 !== 3) {
    showToast("لازم مجموع النتائج = 3");
    return;
}

const r = `${s1}✅ ${s2}🔄 ${s3}❌`;
        addLog(g, r, "ME");
        
        if(r.startsWith("3✅")) { 
            showResult(true); 
        }
        resetInputs();
    }

    function resetInputs() {
        document.getElementById('currentGuess').value = '';
        ['s1','s2','s3'].forEach(id => document.getElementById(id).innerText = '0');
    }

    function addLog(g, r, target) {
        const container = target === "ME" ? 'myLogs' : 'opLogs';
        const color = target === "ME" ? "var(--accent)" : "var(--secondary)";
        const html = `<div class="log-entry"><b style="color:${color}">${g}</b><span>${r}</span></div>`;
        document.getElementById(container).insertAdjacentHTML('afterbegin', html);
    }

    function uStep(id, v) {
    const el = document.getElementById(id);
    let n = parseInt(el.innerText) + v;

    const s1 = parseInt(document.getElementById('s1').innerText);
    const s2 = parseInt(document.getElementById('s2').innerText);
    const s3 = parseInt(document.getElementById('s3').innerText);

    let total = s1 + s2 + s3;
    let newTotal = total - parseInt(el.innerText) + n;

    if (n >= 0 && n <= 3 && newTotal <= 3) {
        el.innerText = n;
    }
}

    
// وظيفة لإظهار واجهة الفوز أو الخسارة برمجياً
function showResult(isWin, message = "") {
    const overlay = document.getElementById('finishOverlay');
    const icon = document.getElementById('finishIcon');
    const title = document.getElementById('finishTitle');
    const msg = document.getElementById('finishMsg');

    if (isWin) {
        icon.innerText = "🏆";
        title.innerText = "مبروك الفوز!";
        title.style.color = "var(--accent)";
        msg.innerText = message || "أداء أسطوري، لقد كشفت السر!";
        overlay.querySelector('div').style.borderColor = "var(--accent)";
    } else {
        icon.innerText = "💀";
        title.innerText = "هارد لك!";
        title.style.color = "#ef4444";
        msg.innerText = message || "للأسف، الخصم كان أسرع هذه المرة.";
        overlay.querySelector('div').style.borderColor = "#ef4444";
    }
    overlay.classList.remove('hidden');
}

// تعديل داخل الـ handleAction والـ saveLocalLog:
// بدلاً من alert("🏆 مبروك الفوز!"); استبدلها بـ:
// showResult(true);

// وبدلاً من alert("💀 للأسف، الخصم فاز!"); استبدلها بـ:
// showResult(false);


// --- X-O Pro Logic ---
let xoBoard = Array(9).fill(null);
let mySymbol = ""; 
let xoTurn = "X";   // مين عليه الدور حالياً
let starter = "X";  // مين اللي بدأ الجيم الحالي
let myScore = 0, opScore = 0;
let xoActive = false;

function showXOJoin() { document.getElementById('xoJoinInput').classList.toggle('hidden'); }

function hostXORoom() {
    isHost = true; mySymbol = "X";
    const code = Math.floor(1000 + Math.random() * 9000);
    initXOConn(code);
}

function joinXORoom() {
    isHost = false; mySymbol = "O";
    const code = document.getElementById('xoRoomID').value;
    if(!code) return;
    initXOConn(code);
}

function initXOConn(code) {
    cleanupConnection();
    roomChannel = supabaseClient.channel(`xo_${code}`, { config: { broadcast: { self: false } } });
    
    roomChannel
        .on('broadcast', { event: 'player_joined' }, () => {
            if(isHost) {
                roomChannel.send({ type: 'broadcast', event: 'sync_start', payload: { starter: starter } });
                startGameXO();
            }
        })
        .on('broadcast', { event: 'sync_start' }, (p) => { 
            if(!isHost) {
                starter = p.payload.starter;
                startGameXO();
            }
        })
        .on('broadcast', { event: 'move' }, (p) => { applyMove(p.payload.idx, p.payload.symbol); })
        .on('broadcast', { event: 'reset_game' }, (p) => { 
            starter = p.payload.nextStarter;
            resetBoardOnly(); 
        })
        .subscribe((s) => {
            if(s === 'SUBSCRIBED') {
                document.getElementById('xoRoomDisplay').innerText = "كود الغرفة: " + code;
                if(!isHost) roomChannel.send({ type: 'broadcast', event: 'player_joined' });
            }
        });
    
    document.getElementById('xoSetup').classList.add('hidden');
    document.getElementById('xoPlay').classList.remove('hidden');
    renderXO();
}

function startGameXO() {
    xoActive = true;
    xoTurn = starter; // الجيم يبدأ باللي عليه الدور في البداية
    updateXOUI();
}

function renderXO() {
    const g = document.getElementById('xoGrid'); g.innerHTML = '';
    xoBoard.forEach((val, idx) => {
        const c = document.createElement('div');
        c.className = 'xo-cell' + (val ? ' taken' : '');
        c.style.color = val === "X" ? "var(--primary)" : "var(--secondary)";
        c.innerText = val || '';
        c.onclick = () => makeMove(idx);
        g.appendChild(c);
    });
}

function makeMove(idx) {
    if(!xoActive || xoBoard[idx] || xoTurn !== mySymbol) return;
    applyMove(idx, mySymbol);
    roomChannel.send({ type: 'broadcast', event: 'move', payload: { idx, symbol: mySymbol } });
}

function applyMove(idx, symbol) {
    xoBoard[idx] = symbol;
    xoTurn = (symbol === "X") ? "O" : "X";
    renderXO();
    checkXOWinner();
    if(xoActive) updateXOUI();
}

function updateXOUI() {
    const ind = document.getElementById('xoTurnIndicator');
    if(xoTurn === mySymbol) {
        ind.innerText = "🟢 دورك الآن (" + mySymbol + ")";
        ind.style.color = "var(--accent)";
    } else {
        ind.innerText = "⌛ دور الخصم...";
        ind.style.color = "#94a3b8";
    }
}

function checkXOWinner() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let winner = null;

    for (let p of wins) {
        if(xoBoard[p[0]] && xoBoard[p[0]] === xoBoard[p[1]] && xoBoard[p[0]] === xoBoard[p[2]]) {
            winner = xoBoard[p[0]];
            break;
        }
    }

    if(winner || !xoBoard.includes(null)) {
        xoActive = false;
        if(winner) {
            if(winner === mySymbol) { myScore++; document.getElementById('myScore').innerText = myScore; }
            else { opScore++; document.getElementById('opScore').innerText = opScore; }
        }
        
        // تجهيز الجيم القادم: تبادل البادئ
        let nextStarter = (starter === "X") ? "O" : "X";
        
        setTimeout(() => {
            showToast(winner ? (winner === mySymbol ? "🎉 فزت بالجولة!" : "💀 الخصم فاز بالجولة!") : "🤝 تعادل!");
            if(isHost) {
                starter = nextStarter;
                roomChannel.send({ type: 'broadcast', event: 'reset_game', payload: { nextStarter: nextStarter } });
                resetBoardOnly();
            }
        }, 500);
    }
}

function resetBoardOnly() {
    xoBoard = Array(9).fill(null);
    xoActive = true;
    xoTurn = starter; 
    renderXO();
    updateXOUI();
}








function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    roomChannel.send({
        type: 'broadcast',
        event: 'chat_msg',
        payload: {
            id: myClientId,
            name: playerName,
            msg: msg
        }
    });

    addChatMessage("ME", playerName, msg);
    input.value = '';
}

function addChatMessage(sender, name, msg) {
    const box = document.getElementById('chatBox');
    const div = document.createElement('div');

    div.className = sender === "ME" ? "chat-me" : "chat-op";
    div.innerHTML = `<b>${name}:</b> ${msg}`;

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

async function enableMicrophone() {
    const btn = document.getElementById('micBtn');
    
    // حالة الغلق: إذا كان المايك يعمل بالفعل
    if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
        myStream = null;
        btn.innerHTML = "🔇 المايك مقفول";
        btn.classList.replace('btn-primary', 'btn-alt');
        return;
    }

    // حالة الفتح
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        btn.innerHTML = "🎙️ المايك يعمل";
        btn.classList.replace('btn-alt', 'btn-primary');
        
        // إذا دخلت الغرفة والمايك شغال، اتصل بالباقي فوراً
        mPlayers.forEach(id => {
            if (id !== myClientId) callPlayer(id);
        });

        return myStream;
    } catch (err) {
        showToast("يجب السماح بالوصول للمايكروفون");
    }
}



let myPeer;
let myStream;

function initVoiceChat() {
    if (!myClientId) return;
    
    // تأكد من قفل أي اتصال قديم تماماً
    if (myPeer) {
        myPeer.destroy();
    }

    // إضافة إعدادات السيرفر الافتراضي لضمان استقرار أسرع
    myPeer = new Peer(myClientId, {
        debug: 1
    }); 

    myPeer.on('open', (id) => {
        console.log('Voice Chat Ready. Peer ID:', id);
    });

    myPeer.on('error', (err) => {
        console.error('PeerJS Error:', err.type);
        // لو الـ ID مستخدم، جرب تعمل reconnect بعد ثانية
        if (err.type === 'unavailable-id') {
            setTimeout(() => initVoiceChat(), 1000);
        }
    });

    myPeer.on('call', async (call) => {
        // الرد التلقائي فقط إذا كان المايك شغال عندي
        if (myStream) {
            call.answer(myStream);
            call.on('stream', (remoteStream) => playRemoteStream(remoteStream));
        }
    });
}
function playRemoteStream(stream) {
    let audio = document.getElementById('remoteAudio_' + stream.id);
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'remoteAudio_' + stream.id;
        audio.autoplay = true;
        document.body.appendChild(audio);
    }
    audio.srcObject = stream;
    
    // محاولة التشغيل مع معالجة قيود المتصفح
    audio.play().catch(e => console.log("Autoplay blocked, waiting for user interaction"));
}

// عند انضمام لاعب جديد، قم بالاتصال به صوتياً
// تضاف داخل الـ .on('broadcast', { event: 'join' }...
function callPlayer(remotePeerId) {
    enableMicrophone().then(stream => {
        const call = myPeer.call(remotePeerId, stream);
        call.on('stream', (remoteStream) => {
            playRemoteStream(remoteStream);
        });
    });
}


























// ================== INIT ==================
function initMango() {
    const g = document.getElementById('grid');
    g.innerHTML = '';

    mData = new Array(25).fill(null).map(() => ({ v: null, m: false }));
    mCount = 1;
    mStarted = false;

    document.getElementById('mangoWord').innerHTML = '';
    document.getElementById('mTurnDisp').classList.add('hidden');

    const startBtn = document.getElementById('mangoStartBtn');
    startBtn.classList.remove('hidden');
    startBtn.innerText = mOnlineActive ? "جاهز! 🚀" : "ابدأ اللعب";
    startBtn.onclick = confirmMangoReady;
    startBtn.disabled = true;

    for (let i = 0; i < 25; i++) {
        const c = document.createElement('div');
        c.className = 'cell';

        c.onclick = () => {
            if (!mStarted) {
                if (mData[i].v !== null || mCount > 25) return;
                mData[i].v = mCount;
                c.innerText = mCount++;
                c.classList.add('occupied');
            } else {
                if (mOnlineActive) {
                    if (mTurn === mMyIdx && mData[i].v && !mData[i].m) {
                        roomChannel.send({
                            type: 'broadcast',
                            event: 'pick_num',
                            payload: { num: mData[i].v }
                        });
                    }
                } else {
                    if (mData[i].v && !mData[i].m) {
                        markNumberLocally(mData[i].v);
                    }
                }
            }
        };

        g.appendChild(c);
    }
}
function randomFillMango() {
    if (mStarted) return;

    const nums = Array.from({length: 25}, (_, i) => i + 1);

    // shuffle
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    const cells = document.querySelectorAll('#grid .cell');

    nums.forEach((num, i) => {
        mData[i].v = num;
        cells[i].innerText = num;
        cells[i].classList.add('occupied');
    });

    mCount = 26;
}
// ================== READY ==================
function confirmMangoReady() {
    if(!roomChannel) {
        showToast("الاتصال لم يتم بعد، انتظر قليلاً");
        return;
    }
    if(mCount < 26) {
        showToast("املأ الـ 25 خانة أولاً");
        return;
    }
    mStarted = true;
    document.getElementById('mangoStartBtn').classList.add('hidden');
    if (mOnlineActive) {
        roomChannel.send({ type: 'broadcast', event: 'ready_up' });
        document.getElementById('mTurnDisp').innerText = "بانتظار اللاعبين...";
        document.getElementById('mTurnDisp').classList.remove('hidden');
    } else {
            showToast("ابدأ اللعب");
    }
}

// ================== MARK ==================
function markNumberLocally(num) {
    let found = false;

    mData.forEach((item, idx) => {
        if (item.v == num) {
            item.m = true;
            found = true;
            const cells = document.querySelectorAll('#grid .cell');
            if (cells[idx]) cells[idx].classList.add('marked');
        }
    });

    if (found) checkM();
}

// ================== ONLINE ==================
function hostMango() {
    isHost = true;
    mOnlineActive = true;

    mangoRoomCode = Math.floor(1000 + Math.random() * 9000);
    mPlayers = [myClientId]; // مهم

    document.getElementById('mangoHostOptions').classList.remove('hidden');
    document.getElementById('mRoomID').parentElement.classList.add('hidden');
}

function joinMango() {
    isHost = false;
    mOnlineActive = true;

    const code = document.getElementById('mRoomID').value;
    if (code) initMangoConnection(code);
    else showToast  ("اكتب الكود");
}



function initMangoConnection(code) {
    cleanupConnection(); // تنظيف أي قنوات قديمة فوراً

    // إظهار واجهة اللعب
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.remove('hidden');
    document.getElementById('mRoomCodeDisp').innerText = "كود الغرفة: " + code;

    // إنشاء القناة وتخزينها في متغير roomChannel
    roomChannel = supabaseClient.channel(`mango_${code}`, {
        config: { broadcast: { self: true } }
    });

    // تعريف المستمعين للأحداث (Listeners)
    roomChannel
        .on('broadcast', { event: 'join' }, (p) => {
            if (isHost) {
                if (!mPlayers.includes(p.payload.id)) mPlayers.push(p.payload.id);
                roomChannel.send({
                    type: 'broadcast',
                    event: 'sync_config',
                    payload: { max: mMaxPlayers, currentPlayers: mPlayers }
                });
                // إذا كان المايك شغال، اتصل باللاعب الجديد صوتياً
                if (myStream && p.payload.id !== myClientId) callPlayer(p.payload.id);
            }
        })
        .on('broadcast', { event: 'sync_config' }, (p) => {
            if (!isHost) {
                mMaxPlayers = p.payload.max;
                mPlayers = p.payload.currentPlayers;
            }
            mMyIdx = mPlayers.indexOf(myClientId);
            updateMangoLobbyUI();
        })
        .on('broadcast', { event: 'pick_num' }, (p) => {
            markNumberLocally(p.payload.num);
            mTurn = (mTurn + 1) % mPlayers.length;
            updateMangoTurnUI();
        })
        .on('broadcast', { event: 'chat_msg' }, (p) => {
            if (p.payload.id !== myClientId) addChatMessage("OP", p.payload.name, p.payload.msg);
        });

    // الاشتراك الفعلي في القناة (Subscribe)
    roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            console.log("Connected to Supabase Realtime ✅");
            
            // تفعيل نظام الصوت بعد استقرار الاتصال
            initVoiceChat();

            // تفعيل زر الجاهزية
            const startBtn = document.getElementById('mangoStartBtn');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerText = "جاهز! 🚀";
            }

            // إعلام الغرفة بانضمامي
            await roomChannel.send({
                type: 'broadcast',
                event: 'join',
                payload: { id: myClientId, name: playerName }
            });
        }
    });

    initMango();
}

// ================== GAME ==================
function startMangoGame() {
    mTurn = 0;
    updateMangoTurnUI();
    document.getElementById('mTurnDisp').classList.remove('hidden');
    showToast("ابدأوا اللعب");
}

function updateMangoTurnUI() {
    const disp = document.getElementById('mTurnDisp');

    if (mTurn === mMyIdx) {
        disp.innerText = "دورك";
    } else {
        disp.innerText = `دور اللاعب ${mTurn + 1}`;
    }
}

// ================== UI ==================
function updateMangoLobbyUI() {
    const countDisp = document.getElementById('mPlayersCount');
    if (countDisp) {
        countDisp.innerText = `${mPlayers.length} / ${mMaxPlayers}`;
    }
}

// ================== CHECK ==================
function checkM() {
    let lines = 0;

    for (let i = 0; i < 5; i++) {
        let row = true;
        let col = true;

        for (let j = 0; j < 5; j++) {
            if (!mData[i * 5 + j].m) row = false;
            if (!mData[j * 5 + i].m) col = false;
        }

        if (row) lines++;
        if (col) lines++;
    }

    let d1 = true, d2 = true;
    for (let i = 0; i < 5; i++) {
        if (!mData[i * 5 + i].m) d1 = false;
        if (!mData[i * 5 + (4 - i)].m) d2 = false;
    }

    if (d1) lines++;
    if (d2) lines++;

    updateMangoWord(lines);
}

function updateMangoWord(lines) {
    const word = "MANGO";
    document.getElementById('mangoWord').innerText = word.slice(0, lines);
}
function showMangoOnlineSetup() {
    document.getElementById('mangoModeSelect').classList.add('hidden');
    document.getElementById('mangoOnlineSetup').classList.remove('hidden');
}

function backToMangoMode() {
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoModeSelect').classList.remove('hidden');
}

function startMangoLocal() {
    mOnlineActive = false;

    document.getElementById('mangoModeSelect').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.add('hidden');

    initMango();
}
function cleanupConnection() {
    if (roomChannel) {
        supabaseClient.removeChannel(roomChannel);
        roomChannel = null;
    }

    mPlayers = [];
    mReadyCount = 0;
}
window.setMaxPlayers = function(n) {
    mMaxPlayers = n;
    document.getElementById('mangoHostOptions').classList.add('hidden');
    initMangoConnection(mangoRoomCode);
}


