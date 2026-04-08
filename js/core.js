// الإعدادات العامة
const supabaseUrl = 'https://euqgkffgmiqbdmtsnxwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cWdrZmZnbWlxYmRtdHNueHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDU3MzIsImV4cCI6MjA5MTA4MTczMn0.Oe8L89X0dPJXd5oY0vS5KtlNejx5OAL4T2iKTrsPnNM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const myClientId = Math.random().toString(36).substring(7);

let roomChannel = null;
let isHost = false;

// إدارة الواجهات
function switchView(v) {
    const views = ['homeView', 'mangoView', 'guessView', 'xoView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(v);
    if (target) target.classList.remove('hidden');

    if (v === 'homeView') {
        cleanupConnection();
        gameStarted = false;
        if (typeof xoActive !== 'undefined') xoActive = false;
    }
}

function cleanupConnection() {
    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }
}

function showResult(isWin, message = "") {
    const overlay = document.getElementById('finishOverlay');
    const icon = document.getElementById('finishIcon');
    const title = document.getElementById('finishTitle');
    const msg = document.getElementById('finishMsg');

    icon.innerText = isWin ? "🏆" : "💀";
    title.innerText = isWin ? "مبروك الفوز!" : "هارد لك!";
    title.style.color = isWin ? "var(--accent)" : "#ef4444";
    msg.innerText = message || (isWin ? "أداء أسطوري!" : "الخصم كان أسرع.");
    overlay.classList.remove('hidden');
}

function setupConn(code) {
    roomChannel = supabaseClient.channel(`room_${code}`, { config: { broadcast: { self: false } } });
    
    roomChannel
        // --- أحداث اللعبة الأساسية ---
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

        // --- أحداث الشات (التعديل الجديد) ---
        .on('broadcast', { event: 'chat_msg' }, (p) => {
            if (typeof appendMessage === "function") {
                appendMessage("الخصم", p.payload.text, "op");
            }
        })

        // --- أحداث الصوت WebRTC (التعديل الجديد) ---
        .on('broadcast', { event: 'rtc_offer' }, async (p) => {
            if (!peerConnection) initPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(p.payload.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            roomChannel.send({ type: 'broadcast', event: 'rtc_answer', payload: { answer } });
        })
        .on('broadcast', { event: 'rtc_answer' }, async (p) => {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(p.payload.answer));
            }
        })
        .on('broadcast', { event: 'rtc_ice' }, async (p) => {
            if (peerConnection) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(p.payload.candidate));
                } catch (e) { console.error("Error adding ice candidate", e); }
            }
        })

        // --- بقية أحداث اللعبة ---
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
        .subscribe((s) => {
            if(s === 'SUBSCRIBED') {
                const msgEl = document.getElementById('waitMsg');
                if(msgEl) msgEl.innerText = "متصل ✅";
            }
        });
}