let localStream = null;
let peerConnection = null;

// --- منطق الشات ---
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !roomChannel) return;

    roomChannel.send({
        type: 'broadcast',
        event: 'chat_msg',
        payload: { id: myClientId, text: msg }
    });
    
    appendMessage("أنا", msg, "me");
    input.value = '';
}

function appendMessage(sender, text, type) {
    const box = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${type}`;
    msgDiv.innerHTML = `<b>${sender}:</b> ${text}`;
    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
}

// --- منطق المايك (الأساسيات) ---
async function toggleMic() {
    const btn = document.getElementById('micBtn');
    if (!localStream) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            btn.innerText = "🎤 المايك مفتوح";
            btn.style.background = "var(--accent)";
            // هنا بنبدأ عملية الربط (WebRTC Signaling) مع الخصم
            startVoiceConnection();
        } catch (err) {
            alert("لازم تسمح بالوصول للمايك!");
        }
    } else {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
        btn.innerText = "🔇 المايك مقفول";
        btn.style.background = "var(--secondary)";
    }
}

// ملاحظة: الـ WebRTC محتاج Signaling Server (إحنا هنستخدم نفس قناة Supabase)
function startVoiceConnection() {
    console.log("جارٍ تجهيز اتصال الصوت...");
    // كود الربط المباشر بين الجهازين بيتحط هنا
}