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

        const truncatedName = currentUser.fullName.length > 15 
          ? currentUser.fullName.substring(0, 15) + '...' 
          : currentUser.fullName;
        const avatarChar = currentUser.fullName.charAt(0).toUpperCase();

        userActions.innerHTML = `
          <div class="header-dropdown" id="headerDropdown">
            <button class="header-dropdown-toggle" id="headerDropdownBtn">
              <div class="header-avatar">${avatarChar}</div>
              <span>Tài khoản</span>
            </button>
            <div class="header-dropdown-menu" id="headerDropdownMenu">
              <div class="header-dropdown-header">
                <div class="header-user-name" title="${currentUser.fullName}">${truncatedName}</div>
                <div class="header-user-balance">Số dư: ${currentUser.balance.toLocaleString('vi-VN')}đ</div>
              </div>
              <a href="${dashboardUrl}?tab=profile" class="header-dropdown-item">👤 Trang cá nhân</a>
              <a href="${dashboardUrl}?tab=orders" class="header-dropdown-item">📦 Đơn hàng của tôi</a>
              <div class="header-dropdown-item logout" id="headerLogoutBtn">🚪 Đăng xuất</div>
            </div>
          </div>
        `;

        document.getElementById('headerLogoutBtn').addEventListener('click', handleLogout);

        const dropdownBtn = document.getElementById('headerDropdownBtn');
        const dropdownMenu = document.getElementById('headerDropdownMenu');
        if (dropdownBtn && dropdownMenu) {
          dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
          });
        }
      }
    } else {
      const userActions = document.getElementById('user-actions');
      if (userActions) {
        userActions.innerHTML = `
          <div class="header-dropdown" id="headerDropdown">
            <button class="header-dropdown-toggle" id="headerDropdownBtn">
              <div class="header-avatar" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">👤</div>
              <span>Tài khoản</span>
            </button>
            <div class="header-dropdown-menu" id="headerDropdownMenu" style="min-width: 160px; padding: 8px;">
              <a href="/login.html" class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.85rem; padding: 6px 12px; margin-bottom: 6px; border-radius: 6px;">Đăng nhập</a>
              <a href="/register.html" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size: 0.85rem; padding: 6px 12px; border-radius: 6px;">Đăng ký</a>
            </div>
          </div>
        `;

        const dropdownBtn = document.getElementById('headerDropdownBtn');
        const dropdownMenu = document.getElementById('headerDropdownMenu');
        if (dropdownBtn && dropdownMenu) {
          dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
          });
        }
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

  // Fetch settings to check configured social links
  let settings = {};
  try {
    const res = await fetch('/api/site-settings');
    const data = await res.json();
    if (data.success && data.settings) {
      settings = data.settings;
    }
  } catch (err) {
    console.error(err);
  }

  let optionsHtml = '';
  if (settings.zaloLink) {
    optionsHtml += `
      <a href="${settings.zaloLink}" target="_blank" class="social-icon zalo" title="Chat Zalo">
        <svg viewBox="0 0 40 40" width="24" height="24" fill="white" style="display: block;">
          <path d="M26 27h-11.5v-2.3l6.5-8.2h-6.2v-3.5h11v2.3l-6.5 8.2h6.7z"/>
        </svg>
      </a>
    `;
  }
  if (settings.facebookLink) {
    optionsHtml += `
      <a href="${settings.facebookLink}" target="_blank" class="social-icon fb" title="Messenger">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="display: block;">
          <path d="M12 2C6.36 2 2 6.13 2 11.5c0 2.9 1.25 5.5 3.28 7.3V22l3.07-1.69c1.13.31 2.33.49 3.65.49 5.64 0 10-4.13 10-9.5S17.64 2 12 2zm1.44 11.5L11 11.2l-3.2 3.2 3.52-3.7 2.44 2.3 3.2-3.2-3.52 3.7z"/>
        </svg>
      </a>
    `;
  }
  if (settings.tiktokLink) {
    optionsHtml += `
      <a href="${settings.tiktokLink}" target="_blank" class="social-icon tiktok" title="TikTok">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="white" style="display: block;">
          <path d="M12.525.02c1.31 0 2.59.31 3.75.91V5.2c-.8-.26-1.65-.41-2.52-.41h-.63V15.7c0 2.36-1.92 4.28-4.28 4.28-2.36 0-4.28-1.92-4.28-4.28s1.92-4.28 4.28-4.28c.36 0 .7.05 1.03.14V7.12a8.55 8.55 0 0 0-1.03-.06c-4.75 0-8.6 3.85-8.6 8.6s3.85 8.6 8.6 8.6 8.6-3.85 8.6-8.6V4.82c1.42 1.01 3.16 1.61 5.04 1.61V.02h-8.31z"/>
        </svg>
      </a>
    `;
  }
  optionsHtml += `
    <button id="open-cskh-chat-btn" class="social-icon cskh-chat" title="Hỗ trợ trực tuyến" style="border:none; cursor:pointer; display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="black" style="display: block;">
        <path d="M12 2C6.48 2 2 6.48 2 12v7c0 1.1.9 2 2 2h3v-8H4v-1c0-4.41 3.59-8 8-8s8 3.59 8 8v1h-3v8h3c1.1 0 2-.9 2-2v-7c0-5.52-4.48-10-10-10z"/>
      </svg>
    </button>
  `;

  // Inject HTML structure for floating FAB and popup
  const chatHtml = `
    <div class="social-chat-widget" id="socialChatWidget">
      <div class="social-chat-options" id="socialChatOptions">
        ${optionsHtml}
      </div>
      <button class="social-chat-main" id="socialChatMainBtn" style="display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="black" style="display: block;">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
      </button>
    </div>

    <div id="floating-chat-popup" class="glass" style="position: fixed; bottom: 100px; right: 30px; z-index: 10000; width: 350px; height: 450px; display: none; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); animation: modalFadeIn 0.3s ease;">
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

  const mainBtn = document.getElementById('socialChatMainBtn');
  const widget = document.getElementById('socialChatWidget');
  const cskhBtn = document.getElementById('open-cskh-chat-btn');
  const popup = document.getElementById('floating-chat-popup');
  const closeBtn = document.getElementById('floating-chat-close');
  const nameInput = document.getElementById('floating-chat-sender-name');
  const sendBtn = document.getElementById('floating-chat-send');
  const input = document.getElementById('floating-chat-input');

  if (currentUser) {
    if (nameInput) nameInput.disabled = true; // Registered users cannot change name
  } else if (nameInput) {
    nameInput.addEventListener('change', () => {
      senderName = nameInput.value.trim() || 'Khách vãng lai';
      localStorage.setItem('chat_sender_name', senderName);
    });
  }

  // Toggle options on click
  mainBtn.onclick = (e) => {
    e.stopPropagation();
    widget.classList.toggle('active');
  };

  // Close options when click elsewhere
  document.addEventListener('click', () => {
    widget.classList.remove('active');
  });

  if (cskhBtn) {
    cskhBtn.onclick = (e) => {
      e.stopPropagation();
      widget.classList.remove('active');
      if (popup.style.display === 'none') {
        popup.style.display = 'flex';
        loadFloatingMessages();
        startFloatingMessagePolling();
      } else {
        popup.style.display = 'none';
        stopFloatingMessagePolling();
      }
    };
  }

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

document.addEventListener('click', (e) => {
  const menu = document.getElementById('headerDropdownMenu');
  const btn = document.getElementById('headerDropdownBtn');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('active');
  }
});

