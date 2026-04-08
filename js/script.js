// ================== CONFIG ==================
const supabaseUrl = 'https://euqgkffgmiqbdmtsnxwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cWdrZmZnbWlxYmRtdHNueHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDU3MzIsImV4cCI6MjA5MTA4MTczMn0.Oe8L89X0dPJXd5oY0vS5KtlNejx5OAL4T2iKTrsPnNM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const myClientId = Math.random().toString(36).substring(7);

let roomChannel = null;
let isHost = false;

// ================== UI ==================
function switchView(v) {
    const views = ['homeView', 'mangoView', 'guessView', 'xoView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(v);
    if (target) target.classList.remove('hidden');

    if (v === 'homeView') cleanupConnection();
}

function cleanupConnection() {
    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }
}

function showResult(isWin) {
    const overlay = document.getElementById('finishOverlay');
    const title = document.getElementById('finishTitle');
    const icon = document.getElementById('finishIcon');

    if (isWin) {
        title.innerText = "كسبت 🎉";
        icon.innerText = "🏆";
    } else {
        title.innerText = "خسرت";
        icon.innerText = "💀";
    }

    overlay.classList.remove('hidden');
}

// ================== MANGO ==================
let mData = [], mCount = 1, mStarted = false;
let mangoOnline = false, mCurrentTurnId = null;

// اتصال
function setupMangoConn(code) {
    cleanupConnection();

    roomChannel = supabaseClient.channel(`mango_${code}`, {
        config: { broadcast: { self: true } }
    });

    roomChannel
        .on('broadcast', { event: 'm_start' }, (p) => {
            console.log("START RECEIVED");

            mStarted = true;
            mCurrentTurnId = p.payload.turn;

            document.getElementById('mangoStartBtn').classList.add('hidden');
            document.getElementById('mTurnDisp').classList.remove('hidden');

            updateMangoUI();
        })

        .on('broadcast', { event: 'm_move' }, (p) => {
            if (p.payload.sid !== myClientId) {
                markNumberLocally(p.payload.num);
                mCurrentTurnId = myClientId;
                updateMangoUI();
            }
        })

        .on('broadcast', { event: 'm_win' }, (p) => {
            showResult(p.payload.winner === myClientId);
        })

        .subscribe((status) => {
            console.log("SUB:", status);
        });
}

// Host
function hostMango() {
    isHost = true;
    mangoOnline = true;
    document.getElementById('mangoHostOptions').classList.remove('hidden');
}

// تحديد عدد اللاعبين
function setMaxPlayers() {
    const code = Math.floor(1000 + Math.random() * 9000);

    setupMangoConn(code);

    document.getElementById('mRoomCodeDisp').innerText = "كود الغرفة: " + code;
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.remove('hidden');
    document.getElementById('mTurnDisp').classList.remove('hidden');

    initMango();
}

// Join
function joinMango() {
    const code = document.getElementById('mRoomID').value;
    if (!code) return;

    mangoOnline = true;

    setupMangoConn(code);

    document.getElementById('mRoomCodeDisp').innerText = "غرفة: " + code;
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.remove('hidden');
    document.getElementById('mTurnDisp').classList.remove('hidden');

    initMango();
}

// إنشاء الجريد
function initMango() {
    const g = document.getElementById('grid');
    g.innerHTML = '';

    mData = new Array(25).fill(null).map(() => ({ v: null, m: false }));
    mCount = 1;
    mStarted = false;

    document.getElementById('mangoStartBtn').classList.add('hidden');

    for (let i = 0; i < 25; i++) {
        const c = document.createElement('div');
        c.className = 'cell';
        c.onclick = () => handleCellClick(i, c);
        g.appendChild(c);
    }
}

// الضغط على خلية
function handleCellClick(i, el) {

    // ترتيب
    if (!mStarted) {
        if (mData[i].v || mCount > 25) return;

        mData[i].v = mCount;
        el.innerText = mCount++;
        el.classList.add('occupied');

        if (mCount === 26 && isHost) {
            document.getElementById('mangoStartBtn').classList.remove('hidden');
        }
        return;
    }

    // اللعب
    if (mangoOnline && mCurrentTurnId !== myClientId) return;

    if (mData[i].v && !mData[i].m) {
        broadcastMark(mData[i].v);
    }
}

// إرسال حركة
function broadcastMark(num) {
    markNumberLocally(num);

    if (roomChannel) {
        roomChannel.send({
            type: 'broadcast',
            event: 'm_move',
            payload: { num, sid: myClientId }
        });
    }

    mCurrentTurnId = null;
    updateMangoUI();
}

// بداية اللعبة
function startMangoGame() {
    mStarted = true;
    mCurrentTurnId = myClientId;

    if (roomChannel) {
        roomChannel.send({
            type: 'broadcast',
            event: 'm_start',
            payload: { turn: myClientId }
        });
    }

    updateMangoUI();
}

// تعليم رقم
function markNumberLocally(num) {
    const idx = mData.findIndex(x => x.v === num);
    if (idx === -1 || mData[idx].m) return;

    mData[idx].m = true;

    const cells = document.querySelectorAll('#grid .cell');
    cells[idx].classList.add('marked');

    checkM();
}

// الدور
function updateMangoUI() {
    const d = document.getElementById('mTurnDisp');
    if (!d) return;

    d.innerText = (mCurrentTurnId === myClientId) ? "دورك" : "استنى";
}

// الفوز
function checkM() {
    const wins = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],
        [15,16,17,18,19],[20,21,22,23,24],
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],
        [3,8,13,18,23],[4,9,14,19,24],
        [0,6,12,18,24],[4,8,12,16,20]
    ];

    let score = 0;
    wins.forEach(w => { if (w.every(i => mData[i].m)) score++; });

    let word = "MANGO", res = "";
    for (let i = 0; i < 5; i++) {
        res += i < score ? `<span class="crossed">${word[i]}</span>` : word[i];
    }

    document.getElementById('mangoWord').innerHTML = res;

    if (score >= 5) {
        if (roomChannel) {
            roomChannel.send({
                type: 'broadcast',
                event: 'm_win',
                payload: { winner: myClientId }
            });
        }
        showResult(true);
    }
}

// ================== CHAT ==================
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !roomChannel) return;

    roomChannel.send({
        type: 'broadcast',
        event: 'chat_msg',
        payload: { text: msg }
    });

    appendMessage("أنا", msg, "me");
    input.value = '';
}

function appendMessage(sender, text, type) {
    const box = document.getElementById('chatBox');
    const d = document.createElement('div');
    d.className = `msg ${type}`;
    d.innerHTML = `<b>${sender}:</b> ${text}`;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}
function showMangoOnlineSetup() {
    document.getElementById('mangoModeSelect').classList.add('hidden');
    document.getElementById('mangoOnlineSetup').classList.remove('hidden');
}

function backToMangoMode() {
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoModeSelect').classList.remove('hidden');
}