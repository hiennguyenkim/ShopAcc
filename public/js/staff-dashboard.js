document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadStaffProfile();
  loadOverviewStats();
  loadOrders();
  loadContacts();

  // Search & Filter event bindings
  document.getElementById('order-search').addEventListener('input', loadOrders);
  document.getElementById('order-status-filter').addEventListener('change', loadOrders);

  // Setup Chat events
  document.getElementById('chat-search-input').addEventListener('input', filterConversations);
  document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
  document.getElementById('chat-reply-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Setup Product events
  document.getElementById('product-search').addEventListener('input', debounce(() => {
    productPage = 1;
    loadProducts();
  }, 400));
  document.getElementById('product-game-filter').addEventListener('change', () => {
    productPage = 1;
    loadProducts();
  });
  document.getElementById('product-status-filter').addEventListener('change', () => {
    productPage = 1;
    loadProducts();
  });

  // Setup Manual Order search
  document.getElementById('manual-search-nick').addEventListener('input', debounce(searchManualNick, 300));

  // Setup Direct Handover search
  document.getElementById('handover-search-nick').addEventListener('input', debounce(searchHandoverNick, 300));
});

// Helper debounce function
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Global state variables
let activeChatUserId = null;
let chatPollingInterval = null;
let allConversations = [];

let productPage = 1;

let manualSelectedAccounts = [];
let currentManualStep = 1;

let handoverSelectedAccount = null;
let currentHandoverStep = 1;

function setupTabs() {
  const items = document.querySelectorAll('.dashboard-nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const targetTab = item.getAttribute('data-tab');
      document.querySelectorAll('.dashboard-tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.getElementById(targetTab).classList.add('active');

      // Tab specific initializers
      if (targetTab === 'chat-tab') {
        loadConversations();
        startChatPolling();
      } else {
        stopChatPolling();
      }

      if (targetTab === 'products-tab') {
        productPage = 1;
        loadProducts();
      }

      if (targetTab === 'confirm-payment-tab') {
        loadPendingConfirmOrders();
      }

      if (targetTab === 'orders-tab') {
        loadOrders();
      }

      if (targetTab === 'overview-tab') {
        loadOverviewStats();
      }
    });
  });
}

