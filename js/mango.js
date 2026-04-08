if (typeof window.isHost === 'undefined') { window.isHost = false; }

let mData = [], mCount = 1, mStarted = false;
let mangoOnline = false, maxPlayers = 2;
let mRoomCode = null;
let mCurrentTurnId = null;

// --- واجهات التحكم ---

function showMangoOnlineSetup() {
    document.getElementById('mangoModeSelect').classList.add('hidden');
    document.getElementById('mangoOnlineSetup').classList.remove('hidden');
    
    // إظهار الأزرار الأساسية (إنشاء/انضمام)
    const entryActions = document.getElementById('mangoEntryActions');
    entryActions.style.display = 'block';
    
    // التأكد إن الإعدادات مخفية في البداية
    const hostOptions = document.getElementById('mangoHostOptions');
    hostOptions.classList.add('hidden');
    hostOptions.style.display = 'none';
}

function hostMango() {
    window.isHost = true;
    mangoOnline = true;

    // 1. إخفاء أزرار (إنشاء/انضمام) فقط عشان هما والأب بتاعهم واحد
    const hostBtn = document.querySelector('button[onclick="hostMango()"]');
    const joinBtn = document.querySelector('button[onclick*="mangoJoinBox"]');
    const backBtn = document.querySelector('button[onclick="backToMangoMode()"]');
    
    if(hostBtn) hostBtn.style.display = 'none';
    if(joinBtn) joinBtn.style.display = 'none';

    // 2. إظهار خيارات عدد اللاعبين
    const hostOptions = document.getElementById('mangoHostOptions');
    if (hostOptions) {
        hostOptions.classList.remove('hidden');
        hostOptions.style.display = 'block';
    }
}

async function setMaxPlayers(n) {
    maxPlayers = n;
    mRoomCode = Math.floor(1000 + Math.random() * 9000);
    
    if (typeof setupMangoConn === 'function') {
        setupMangoConn(mRoomCode);
    }
    
    document.getElementById('mRoomCodeDisp').innerText = "كود الغرفة: " + mRoomCode;
    document.getElementById('mPlayersCount').innerText = `بانتظار اللاعبين... (0/${maxPlayers})`;
    
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.remove('hidden');
    
    initMango();
}

function joinMango() {
    const code = document.getElementById('mRoomID').value;
    if (!code) return alert("أدخل الكود");
    
    window.isHost = false;
    mangoOnline = true;
    mRoomCode = code;
    
    if (typeof setupMangoConn === 'function') {
        setupMangoConn(code);
    }
    
    document.getElementById('mRoomCodeDisp').innerText = "غرفة رقم: " + code;
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoPlayArea').classList.remove('hidden');
    document.getElementById('mOnlineHeader').classList.remove('hidden');
    
    initMango();
}

// --- منطق اللعبة ---

function initMango() {
    const g = document.getElementById('grid');
    if (!g) return;
    
    g.innerHTML = '';
    mData = new Array(25).fill(null).map(() => ({v: null, m: false}));
    mCount = 1; 
    mStarted = false;
    
    document.getElementById('mangoWord').innerHTML = '';
    document.getElementById('mangoStartBtn').classList.add('hidden');
    
    for(let i=0; i<25; i++) {
        const c = document.createElement('div');
        c.className = 'cell';
        c.onclick = () => handleCellClick(i, c);
        g.appendChild(c);
    }
}

function handleCellClick(i, el) {
    if (!mStarted) {
        if (mData[i].v !== null || mCount > 25) return;
        mData[i].v = mCount;
        el.innerText = mCount++;
        el.classList.add('occupied');
        
        if (mCount === 26 && (!mangoOnline || window.isHost)) {
            document.getElementById('mangoStartBtn').classList.remove('hidden');
        }
    } else {
        if (mangoOnline && mCurrentTurnId !== (window.myClientId || null)) return;
        if (mData[i].v && !mData[i].m) {
            if (mangoOnline) {
                if (typeof broadcastMark === 'function') broadcastMark(mData[i].v);
            } else {
                markNumberLocally(mData[i].v);
            }
        }
    }
}

function markNumberLocally(num) {
    const idx = mData.findIndex(item => item.v === num);
    if (idx !== -1 && !mData[idx].m) {
        mData[idx].m = true;
        const cells = document.querySelectorAll('#grid .cell');
        if(cells[idx]) cells[idx].classList.add('marked');
        checkM();
    }
}

function checkM() {
    const wins = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
        [0,6,12,18,24],[4,8,12,16,20]
    ];
    let score = 0;
    wins.forEach(w => { if(w.every(i => mData[i].m)) score++; });
    
    let word = "MANGO", res = "";
    for(let i=0; i<5; i++) {
        res += i < score ? `<span class="crossed">${word[i]}</span>` : word[i];
    }
    document.getElementById('mangoWord').innerHTML = res;
    
    if (score >= 5) alert("Winner! 🍉");
}

function backToMangoMode() {
    document.getElementById('mangoOnlineSetup').classList.add('hidden');
    document.getElementById('mangoModeSelect').classList.remove('hidden');
}