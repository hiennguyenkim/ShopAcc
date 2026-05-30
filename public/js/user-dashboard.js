let currentUser = null;
let chatIntervalId = null;
let activeReceiverId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadUserProfile();
  loadMyOrders();
  loadMyComplaints();
  loadDepositSettings();

  document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
  document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
  document.getElementById('complaintForm').addEventListener('submit', handleComplaintSubmit);
});

// Sidebar navigation tab toggler
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

      // Stop chat polling if leaving chat tab
      if (targetTab !== 'chat-tab' && chatIntervalId) {
        clearInterval(chatIntervalId);
        chatIntervalId = null;
      }

      // Trigger lazy load
      if (targetTab === 'wishlist-tab') {
        loadMyWishlist();
      } else if (targetTab === 'chat-tab') {
        initUserChat();
      } else if (targetTab === 'orders-tab') {
        loadMyOrders();
      } else if (targetTab === 'complaints-tab') {
        loadMyComplaints();
      }
    });
  });
}

// Load account statistics
async function loadUserProfile() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      document.getElementById('sidebar-name').textContent = currentUser.fullName;
      document.getElementById('sidebar-avatar').textContent = currentUser.fullName[0].toUpperCase();
      document.getElementById('sidebar-balance').textContent = `${currentUser.balance.toLocaleString('vi-VN')}đ`;
      document.getElementById('deposit-memo').textContent = `NAP ${currentUser.username.toUpperCase()}`;
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch deposit details from settings
async function loadDepositSettings() {
  try {
    const res = await fetch('/api/site-settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const bank = data.settings.bankInfo;
      document.getElementById('deposit-bank-name').textContent = bank.bankName || 'N/A';
      document.getElementById('deposit-bank-account').textContent = bank.accountNumber || 'N/A';
      document.getElementById('deposit-bank-owner').textContent = bank.ownerName || 'N/A';
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch owned orders
async function loadMyOrders() {
  try {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải...</td></tr>';

    const res = await fetch('/api/orders/my-orders');
    const data = await res.json();

    if (data.success && data.orders.length > 0) {
      tbody.innerHTML = '';
      data.orders.forEach(o => {
        const tr = document.createElement('tr');
        
        const statusLabels = {
          pending_payment: 'Chờ thanh toán',
          pending_confirm: 'Chờ xác nhận',
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
          refunded: 'Đã hoàn ví'
        };

        const names = o.items.map(i => i.name).join(', ');

        // Dynamic action buttons
        let actionsHtml = '';
        if (o.orderStatus === 'pending_payment') {
          actionsHtml = `<a href="/order-success.html?orderCode=${o.orderCode}&total=${o.total}&method=${o.paymentMethod}" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Thanh toán</a>`;
        } else {
          actionsHtml = `<button onclick="viewOrderDetails('${o._id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;">Xem chi tiết</button>`;
        }

        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold;">${o.orderCode}</td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${names}</td>
          <td style="font-weight: 700; color: white;">${o.total.toLocaleString('vi-VN')}đ</td>
          <td><span class="status-badge ${o.orderStatus}">${statusLabels[o.orderStatus] || o.orderStatus}</span></td>
          <td><span class="status-badge ${o.paymentStatus}">${paymentLabels[o.paymentStatus] || o.paymentStatus}</span></td>
          <td>${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Bạn chưa thực hiện bất kỳ giao dịch nào.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch user complaints
async function loadMyComplaints() {
  try {
    const tbody = document.getElementById('complaints-table-body');
    const res = await fetch('/api/complaints/my-complaints');
    const data = await res.json();

    if (data.success && data.complaints.length > 0) {
      tbody.innerHTML = '';
      
      const statusLabels = {
        pending: 'Chờ duyệt',
        processing: 'Đang xử lý',
        resolved: 'Đã giải quyết',
        rejected: 'Bị từ chối'
      };

      data.complaints.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace;">${c.order ? c.order.orderCode : 'N/A'}</td>
          <td><strong>${c.title}</strong></td>
          <td><span class="status-badge ${c.status}">${statusLabels[c.status] || c.status}</span></td>
          <td>${new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
          <td style="max-width: 250px; font-size: 0.85rem; color: var(--text-muted);">${c.resolutionNote || 'Đang chờ xử lý...'}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Không có khiếu nại nào của bạn.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

// Get order credentials detail modal pop-up
async function viewOrderDetails(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();

    if (data.success) {
      const o = data.order;
      const body = document.getElementById('details-modal-body');
      
      let itemsListHtml = '';
      o.items.forEach(item => {
        let credsHtml = '';
        if (o.orderStatus === 'completed' && item.loginInfo) {
          credsHtml = `
            <div class="login-credentials-reveal">
              <h5 style="color: var(--accent-cyan); margin-bottom: 8px;">🔑 Thông tin tài khoản:</h5>
              <table>
                <tr><td>Tài khoản:</td><td><span class="secret-val">${item.loginInfo.username}</span></td></tr>
                <tr><td>Mật khẩu:</td><td><span class="secret-val">${item.loginInfo.password}</span></td></tr>
                <tr><td>Đăng nhập qua:</td><td><strong>${item.loginInfo.loginMethod || 'Mặc định'}</strong></td></tr>
                ${item.loginInfo.linkedEmail ? `<tr><td>Email liên kết:</td><td>${item.loginInfo.linkedEmail}</td></tr>` : ''}
                ${item.loginInfo.securityNote ? `<tr><td>Chú ý:</td><td><span style="color: var(--warning);">${item.loginInfo.securityNote}</span></td></tr>` : ''}
              </table>
              <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="openReviewModal('${item.accountId}')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Đánh giá nick ★</button>
                <button onclick="openComplaintModal('${o._id}', '${o.orderCode}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Khiếu nại 🚨</button>
              </div>
            </div>
          `;
        } else if (o.orderStatus !== 'completed') {
          credsHtml = `
            <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; margin-top: 10px; font-size: 0.85rem; color: var(--warning); border: 1px dashed var(--warning);">
              🔒 Thông tin nick game sẽ hiển thị tại đây sau khi đơn hàng hoàn tất.
            </div>
          `;
        }

        itemsListHtml += `
          <div class="glass" style="padding: 15px; margin-bottom: 15px; border-color: rgba(255,255,255,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${item.name} (MS: ${item.code})</strong>
              <strong>${item.price.toLocaleString('vi-VN')}đ</strong>
            </div>
            ${credsHtml}
          </div>
        `;
      });

      body.innerHTML = `
        <div style="margin-bottom: 20px;">
          <p>Mã đơn hàng: <strong class="glow-text-cyan">${o.orderCode}</strong></p>
          <p>Trạng thái đơn: <strong class="status-badge ${o.orderStatus}">${o.orderStatus}</strong></p>
          <p>Phương thức thanh toán: <strong>${o.paymentMethod}</strong></p>
          <p>Tổng tiền thanh toán: <strong>${o.total.toLocaleString('vi-VN')}đ</strong></p>
        </div>
        <h4>Sản phẩm trong đơn:</h4>
        <div style="margin-top: 10px;">
          ${itemsListHtml}
        </div>
      `;

      document.getElementById('details-modal-overlay').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

function closeDetailsModal() {
  document.getElementById('details-modal-overlay').style.display = 'none';
}

// Change password helper
async function handleChangePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();

    if (data.success) {
      window.showToast(data.message, 'success');
      document.getElementById('changePasswordForm').reset();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
    window.showToast('Không thể thay đổi mật khẩu.', 'error');
  }
}

// Review modal helpers
function openReviewModal(accountId) {
  document.getElementById('review-account-id').value = accountId;
  document.getElementById('review-modal-overlay').style.display = 'flex';
  closeDetailsModal(); // close detail overlay
}

function closeReviewModal() {
  document.getElementById('review-modal-overlay').style.display = 'none';
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const gameAccountId = document.getElementById('review-account-id').value;
  const rating = Number(document.getElementById('review-rating').value);
  const comment = document.getElementById('review-comment').value.trim();

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameAccountId, rating, comment })
    });
    const data = await res.json();

    if (data.success) {
      window.showToast(data.message, 'success');
      closeReviewModal();
      document.getElementById('reviewForm').reset();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Complaint modal helpers
function openComplaintModal(orderId, orderCode) {
  document.getElementById('complaint-order-id').value = orderId;
  document.getElementById('complaint-order-code').value = orderCode;
  document.getElementById('complaint-modal-overlay').style.display = 'flex';
  closeDetailsModal();
}

function closeComplaintModal() {
  document.getElementById('complaint-modal-overlay').style.display = 'none';
}

async function handleComplaintSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('complaint-order-id').value;
  const title = document.getElementById('complaint-title').value.trim();
  const description = document.getElementById('complaint-desc').value.trim();
  const fileInput = document.getElementById('complaint-evidence');

  const formData = new FormData();
  formData.append('orderId', orderId);
  formData.append('title', title);
  formData.append('description', description);

  if (fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('evidenceImages', fileInput.files[i]);
    }
  }

  try {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      window.showToast(data.message, 'success');
      closeComplaintModal();
      document.getElementById('complaintForm').reset();
      loadMyOrders();
      loadMyComplaints();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadMyWishlist() {
  try {
    const grid = document.getElementById('wishlist-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">Đang tải danh sách yêu thích...</div>';

    const res = await fetch('/api/wishlist');
    const data = await res.json();

    if (data.success && data.wishlist.length > 0) {
      grid.innerHTML = '';
      
      const gameTypeNames = {
        lien_quan: 'Liên Quân',
        free_fire: 'Free Fire',
        fifa_mobile: 'FIFA Mobile',
        lol: 'LMHT',
        pubg: 'PUBG'
      };

      data.wishlist.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'product-card';
        if (acc.status === 'hidden') {
          card.style.opacity = '0.5';
        }

        let badgeText = '';
        if (acc.status === 'sold') {
          badgeText = '<span class="status-badge sold" style="position: absolute; top: 10px; left: 10px; z-index: 2;">Đã bán</span>';
        } else if (acc.status === 'hidden') {
          badgeText = '<span class="status-badge hidden" style="position: absolute; top: 10px; left: 10px; z-index: 2;">Tạm ngừng</span>';
        }

        let footerActions = '';
        if (acc.status === 'sold' || acc.status === 'hidden') {
          footerActions = `
            <button class="btn btn-outline" style="width: 100%; cursor: not-allowed;" disabled>Không thể mua</button>
            <button class="btn btn-danger btn-remove-wish" data-id="${acc._id}" style="padding: 10px; margin-top: 5px; width: 100%;">Xóa khỏi yêu thích</button>
          `;
        } else {
          footerActions = `
            <div style="display: flex; gap: 5px; width: 100%;">
              <button class="btn btn-cyan btn-buy" style="flex: 1; padding: 6px 12px; font-size: 0.85rem;">Mua ngay</button>
              <button class="btn btn-danger btn-remove-wish" data-id="${acc._id}" style="padding: 6px 10px; font-size: 0.85rem;" title="Xóa">✕</button>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="product-img-wrapper" style="position: relative;">
            ${badgeText}
            <img src="${acc.images[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop'}" class="product-img" alt="${acc.name}" onclick="window.location.href='/product-detail.html?slug=${acc.slug}'" style="cursor: pointer;">
            <span class="game-badge" style="z-index: 2;">${gameTypeNames[acc.gameType] || acc.gameType}</span>
          </div>
          <div class="product-info">
            <span class="product-code">MS: ${acc.code}</span>
            <h3 class="product-title" onclick="window.location.href='/product-detail.html?slug=${acc.slug}'" style="cursor: pointer;">${acc.name}</h3>
            <div class="product-attributes">
              <div class="attribute-item">🏆 Rank: ${acc.rank || 'N/A'}</div>
              <div class="attribute-item">⭐ Level: ${acc.level || 'N/A'}</div>
              <div class="attribute-item">🌐 SV: ${acc.server || 'Asia'}</div>
              <div class="attribute-item">🛡️ BH: ${acc.warrantyDays || 0} ngày</div>
            </div>
            <div class="product-footer" style="flex-direction: column; align-items: stretch; gap: 8px; margin-top: 15px;">
              <div class="product-price-section" style="margin-bottom: 5px;">
                ${acc.oldPrice ? `<span class="old-price">${acc.oldPrice.toLocaleString('vi-VN')}đ</span>` : ''}
                <span class="current-price">${acc.price.toLocaleString('vi-VN')}đ</span>
              </div>
              ${footerActions}
            </div>
          </div>
        `;

        if (acc.status !== 'sold' && acc.status !== 'hidden') {
          card.querySelector('.btn-buy').onclick = () => {
            handleBuyNow(acc._id);
          };
        }

        card.querySelector('.btn-remove-wish').onclick = () => {
          removeFromWishlistDashboard(acc._id);
        };

        grid.appendChild(card);
      });
    } else {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">Bạn chưa yêu thích sản phẩm nào.</div>';
    }
  } catch (err) {
    console.error(err);
  }
}

async function removeFromWishlistDashboard(accountId) {
  try {
    const res = await fetch(`/api/wishlist/${accountId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadMyWishlist();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleBuyNow(accountId) {
  window.location.href = `/checkout.html?accountId=${accountId}&mode=buynow`;
}

async function initUserChat() {
  if (chatIntervalId) {
    clearInterval(chatIntervalId);
    chatIntervalId = null;
  }

  // Hide the staff select area since customer connects directly to their room
  const selectorArea = document.getElementById('chat-staff-selector-area');
  if (selectorArea) selectorArea.style.display = 'none';

  await loadChatMessages();
  chatIntervalId = setInterval(loadChatMessages, 5000);

  const sendBtn = document.getElementById('user-chat-send-btn');
  const input = document.getElementById('user-chat-input');

  sendBtn.onclick = handleUserSend;
  input.onkeypress = (e) => {
    if (e.key === 'Enter') {
      handleUserSend();
    }
  };
}

async function loadChatMessages() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/api/chat/room/${currentUser._id}`);
    const data = await res.json();
    
    if (data.success) {
      renderChatBubbles(data.messages);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderChatBubbles(messages) {
  const container = document.getElementById('user-chat-messages');
  const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 50px;">Bắt đầu cuộc trò chuyện. Hãy nhập lời chào!</p>';
    return;
  }

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    const isMe = msg.senderRole === 'customer';
    
    bubble.style.cssText = `
      display: flex;
      flex-direction: column;
      align-self: ${isMe ? 'flex-end' : 'flex-start'};
      background: ${isMe ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)'};
      color: ${isMe ? 'black' : 'white'};
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 70%;
      border-bottom-${isMe ? 'right' : 'left'}-radius: 2px;
      word-break: break-word;
      margin-bottom: 10px;
    `;

    const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
      <div style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 2px; font-weight: bold; color: ${isMe ? 'inherit' : 'var(--accent-cyan)'};">${msg.senderName} (${msg.senderRole === 'admin' ? 'QTV' : msg.senderRole === 'staff' ? 'NV' : 'Khách'})</div>
      <div style="font-size: 0.95rem;">${msg.message}</div>
      <div style="font-size: 0.7rem; opacity: 0.6; text-align: right; margin-top: 4px;">${timeStr}</div>
    `;

    container.appendChild(bubble);
  });

  if (isNearBottom || container.scrollTop === 0) {
    container.scrollTop = container.scrollHeight;
  }
}

async function handleUserSend() {
  const input = document.getElementById('user-chat-input');
  const content = input.value.trim();
  if (!content || !currentUser) return;

  try {
    input.value = '';
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatRoomId: currentUser._id,
        message: content,
        senderName: currentUser.fullName
      })
    });
    const data = await res.json();
    if (data.success) {
      await loadChatMessages();
    }
  } catch (err) {
    console.error(err);
  }
}

window.viewOrderDetails = viewOrderDetails;
window.closeDetailsModal = closeDetailsModal;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.openComplaintModal = openComplaintModal;
window.closeComplaintModal = closeComplaintModal;
window.removeFromWishlistDashboard = removeFromWishlistDashboard;