async function loadStaffProfile() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      document.getElementById('sidebar-name').textContent = data.user.fullName;
      document.getElementById('sidebar-avatar').textContent = data.user.fullName[0].toUpperCase();
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadOverviewStats() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      const orders = data.orders;
      
      const pendingConfirmCount = orders.filter(o => o.orderStatus === 'pending_confirm').length;
      const deliveringCount = orders.filter(o => o.orderStatus === 'delivering').length;
      const completedCount = orders.filter(o => o.orderStatus === 'completed').length;

      document.getElementById('stat-pending-confirm').textContent = pendingConfirmCount;
      document.getElementById('stat-delivering').textContent = deliveringCount;
      document.getElementById('stat-completed').textContent = completedCount;
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// ORDER MANAGEMENT
// ----------------------------------------------------
async function loadOrders() {
  try {
    const tbody = document.getElementById('staff-orders-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Đang tải danh sách đơn...</td></tr>';

    const search = document.getElementById('order-search').value.trim();
    const status = document.getElementById('order-status-filter').value;

    let url = '/api/orders?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (status) url += `orderStatus=${status}&`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.orders.length > 0) {
      tbody.innerHTML = '';
      data.orders.forEach(o => {
        const tr = document.createElement('tr');
        
        const statusLabels = {
          pending_payment: 'Chờ chuyển khoản',
          pending_confirm: 'Chờ duyệt',
          paid: 'Đã thanh toán',
          delivering: 'Đang bàn giao',
          completed: 'Hoàn thành',
          cancelled: 'Đã hủy',
          refunded: 'Đã hoàn tiền',
          dispute: 'Đang khiếu nại'
        };

        const paymentLabels = {
          unpaid: 'Chưa thanh toán',
          waiting_confirm: 'Chờ duyệt',
          paid: 'Đã thanh toán',
          refunded: 'Đã hoàn tiền'
        };

        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold;">${o.orderCode}</td>
          <td>${o.customerInfo.fullName}</td>
          <td>${o.customerInfo.phone}</td>
          <td style="font-weight: 700; color: white;">${o.total.toLocaleString('vi-VN')}đ</td>
          <td><span class="status-badge ${o.orderStatus}">${statusLabels[o.orderStatus] || o.orderStatus}</span></td>
          <td><span class="status-badge ${o.paymentStatus}">${paymentLabels[o.paymentStatus] || o.paymentStatus}</span></td>
          <td>
            <button onclick="handleOrderAction('${o._id}')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Xem & xử lý</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Không tìm thấy đơn hàng nào.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleOrderAction(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();

    if (data.success) {
      const o = data.order;
      document.getElementById('modal-order-code-title').textContent = `ĐƠN HÀNG: ${o.orderCode}`;
      
      const body = document.getElementById('staff-order-modal-body');
      const footer = document.getElementById('staff-order-modal-footer');

      let itemsListHtml = '';
      o.items.forEach(item => {
        itemsListHtml += `
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between;">
              <strong>${item.name}</strong>
              <strong>${item.price.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div style="font-size: 0.85rem; color: var(--accent-cyan); margin-top: 4px;">Mã số: ${item.code}</div>
            
            ${item.loginInfo ? `
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; margin-top: 8px; border: 1px dashed rgba(255,255,255,0.1);">
                <p style="font-size: 0.85rem; color: var(--text-muted);">🔑 Thông tin acc trong kho:</p>
                <p style="margin-top: 4px;">User: <strong style="font-family: monospace; color: white;">${item.loginInfo.username}</strong> | Pass: <strong style="font-family: monospace; color: white;">${item.loginInfo.password}</strong></p>
                <p style="font-size: 0.8rem; color: var(--warning); margin-top: 2px;">Hình thức: ${item.loginInfo.loginMethod} ${item.loginInfo.securityNote ? `| Chú ý: ${item.loginInfo.securityNote}` : ''}</p>
              </div>
            ` : ''}
          </div>
        `;
      });

      body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 0.9rem;">
          <div>
            <p style="color: var(--text-muted);">Họ tên khách: <strong style="color: white;">${o.customerInfo.fullName}</strong></p>
            <p style="color: var(--text-muted); margin-top: 6px;">SĐT khách: <strong style="color: white;">${o.customerInfo.phone}</strong></p>
            <p style="color: var(--text-muted); margin-top: 6px;">Email khách: <strong style="color: white;">${o.customerInfo.email || 'Trống'}</strong></p>
          </div>
          <div>
            <p style="color: var(--text-muted);">Trạng thái đơn: <span class="status-badge ${o.orderStatus}">${o.orderStatus}</span></p>
            <p style="color: var(--text-muted); margin-top: 6px;">Hình thức thanh toán: <strong>${o.paymentMethod}</strong></p>
            <p style="color: var(--text-muted); margin-top: 6px;">Tổng thanh toán: <strong class="glow-text-cyan">${o.total.toLocaleString('vi-VN')}đ</strong></p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 8px;">Tài khoản game:</h4>
          ${itemsListHtml}
        </div>

        ${o.staffNote ? `
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-top: 15px;">
            <p style="font-size: 0.85rem; color: var(--text-muted);">Ghi chú xử lý / lý do hủy:</p>
            <p style="color: white; margin-top: 4px;">${o.staffNote}</p>
          </div>
        ` : ''}

        ${o.paymentProof ? `
          <div style="margin-top: 20px; text-align: center;">
            <h4 style="text-align: left; margin-bottom: 8px;">Minh chứng chuyển khoản khách tải lên:</h4>
            <a href="${o.paymentProof}" target="_blank">
              <img src="${o.paymentProof}" style="max-height: 250px; border-radius: 6px; border: 1px solid var(--border-color);" alt="Payment Proof">
            </a>
          </div>
        ` : ''}
      `;

      // Build Action Buttons
      footer.innerHTML = `<button class="btn btn-outline" onclick="closeOrderModal()">Đóng</button>`;
      
      if (o.orderStatus === 'pending_confirm') {
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn btn-cyan';
        btnConfirm.textContent = 'Duyệt thanh toán';
        btnConfirm.style.marginRight = '8px';
        btnConfirm.onclick = async () => {
          if (confirm('Bạn có chắc chắn đã nhận được tiền chuyển khoản từ khách hàng này?')) {
            await executeOrderAction(orderId, 'confirm-payment');
          }
        };

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-danger';
        btnCancel.textContent = 'Từ chối & Hủy';
        btnCancel.style.marginRight = '8px';
        btnCancel.onclick = async () => {
          const reason = prompt('Nhập lý do từ chối và hủy đơn hàng này:');
          if (reason !== null) {
            await executeReviewAction(orderId, 'cancel-payment', { reason });
          }
        };

        const btnReupload = document.createElement('button');
        btnReupload.className = 'btn btn-outline';
        btnReupload.textContent = 'Yêu cầu tải lại minh chứng';
        btnReupload.style.marginRight = '8px';
        btnReupload.style.borderColor = 'var(--warning)';
        btnReupload.style.color = 'var(--warning)';
        btnReupload.onclick = async () => {
          const note = prompt('Nhập ghi chú yêu cầu gửi tới khách hàng:');
          if (note !== null) {
            await executeReviewAction(orderId, 'request-reupload', { note });
          }
        };

        footer.insertBefore(btnConfirm, footer.firstChild);
        footer.insertBefore(btnReupload, footer.firstChild);
        footer.insertBefore(btnCancel, footer.firstChild);
      } else if (o.orderStatus === 'delivering') {
        const btnDeliver = document.createElement('button');
        btnDeliver.className = 'btn btn-purple';
        btnDeliver.textContent = 'Bàn giao nick cho khách';
        btnDeliver.onclick = async () => {
          if (confirm('Xác nhận bàn giao đầy đủ mật khẩu/tài khoản cho khách?')) {
            await executeOrderAction(orderId, 'deliver');
          }
        };
        footer.insertBefore(btnDeliver, footer.firstChild);
      }

      document.getElementById('staff-order-modal-overlay').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

async function executeOrderAction(orderId, endpoint) {
  try {
    const res = await fetch(`/api/orders/${orderId}/${endpoint}`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeOrderModal();
      loadOverviewStats();
      loadOrders();
      loadPendingConfirmOrders();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function executeReviewAction(orderId, endpoint, body) {
  try {
    const res = await fetch(`/api/orders/${orderId}/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeOrderModal();
      loadOverviewStats();
      loadOrders();
      loadPendingConfirmOrders();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

function closeOrderModal() {
  document.getElementById('staff-order-modal-overlay').style.display = 'none';
}

// ----------------------------------------------------
// PAYMENT CONFIRMATION TAB
// ----------------------------------------------------
async function loadPendingConfirmOrders() {
  try {
    const tbody = document.getElementById('staff-pending-confirm-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải danh sách chờ duyệt...</td></tr>';

    const res = await fetch('/api/orders?orderStatus=pending_confirm');
    const data = await res.json();

    if (data.success && data.orders.length > 0) {
      tbody.innerHTML = '';
      data.orders.forEach(o => {
        const tr = document.createElement('tr');
        const timeFormatted = new Date(o.updatedAt).toLocaleString('vi-VN');
        
        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold;">${o.orderCode}</td>
          <td>${o.customerInfo.fullName}<br><small style="color: var(--text-muted);">${o.customerInfo.phone}</small></td>
          <td style="font-weight: 700; color: var(--accent-cyan);">${o.total.toLocaleString('vi-VN')}đ</td>
          <td>${timeFormatted}</td>
          <td>
            ${o.paymentProof ? `
              <a href="${o.paymentProof}" target="_blank" style="color: var(--accent-purple); text-decoration: underline;">Xem ảnh</a>
            ` : 'N/A'}
          </td>
          <td>
            <button onclick="handleOrderAction('${o._id}')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Duyệt / Từ chối / Yêu cầu lại</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Không có đơn hàng nào chờ duyệt thanh toán.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// READ-ONLY PRODUCTS VIEW
// ----------------------------------------------------
async function loadProducts() {
  try {
    const tbody = document.getElementById('staff-products-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Đang tải danh sách sản phẩm...</td></tr>';

    const search = document.getElementById('product-search').value.trim();
    const gameType = document.getElementById('product-game-filter').value;
    const status = document.getElementById('product-status-filter').value;

    let url = `/api/game-accounts?isAdminView=true&limit=10&page=${productPage}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (gameType) url += `&gameType=${gameType}`;
    if (status) url += `&status=${status}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.accounts && data.accounts.length > 0) {
      tbody.innerHTML = '';
      data.accounts.forEach(p => {
        const tr = document.createElement('tr');
        const dateFormatted = new Date(p.createdAt).toLocaleDateString('vi-VN');

        const gameLabels = {
          'lien_quan': 'Liên Quân Mobile',
          'free_fire': 'Free Fire',
          'fifa_mobile': 'FIFA Mobile',
          'lol': 'Liên Minh Huyền Thoại',
          'pubg': 'PUBG Mobile'
        };

        const statusLabels = {
          available: 'Còn hàng',
          reserved: 'Tạm giữ',
          sold: 'Đã bán',
          hidden: 'Tạm ẩn'
        };

        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold;">${p.code}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</td>
          <td>${gameLabels[p.gameType] || p.gameType}</td>
          <td style="font-weight: 700; color: white;">${p.price.toLocaleString('vi-VN')}đ</td>
          <td><span class="status-badge ${p.status}">${statusLabels[p.status] || p.status}</span></td>
          <td>${dateFormatted}</td>
          <td>
            <button onclick="viewProductDetail('${p._id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;">Xem chi tiết</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      renderProductsPagination(data.totalPages);
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Không tìm thấy tài khoản game nào.</td></tr>';
      document.getElementById('staff-products-pagination').innerHTML = '';
    }
  } catch (err) {
    console.error(err);
  }
}

function renderProductsPagination(totalPages) {
  const container = document.getElementById('staff-products-pagination');
  container.innerHTML = '';
  
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn ${i === productPage ? 'btn-cyan' : 'btn-outline'}`;
    btn.style.padding = '4px 10px';
    btn.style.fontSize = '0.85rem';
    btn.textContent = i;
    btn.onclick = () => {
      productPage = i;
      loadProducts();
    };
    container.appendChild(btn);
  }
}

async function viewProductDetail(productId) {
  try {
    const res = await fetch(`/api/game-accounts/${productId}`);
    const data = await res.json();
    if (data.success) {
      const p = data.gameAccount;
      document.getElementById('modal-order-code-title').textContent = `CHI TIẾT SẢN PHẨM: ${p.code}`;
      const body = document.getElementById('staff-order-modal-body');
      const footer = document.getElementById('staff-order-modal-footer');

      body.innerHTML = `
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <img src="${p.images[0] || '/images/card-placeholder.png'}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px;" alt="${p.name}">
          <div>
            <h3>${p.name}</h3>
            <p style="color: var(--accent-cyan); font-weight: bold; font-size: 1.2rem; margin-top: 5px;">${p.price.toLocaleString('vi-VN')}đ</p>
            <p style="color: var(--text-muted); margin-top: 5px;">Game: <strong>${p.gameType}</strong> | Rank: <strong>${p.rank || 'N/A'}</strong></p>
            <p style="color: var(--text-muted); margin-top: 2px;">Server: <strong>${p.server || 'N/A'}</strong> | Cấp độ: <strong>${p.level || 'N/A'}</strong></p>
          </div>
        </div>
        <div>
          <h4>Mô tả sản phẩm:</h4>
          <p style="color: var(--text-muted); white-space: pre-wrap; font-size: 0.9rem; margin-top: 6px;">${p.description || 'Không có mô tả.'}</p>
        </div>
      `;

      footer.innerHTML = `<button class="btn btn-cyan" onclick="closeOrderModal()">Đóng</button>`;
      document.getElementById('staff-order-modal-overlay').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// CHAT CUSTOMER SERVICE (CSKH)
// ----------------------------------------------------
function startChatPolling() {
  if (chatPollingInterval) clearInterval(chatPollingInterval);
  chatPollingInterval = setInterval(() => {
    loadConversations(true);
    if (activeChatUserId) {
      loadMessages(activeChatUserId, true);
    }
  }, 5000);
}

function stopChatPolling() {
  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
    chatPollingInterval = null;
  }
}

async function loadConversations(silent = false) {
  try {
    const res = await fetch('/api/chat/conversations');
    const data = await res.json();
    if (data.success) {
      allConversations = data.conversations;
      renderConversationsList();
    }
  } catch (err) {
    console.error('Lỗi tải cuộc hội thoại:', err);
  }
}

function renderConversationsList() {
  const container = document.getElementById('chat-conversations-list');
  const searchQuery = document.getElementById('chat-search-input').value.toLowerCase().trim();

  const filtered = allConversations.filter(c => c.userName.toLowerCase().includes(searchQuery));

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Không tìm thấy cuộc trò chuyện nào</div>';
    return;
  }

  container.innerHTML = '';
  filtered.forEach(c => {
    const div = document.createElement('div');
    div.className = `conversation-item ${activeChatUserId === c.userId ? 'active' : ''}`;
    div.onclick = () => selectConversation(c.userId, c.userName);

    div.innerHTML = `
      <div class="conversation-info">
        <span class="conversation-name">${c.userName}</span>
        <span class="conversation-last-msg">${c.lastMessage}</span>
      </div>
      ${c.unreadCount > 0 ? `<span class="conversation-badge">${c.unreadCount}</span>` : ''}
    `;
    container.appendChild(div);
  });
}

function filterConversations() {
  renderConversationsList();
}

async function selectConversation(userId, userName) {
  activeChatUserId = userId;
  
  // Highlight active conversation
  const items = document.querySelectorAll('.conversation-item');
  items.forEach(item => item.classList.remove('active'));
  
  // Update header and input state
  document.getElementById('chat-messages-header').innerHTML = `
    <h4>Đang chat với: <span class="glow-text-cyan">${userName}</span></h4>
  `;
  document.getElementById('chat-messages-footer').style.display = 'flex';
  
  // Mark messages as read
  try {
    await fetch('/api/chat/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: userId })
    });
    // Silent reload conversations to clear badge count
    loadConversations(true);
  } catch (err) {
    console.error(err);
  }

  // Load message bubbles
  loadMessages(userId);
}

async function loadMessages(userId, silent = false) {
  try {
    const res = await fetch(`/api/chat/messages?with=${userId}`);
    const data = await res.json();
    if (data.success) {
      const messagesBody = document.getElementById('chat-messages-body');
      
      let html = '';
      if (data.messages.length === 0) {
        html = '<div class="chat-messages-placeholder">Chưa có tin nhắn nào. Gửi lời chào để bắt đầu!</div>';
      } else {
        data.messages.forEach(msg => {
          const isSentByMe = msg.senderId._id.toString() !== userId.toString();
          const time = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          html += `
            <div class="chat-bubble ${isSentByMe ? 'sent' : 'received'}">
              <div>${msg.content}</div>
              <div class="chat-time">${time}</div>
            </div>
          `;
        });
      }
      messagesBody.innerHTML = html;
      
      // Scroll to bottom on new messages
      if (!silent) {
        messagesBody.scrollTop = messagesBody.scrollHeight;
      }
    }
  } catch (err) {
    console.error('Lỗi tải tin nhắn:', err);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-reply-input');
  const content = input.value.trim();
  if (!content || !activeChatUserId) return;

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: activeChatUserId, content })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      await loadMessages(activeChatUserId);
      loadConversations(true);
    }
  } catch (err) {
    console.error('Lỗi gửi tin nhắn:', err);
  }
}

// ----------------------------------------------------
// MANUAL ORDER WIZARD FLOW
// ----------------------------------------------------
function nextManualStep(step) {
  if (step === 2) {
    // Validate customerInfo in step 1
    const name = document.getElementById('manual-customer-name').value.trim();
    const phone = document.getElementById('manual-customer-phone').value.trim();
    if (!name || !phone) {
      window.showToast('Vui lòng điền Họ tên và Số điện thoại khách hàng.', 'error');
      return;
    }
  }
  if (step === 3) {
    if (manualSelectedAccounts.length === 0) {
      window.showToast('Vui lòng chọn ít nhất 1 tài khoản game.', 'error');
      return;
    }
    // Render Step 3 Order summary preview
    renderManualOrderSummary();
  }

  currentManualStep = step;
  document.querySelectorAll('#manual-order-tab .order-step-content').forEach(div => div.style.display = 'none');
  document.getElementById(`manual-step-${step}`).style.display = 'block';

  document.querySelectorAll('#manual-order-tab .step-badge').forEach((badge, idx) => {
    if (idx + 1 <= step) badge.classList.add('active');
    else badge.classList.remove('active');
  });
}

function prevManualStep(step) {
  currentManualStep = step;
  document.querySelectorAll('#manual-order-tab .order-step-content').forEach(div => div.style.display = 'none');
  document.getElementById(`manual-step-${step}`).style.display = 'block';

  document.querySelectorAll('#manual-order-tab .step-badge').forEach((badge, idx) => {
    if (idx + 1 <= step) badge.classList.add('active');
    else badge.classList.remove('active');
  });
}

async function searchManualNick() {
  const query = document.getElementById('manual-search-nick').value.trim();
  const dropdown = document.getElementById('manual-search-results');
  if (query.length < 2) {
    dropdown.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/game-accounts?status=available&search=${encodeURIComponent(query)}&limit=10`);
    const data = await res.json();
    if (data.success && data.accounts && data.accounts.length > 0) {
      dropdown.innerHTML = '';
      data.accounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => selectManualNick(acc);
        item.innerHTML = `
          <div class="item-details">
            <span class="item-code">${acc.code}</span>
            <span class="item-name">${acc.name} (${acc.gameType})</span>
          </div>
          <span class="item-price">${acc.price.toLocaleString('vi-VN')}đ</span>
        `;
        dropdown.appendChild(item);
      });
      dropdown.style.display = 'block';
    } else {
      dropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted);">Không tìm thấy nick phù hợp</div>';
      dropdown.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
  }
}

function selectManualNick(acc) {
  // Check unique
  const exists = manualSelectedAccounts.some(item => item._id === acc._id);
  if (exists) {
    window.showToast('Nick này đã được thêm vào danh sách chọn.', 'warning');
  } else {
    manualSelectedAccounts.push(acc);
    renderManualSelectedAccounts();
  }

  // Clear search box
  document.getElementById('manual-search-nick').value = '';
  document.getElementById('manual-search-results').style.display = 'none';
}

function renderManualSelectedAccounts() {
  const tbody = document.getElementById('manual-selected-tbody');
  if (manualSelectedAccounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Chưa chọn nick nào</td></tr>';
    document.getElementById('manual-total-price').textContent = '0đ';
    return;
  }

  tbody.innerHTML = '';
  let total = 0;
  manualSelectedAccounts.forEach((acc, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: bold;">${acc.code}</td>
      <td>${acc.name}</td>
      <td style="font-weight: bold; color: white;">${acc.price.toLocaleString('vi-VN')}đ</td>
      <td>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="removeManualNick(${idx})">Xóa ❌</button>
      </td>
    `;
    tbody.appendChild(tr);
    total += acc.price;
  });

  document.getElementById('manual-total-price').textContent = total.toLocaleString('vi-VN') + 'đ';
}

function removeManualNick(index) {
  manualSelectedAccounts.splice(index, 1);
  renderManualSelectedAccounts();
}

function renderManualOrderSummary() {
  const name = document.getElementById('manual-customer-name').value;
  const phone = document.getElementById('manual-customer-phone').value;
  const email = document.getElementById('manual-customer-email').value;
  const method = document.getElementById('manual-payment-method').value === 'cash' ? 'Tiền mặt tại chỗ' : 'Chuyển khoản ngân hàng';
  
  let total = 0;
  let itemsHtml = '';
  manualSelectedAccounts.forEach(acc => {
    total += acc.price;
    itemsHtml += `<li><strong>${acc.code}</strong> - ${acc.name} (${acc.price.toLocaleString('vi-VN')}đ)</li>`;
  });

  document.getElementById('manual-order-summary-details').innerHTML = `
    <h4>Tóm tắt đơn hàng</h4>
    <p style="margin-top: 8px;">Khách hàng: <strong>${name}</strong> | SĐT: <strong>${phone}</strong> ${email ? `| Email: <strong>${email}</strong>` : ''}</p>
    <p style="margin-top: 4px;">Phương thức thanh toán: <strong>${method}</strong></p>
    <p style="margin-top: 8px; color: var(--accent-cyan);">Sản phẩm đã chọn:</p>
    <ul style="padding-left: 20px; margin-top: 4px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px;">
      ${itemsHtml}
    </ul>
    <h3 style="margin-top: 15px; color: var(--success); text-align: right;">TỔNG TIỀN: ${total.toLocaleString('vi-VN')}đ</h3>
  `;
}

async function submitManualOrder() {
  const name = document.getElementById('manual-customer-name').value.trim();
  const phone = document.getElementById('manual-customer-phone').value.trim();
  const email = document.getElementById('manual-customer-email').value.trim();
  const note = document.getElementById('manual-customer-note').value.trim();
  const paymentMethod = document.getElementById('manual-payment-method').value;
  const staffNote = document.getElementById('manual-staff-note').value.trim();

  const body = {
    customerInfo: { fullName: name, phone, email, note },
    accountIds: manualSelectedAccounts.map(acc => acc._id),
    paymentMethod,
    staffNote
  };

  try {
    const res = await fetch('/api/orders/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast('Tạo đơn hàng thủ công thành công!', 'success');
      
      // Reset form variables
      manualSelectedAccounts = [];
      document.getElementById('manual-customer-name').value = '';
      document.getElementById('manual-customer-phone').value = '';
      document.getElementById('manual-customer-email').value = '';
      document.getElementById('manual-customer-note').value = '';
      document.getElementById('manual-staff-note').value = '';
      document.getElementById('manual-search-nick').value = '';
      renderManualSelectedAccounts();
      
      // Go back to step 1
      nextManualStep(1);

      // Redirect to Orders Tab
      const orderTabBtn = document.querySelector('[data-tab="orders-tab"]');
      if (orderTabBtn) orderTabBtn.click();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// NICK HANDOVER (BÀN GIAO TRỰC TIẾP)
// ----------------------------------------------------
function nextHandoverStep(step) {
  currentHandoverStep = step;
  document.querySelectorAll('#direct-handover-tab .handover-step-content').forEach(div => div.style.display = 'none');
  document.getElementById(`handover-step-${step}`).style.display = 'block';

  document.querySelectorAll('#direct-handover-tab .step-badge').forEach((badge, idx) => {
    if (idx + 1 <= step) badge.classList.add('active');
    else badge.classList.remove('active');
  });
}

function prevHandoverStep(step) {
  currentHandoverStep = step;
  document.querySelectorAll('#direct-handover-tab .handover-step-content').forEach(div => div.style.display = 'none');
  document.getElementById(`handover-step-${step}`).style.display = 'block';

  document.querySelectorAll('#direct-handover-tab .step-badge').forEach((badge, idx) => {
    if (idx + 1 <= step) badge.classList.add('active');
    else badge.classList.remove('active');
  });
}

async function searchHandoverNick() {
  const query = document.getElementById('handover-search-nick').value.trim();
  const dropdown = document.getElementById('handover-search-results');
  if (query.length < 2) {
    dropdown.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/game-accounts?status=available&search=${encodeURIComponent(query)}&limit=10`);
    const data = await res.json();
    if (data.success && data.accounts && data.accounts.length > 0) {
      dropdown.innerHTML = '';
      data.accounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => selectHandoverNick(acc);
        item.innerHTML = `
          <div class="item-details">
            <span class="item-code">${acc.code}</span>
            <span class="item-name">${acc.name} (${acc.gameType})</span>
          </div>
          <span class="item-price">${acc.price.toLocaleString('vi-VN')}đ</span>
        `;
        dropdown.appendChild(item);
      });
      dropdown.style.display = 'block';
    } else {
      dropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted);">Không tìm thấy nick phù hợp</div>';
      dropdown.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
  }
}

function selectHandoverNick(acc) {
  handoverSelectedAccount = acc;

  // Render selected nick preview
  const preview = document.getElementById('handover-selected-nick-preview');
  preview.innerHTML = `
    <h4>Đã chọn nick: <span style="color: white; font-family: monospace;">${acc.code}</span></h4>
    <p style="margin-top: 5px;">Tên nick: <strong>${acc.name}</strong></p>
    <p>Game: <strong>${acc.gameType}</strong> | Giá: <strong>${acc.price.toLocaleString('vi-VN')}đ</strong></p>
  `;
  preview.style.display = 'block';

  // Enable Next button
  document.getElementById('handover-to-step2-btn').disabled = false;

  // Clear search results dropdown
  document.getElementById('handover-search-nick').value = '';
  document.getElementById('handover-search-results').style.display = 'none';
}

async function confirmHandoverOrder() {
  const name = document.getElementById('handover-customer-name').value.trim();
  const phone = document.getElementById('handover-customer-phone').value.trim();
  const paymentMethod = document.getElementById('handover-payment-method').value;
  const note = document.getElementById('handover-customer-note').value.trim();

  if (!name || !phone) {
    window.showToast('Vui lòng nhập Họ tên và Số điện thoại khách hàng.', 'error');
    return;
  }

  const body = {
    accountId: handoverSelectedAccount._id,
    customerInfo: { fullName: name, phone, paymentMethod, note }
  };

  try {
    const res = await fetch('/api/orders/direct-handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast('Đã khởi tạo đơn bàn giao nick trực tiếp!', 'success');
      
      // Render reveal screen
      renderHandoverCredentials(data.orderCode, data.loginInfo);
      
      // Move to step 3 (credentials reveal)
      nextHandoverStep(3);
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

function renderHandoverCredentials(orderCode, credentials) {
  const container = document.getElementById('handover-result-details');
  
  if (!credentials) {
    container.innerHTML = `<p style="color: var(--error);">Không thể truy cập thông tin đăng nhập. Vui lòng liên hệ Admin.</p>`;
    return;
  }

  container.innerHTML = `
    <h3 style="color: var(--accent-cyan); text-align: center; margin-bottom: 15px;">ĐƠN BÀN GIAO: ${orderCode}</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; width: 150px; color: var(--text-muted); font-weight: bold;">Tài khoản (User):</td>
        <td style="padding: 10px;">
          <input type="text" class="form-control" style="display:inline-block; width:70%; font-family: monospace;" readonly value="${credentials.username}" id="copy-user">
          <button class="btn btn-cyan" style="padding: 8px 12px; font-size: 0.8rem;" onclick="copyInput('copy-user')">Copy 📋</button>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; color: var(--text-muted); font-weight: bold;">Mật khẩu (Pass):</td>
        <td style="padding: 10px;">
          <input type="text" class="form-control" style="display:inline-block; width:70%; font-family: monospace;" readonly value="${credentials.password}" id="copy-pass">
          <button class="btn btn-cyan" style="padding: 8px 12px; font-size: 0.8rem;" onclick="copyInput('copy-pass')">Copy 📋</button>
        </td>
      </tr>
      ${credentials.linkedEmail ? `
        <tr>
          <td style="padding: 10px; color: var(--text-muted); font-weight: bold;">Email liên kết:</td>
          <td style="padding: 10px;">
            <input type="text" class="form-control" style="display:inline-block; width:70%; font-family: monospace;" readonly value="${credentials.linkedEmail}" id="copy-email">
            <button class="btn btn-cyan" style="padding: 8px 12px; font-size: 0.8rem;" onclick="copyInput('copy-email')">Copy 📋</button>
          </td>
        </tr>
      ` : ''}
      <tr>
        <td style="padding: 10px; color: var(--text-muted); font-weight: bold;">Hình thức đăng nhập:</td>
        <td style="padding: 10px; color: white; font-weight: 500;">${credentials.loginMethod || 'N/A'}</td>
      </tr>
      ${credentials.securityNote ? `
        <tr>
          <td style="padding: 10px; color: var(--warning); font-weight: bold;">Lưu ý đặc biệt:</td>
          <td style="padding: 10px; color: var(--warning); font-weight: 500; font-family: monospace;">${credentials.securityNote}</td>
        </tr>
      ` : ''}
    </table>
  `;
}

function copyInput(elementId) {
  const copyText = document.getElementById(elementId);
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value);
  window.showToast('Đã copy thành công!', 'success');
}

function resetHandoverForm() {
  // Clear variables and inputs
  handoverSelectedAccount = null;
  document.getElementById('handover-customer-name').value = '';
  document.getElementById('handover-customer-phone').value = '';
  document.getElementById('handover-customer-note').value = '';
  document.getElementById('handover-selected-nick-preview').style.display = 'none';
  document.getElementById('handover-to-step2-btn').disabled = true;

  // Go back to step 1
  nextHandoverStep(1);

  // Reload data
  loadOverviewStats();
  loadOrders();
}

// ----------------------------------------------------
// CONTACTS MESSAGES
// ----------------------------------------------------
async function loadContacts() {
  try {
    const tbody = document.getElementById('staff-contacts-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Đang tải tin nhắn...</td></tr>';

    const res = await fetch('/api/contacts');
    const data = await res.json();

    if (data.success && data.messages.length > 0) {
      tbody.innerHTML = '';
      
      const statusLabels = {
        unread: 'Chưa đọc',
        read: 'Đã xem',
        replied: 'Đã phản hồi'
      };

      data.messages.forEach(m => {
        const tr = document.createElement('tr');
        
        let actionBtn = '';
        if (m.status === 'unread') {
          actionBtn = `<button onclick="markContactRead('${m._id}', 'read')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Đã xem</button>`;
        } else if (m.status === 'read') {
          actionBtn = `<button onclick="markContactRead('${m._id}', 'replied')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;">Đã phản hồi</button>`;
        } else {
          actionBtn = `<span style="font-size: 0.85rem; color: var(--text-muted);">Đã hoàn tất</span>`;
        }

        tr.innerHTML = `
          <td>${m.fullName}<br><small style="color: var(--text-muted);">${m.email}</small></td>
          <td><strong>${m.subject || 'Không có'}</strong></td>
          <td style="max-width: 300px; font-size: 0.85rem;">${m.message}</td>
          <td><span class="status-badge ${m.status}">${statusLabels[m.status] || m.status}</span></td>
          <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Chưa nhận được liên hệ nào từ khách hàng.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

async function markContactRead(id, status) {
  try {
    const res = await fetch(`/api/contacts/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadContacts();
    }
  } catch (err) {
    console.error(err);
  }
}

// Window actions mapping
window.handleOrderAction = handleOrderAction;
window.closeOrderModal = closeOrderModal;
window.markContactRead = markContactRead;
window.viewProductDetail = viewProductDetail;

// Wizard step controls mappings
window.nextManualStep = nextManualStep;
window.prevManualStep = prevManualStep;
window.removeManualNick = removeManualNick;
window.submitManualOrder = submitManualOrder;

window.nextHandoverStep = nextHandoverStep;
window.prevHandoverStep = prevHandoverStep;
window.confirmHandoverOrder = confirmHandoverOrder;
window.copyInput = copyInput;
window.resetHandoverForm = resetHandoverForm;
