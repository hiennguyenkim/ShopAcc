(function() {
  // 1. Initialize session room ID for guests
  let chatRoomId = localStorage.getItem('chat_room_id');
  if (!chatRoomId) {
    chatRoomId = 'room_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('chat_room_id', chatRoomId);
  }

  let senderName = localStorage.getItem('chat_sender_name') || 'Khách vãng lai';
  let isChatOpen = false;
  let chatInterval = null;

  // 2. Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    .support-chat-wrapper {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: 'Inter', sans-serif;
    }
    .chat-trigger {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #06b6d4);
      box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      color: white;
      font-size: 24px;
    }
    .chat-trigger:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 6px 24px rgba(6, 182, 212, 0.6);
    }
    .chat-window {
      position: absolute;
      bottom: 75px;
      right: 0;
      width: 350px;
      height: 480px;
      border-radius: 16px;
      background: rgba(18, 18, 24, 0.75);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(20px) scale(0.9);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .chat-window.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    .chat-header {
      padding: 15px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2));
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chat-header h4 {
      margin: 0;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
    }
    .chat-header .chat-close {
      cursor: pointer;
      color: rgba(255, 255, 255, 0.6);
      font-size: 18px;
      transition: color 0.2s;
    }
    .chat-header .chat-close:hover {
      color: white;
    }
    .chat-name-prompt {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .chat-name-prompt label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      white-space: nowrap;
    }
    .chat-name-prompt input {
      background: transparent;
      border: none;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
      color: #06b6d4;
      font-size: 0.75rem;
      padding: 2px 0;
      width: 100%;
      outline: none;
    }
    .chat-body {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-bubble-w {
      display: flex;
      flex-direction: column;
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 0.85rem;
      line-height: 1.4;
      word-break: break-word;
    }
    .chat-bubble-w.received {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.06);
      color: white;
      border-bottom-left-radius: 2px;
    }
    .chat-bubble-w.sent {
      align-self: flex-end;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      border-bottom-right-radius: 2px;
    }
    .chat-bubble-w .sender {
      font-size: 0.65rem;
      font-weight: bold;
      margin-bottom: 4px;
      opacity: 0.8;
    }
    .chat-bubble-w.sent .sender {
      color: #a5f3fc;
    }
    .chat-bubble-w.received .sender {
      color: #818cf8;
    }
    .chat-bubble-w .time {
      font-size: 0.6rem;
      opacity: 0.5;
      text-align: right;
      margin-top: 4px;
    }
    .chat-footer {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 8px;
    }
    .chat-footer input {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      outline: none;
      font-size: 0.85rem;
      transition: border-color 0.2s;
    }
    .chat-footer input:focus {
      border-color: #06b6d4;
    }
    .chat-footer button {
      background: #06b6d4;
      color: black;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      transition: opacity 0.2s;
      font-size: 0.85rem;
    }
    .chat-footer button:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);

  // 3. Inject HTML Elements
  const wrapper = document.createElement('div');
  wrapper.className = 'support-chat-wrapper';
  wrapper.innerHTML = `
    <div class="chat-trigger" id="widget-chat-trigger" title="Hỗ trợ trực tuyến">
      💬
    </div>
    <div class="chat-window" id="widget-chat-window">
      <div class="chat-header">
        <h4>💬 Trò chuyện hỗ trợ</h4>
        <div class="chat-close" id="widget-chat-close">&times;</div>
      </div>
      <div class="chat-name-prompt">
        <label for="widget-sender-name">Tên bạn:</label>
        <input type="text" id="widget-sender-name" value="${senderName}" placeholder="Nhập tên của bạn...">
      </div>
      <div class="chat-body" id="widget-chat-body">
        <div class="chat-bubble-w received">
          <div class="sender">Hệ thống</div>
          <div>Xin chào! Bạn cần hỗ trợ gì? Hãy nhập câu hỏi dưới đây nhé.</div>
          <div class="time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <div class="chat-footer">
        <input type="text" id="widget-chat-input" placeholder="Nhập tin nhắn..." autocomplete="off">
        <button id="widget-chat-send">Gửi</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // 4. Client Login check to sync username/chatRoomId
  async function syncUserAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        chatRoomId = data.user._id;
        senderName = data.user.fullName || data.user.username;
        localStorage.setItem('chat_room_id', chatRoomId);
        localStorage.setItem('chat_sender_name', senderName);
        const nameInput = document.getElementById('widget-sender-name');
        if (nameInput) {
          nameInput.value = senderName;
          nameInput.disabled = true; // disable name change for registered users
        }
      }
    } catch (e) {
      // not logged in, keep guest session
    }
  }
  syncUserAuth();

  // 5. Chat Interaction Handlers
  const trigger = document.getElementById('widget-chat-trigger');
  const chatWindow = document.getElementById('widget-chat-window');
  const closeBtn = document.getElementById('widget-chat-close');
  const nameInput = document.getElementById('widget-sender-name');
  const sendBtn = document.getElementById('widget-chat-send');
  const chatInput = document.getElementById('widget-chat-input');
  const chatBody = document.getElementById('widget-chat-body');

  trigger.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  
  nameInput.addEventListener('change', () => {
    senderName = nameInput.value.trim() || 'Khách vãng lai';
    localStorage.setItem('chat_sender_name', senderName);
  });

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  function toggleChat() {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
      chatWindow.classList.add('open');
      trigger.innerHTML = '&times;';
      loadMessages();
      chatInterval = setInterval(loadMessages, 4000);
    } else {
      chatWindow.classList.remove('open');
      trigger.innerHTML = '💬';
      clearInterval(chatInterval);
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/chat/room/${chatRoomId}`);
      const data = await res.json();
      if (data.success && data.messages.length > 0) {
        renderBubbles(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderBubbles(messages) {
    const isNearBottom = chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < 80;
    
    // Preserve welcome message
    chatBody.innerHTML = `
      <div class="chat-bubble-w received">
        <div class="sender">Hệ thống</div>
        <div>Xin chào! Bạn cần hỗ trợ gì? Hãy nhập câu hỏi dưới đây nhé.</div>
        <div class="time">${new Date(messages[0].createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;

    messages.forEach(msg => {
      const bubble = document.createElement('div');
      const isMe = msg.senderRole === 'customer' || msg.senderRole === 'guest';
      bubble.className = `chat-bubble-w ${isMe ? 'sent' : 'received'}`;
      
      const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      bubble.innerHTML = `
        <div class="sender">${msg.senderName} (${msg.senderRole === 'admin' ? 'QTV' : msg.senderRole === 'staff' ? 'NV' : 'Khách'})</div>
        <div>${msg.message}</div>
        <div class="time">${timeStr}</div>
      `;
      chatBody.appendChild(bubble);
    });

    if (isNearBottom || chatBody.scrollTop === 0) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    
    // Optimistic UI append
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-w sent';
    bubble.innerHTML = `
      <div class="sender">${senderName}</div>
      <div>${message}</div>
      <div class="time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatRoomId,
          message,
          senderName
        })
      });
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  }
})();
