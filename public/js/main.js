document.addEventListener('DOMContentLoaded', () => {
  checkUserSession();
  updateCartBadge();
  loadSiteSettings();
});

let currentUser = null;

// Fetch current user session details
async function checkUserSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    
    if (data.success && data.user) {
      currentUser = data.user;

      const userActions = document.getElementById('user-actions');
      if (userActions) {
        let dashboardUrl = '/user-dashboard.html';
        if (currentUser.role === 'admin') {
          dashboardUrl = '/admin-dashboard.html';
        } else if (currentUser.role === 'staff') {
          dashboardUrl = '/staff-dashboard.html';
        }

        userActions.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px;">
            <a href="${dashboardUrl}" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;">
              👤 ${currentUser.fullName} <span class="header-balance">(${currentUser.balance.toLocaleString('vi-VN')}đ)</span>
            </a>
            <button id="logoutBtn" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem; border-color: var(--error); color: var(--error);">
              Đăng xuất
            </button>
          </div>
        `;

        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
      }
    } else {
      const userActions = document.getElementById('user-actions');
      if (userActions) {
        userActions.innerHTML = `
          <a href="/login.html" class="btn btn-outline">Đăng nhập</a>
          <a href="/register.html" class="btn btn-cyan">Đăng ký</a>
        `;
      }
    }

    // Initialize floating chat FAB on public pages (not dashboards) for both guests and members
    const isDashboardPage = window.location.pathname.includes('dashboard.html');
    if (!isDashboardPage) {
      initFloatingChat();
    }
  } catch (error) {
    console.error('Session check failed:', error);
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.showToast('Đăng xuất thành công!', 'success');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Global cart count tracker
function updateCartBadge() {
  const cartBadge = document.getElementById('cart-badge');
  if (!cartBadge) return;

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  cartBadge.textContent = cart.length;
}

// Load configurations dynamically to DOM
async function loadSiteSettings() {
  try {
    const res = await fetch('/api/site-settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      
      // Update logo
      const logoImg = document.getElementById('site-logo');
      if (logoImg) logoImg.src = s.logo;

      // Update contact details
      const phoneElems = document.querySelectorAll('.site-phone');
      phoneElems.forEach(el => el.textContent = s.contactPhone);

      const emailElems = document.querySelectorAll('.site-email');
      emailElems.forEach(el => el.textContent = s.contactEmail);

      const addressElems = document.querySelectorAll('.site-address');
      addressElems.forEach(el => el.textContent = s.address);

      // Update social links
      const fbLink = document.getElementById('site-facebook');
      if (fbLink) fbLink.href = s.facebookUrl || '#';

      const ytLink = document.getElementById('site-youtube');
      if (ytLink) ytLink.href = s.youtubeUrl || '#';

      // Update banner details (for index.html)
      const bannerTitle = document.getElementById('banner-title');
      if (bannerTitle) bannerTitle.textContent = s.bannerTitle;

      const bannerSubtitle = document.getElementById('banner-subtitle');
      if (bannerSubtitle) bannerSubtitle.textContent = s.bannerSubtitle;

      const heroSection = document.getElementById('hero-section');
      if (heroSection && s.bannerImage) {
        heroSection.style.backgroundImage = `linear-gradient(rgba(10, 11, 14, 0.7), rgba(10, 11, 14, 0.9)), url(${s.bannerImage})`;
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ----------------------------------------------------
// FLOATING CHAT WIDGET CSKH FOR CLIENTS
// ----------------------------------------------------
let floatingChatInterval = null;
let chatRoomId = localStorage.getItem('chat_room_id');
if (!chatRoomId) {
  chatRoomId = 'room_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  localStorage.setItem('chat_room_id', chatRoomId);
}
let senderName = localStorage.getItem('chat_sender_name') || 'Khách vãng lai';

async function initFloatingChat() {
  // Sync details if logged in
  if (currentUser) {
    chatRoomId = currentUser._id;
    senderName = currentUser.fullName || currentUser.username;
    localStorage.setItem('chat_room_id', chatRoomId);
    localStorage.setItem('chat_sender_name', senderName);
  }

  // Inject HTML structure for floating FAB and popup
  const chatHtml = `
   <div id="floating-chat-fab" style="position: fixed; bottom: 30px; right: 30px; z-index: 1000; cursor: pointer; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple)); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,240,255,0.4); transition: var(--transition);">
     <span style="font-size: 1.8rem; color: black;">💬</span>
   </div>
   <div id="floating-chat-popup" class="glass" style="position: fixed; bottom: 100px; right: 30px; z-index: 1000; width: 350px; height: 450px; display: none; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); animation: modalFadeIn 0.3s ease;">
     <div style="padding: 15px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center;">
       <h4 style="color: var(--accent-cyan); font-weight: bold;">Hỗ trợ trực tuyến</h4>
       <button id="floating-chat-close" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">&times;</button>
     </div>
     <div id="floating-chat-name-area" style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
       <label for="floating-chat-sender-name" style="color: var(--text-muted); white-space: nowrap;">Tên bạn:</label>
       <input type="text" id="floating-chat-sender-name" class="form-control" style="padding: 2px 8px; height: 26px; font-size: 0.8rem; color: white; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 4px;" value="${senderName}">
     </div>
     <div id="floating-chat-messages" style="flex-grow: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.2);">
       <p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin: auto;">Đang kết nối...</p>
     </div>
     <div style="padding: 10px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; background: rgba(20,22,30,0.6);">
       <input type="text" id="floating-chat-input" class="form-control" placeholder="Nhập tin nhắn..." style="padding: 8px 12px; font-size: 0.9rem;">
       <button id="floating-chat-send" class="btn btn-cyan" style="padding: 8px 16px; font-size: 0.85rem;">Gửi</button>
     </div>
   </div>
  `;
  
  const div = document.createElement('div');
  div.innerHTML = chatHtml;
  document.body.appendChild(div);

  const fab = document.getElementById('floating-chat-fab');
  const popup = document.getElementById('floating-chat-popup');
  const closeBtn = document.getElementById('floating-chat-close');
  const nameInput = document.getElementById('floating-chat-sender-name');
  const sendBtn = document.getElementById('floating-chat-send');
  const input = document.getElementById('floating-chat-input');

  if (currentUser) {
    nameInput.disabled = true; // Registered users cannot change name
  } else {
    nameInput.addEventListener('change', () => {
      senderName = nameInput.value.trim() || 'Khách vãng lai';
      localStorage.setItem('chat_sender_name', senderName);
    });
  }

  // Toggle active chat view
  fab.onclick = () => {
    if (popup.style.display === 'none') {
      popup.style.display = 'flex';
      loadFloatingMessages();
      startFloatingMessagePolling();
    } else {
      popup.style.display = 'none';
      stopFloatingMessagePolling();
    }
  };

  closeBtn.onclick = () => {
    popup.style.display = 'none';
    stopFloatingMessagePolling();
  };

  sendBtn.onclick = sendFloatingMessage;
  input.onkeypress = (e) => {
    if (e.key === 'Enter') sendFloatingMessage();
  };
}

function startFloatingMessagePolling() {
  if (floatingChatInterval) clearInterval(floatingChatInterval);
  floatingChatInterval = setInterval(loadFloatingMessages, 5000);
}

function stopFloatingMessagePolling() {
  if (floatingChatInterval) {
    clearInterval(floatingChatInterval);
    floatingChatInterval = null;
  }
}

async function loadFloatingMessages() {
  try {
    const res = await fetch(`/api/chat/room/${chatRoomId}`);
    const data = await res.json();
    if (data.success) {
      renderFloatingBubbles(data.messages);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderFloatingBubbles(messages) {
  const container = document.getElementById('floating-chat-messages');
  if (!container) return;
  const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

  container.innerHTML = '';
  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin: auto;">Nhập tin nhắn để được hỗ trợ trực tuyến!</p>';
    return;
  }

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    const isMe = msg.senderRole === 'customer' || msg.senderRole === 'guest';
    
    bubble.style.cssText = `
      align-self: ${isMe ? 'flex-end' : 'flex-start'};
      background: ${isMe ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)'};
      color: ${isMe ? 'black' : 'white'};
      padding: 8px 12px;
      border-radius: 10px;
      max-width: 80%;
      border-bottom-${isMe ? 'right' : 'left'}-radius: 2px;
      word-break: break-word;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;
    `;
    const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    bubble.innerHTML = `
      <div style="font-size: 0.65rem; opacity: 0.7; margin-bottom: 2px; font-weight: bold; color: ${isMe ? 'inherit' : 'var(--accent-cyan)'};">${msg.senderName} (${msg.senderRole === 'admin' ? 'QTV' : msg.senderRole === 'staff' ? 'NV' : 'Khách'})</div>
      <div>${msg.message}</div>
      <div style="font-size: 0.65rem; opacity: 0.6; text-align: right; margin-top: 3px;">${timeStr}</div>
    `;
    container.appendChild(bubble);
  });

  if (isNearBottom || container.scrollTop === 0) {
    container.scrollTop = container.scrollHeight;
  }
}

async function sendFloatingMessage() {
  const input = document.getElementById('floating-chat-input');
  const content = input.value.trim();
  if (!content) return;

  try {
    input.value = '';
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatRoomId,
        message: content,
        senderName
      })
    });
    const data = await res.json();
    if (data.success) {
      loadFloatingMessages();
    }
  } catch (err) {
    console.error(err);
  }
}

window.checkUserSession = checkUserSession;
window.updateCartBadge = updateCartBadge;

