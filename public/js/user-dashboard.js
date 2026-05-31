// currentUser is already declared in main.js
let chatIntervalId = null;
let activeReceiverId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadUserProfile();
  loadMyOrders();
  loadMyComplaints();
  loadDepositSettings();

  document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
  document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);
  document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
  document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
  document.getElementById('complaintForm').addEventListener('submit', handleComplaintSubmit);

  setupWalletRechargeUI();
  activateTabFromUrl();
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

let bankInfo = null;

// Load account statistics
async function loadUserProfile() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      document.getElementById('sidebar-name').textContent = currentUser.fullName;
      
      const sidebarAvatar = document.getElementById('sidebar-avatar');
      if (currentUser.avatar) {
        sidebarAvatar.innerHTML = `<img src="${currentUser.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        sidebarAvatar.textContent = currentUser.fullName[0].toUpperCase();
      }
      
      document.getElementById('sidebar-balance').textContent = `${currentUser.balance.toLocaleString('vi-VN')}đ`;
      
      // Update deposit info
      updateDepositMemoAndQR();

      // Populate profile form inputs
      const profileNameInput = document.getElementById('profile-name');
      if (profileNameInput) profileNameInput.value = currentUser.fullName || '';
      const profilePhoneInput = document.getElementById('profile-phone');
      if (profilePhoneInput) profilePhoneInput.value = currentUser.phone || '';
      const profileEmailInput = document.getElementById('profile-email');
      if (profileEmailInput) profileEmailInput.value = currentUser.email || '';
      const profileAddressInput = document.getElementById('profile-address');
      if (profileAddressInput) profileAddressInput.value = currentUser.address || '';

      // Avatar preview in profile
      const preview = document.getElementById('profile-avatar-preview');
      const letter = document.getElementById('profile-avatar-letter');
      if (currentUser.avatar) {
        if (preview) {
          preview.src = currentUser.avatar;
          preview.style.display = 'block';
        }
        if (letter) letter.style.display = 'none';
      } else {
        if (preview) preview.style.display = 'none';
        if (letter) {
          letter.style.display = 'block';
          letter.textContent = currentUser.fullName[0].toUpperCase();
        }
      }
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
      bankInfo = data.settings.bankInfo;
      updateDepositMemoAndQR();
    }
  } catch (err) {
    console.error(err);
  }
}

function updateDepositMemoAndQR() {
  if (!currentUser || !bankInfo) return;

  const bankName = bankInfo.bankName || 'MBBank';
  const accountNumber = bankInfo.accountNumber || '';
  const ownerName = bankInfo.ownerName || '';

  const bankNameEl = document.getElementById('bank-name-display');
  const bankAccEl = document.getElementById('bank-acc-display');
  const bankOwnerEl = document.getElementById('bank-owner-display');
  const bankMemoEl = document.getElementById('bank-memo-display');
  
  if (bankNameEl) bankNameEl.textContent = bankName;
  if (bankAccEl) bankAccEl.textContent = accountNumber;
  if (bankOwnerEl) bankOwnerEl.textContent = ownerName;

  const amountInput = document.getElementById('bank-amount');
  const amount = amountInput ? Number(amountInput.value) || 0 : 0;

  const memoText = `NAP ${currentUser.username.toUpperCase()} ${amount}`;
  if (bankMemoEl) bankMemoEl.textContent = memoText;

  const qrImg = document.getElementById('vietqr-img');
  if (qrImg) {
    let qrUrl = bankInfo.qrTemplate || 'https://img.vietqr.io/image/{bankName}-{accountNumber}-compact.jpg?amount={amount}&addInfo={addInfo}';
    qrUrl = qrUrl
      .replace('{bankName}', encodeURIComponent(bankName))
      .replace('{accountNumber}', encodeURIComponent(accountNumber))
      .replace('{amount}', amount)
      .replace('{addInfo}', encodeURIComponent(memoText));
    qrImg.src = qrUrl;
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
        let actionsHtml = `<button onclick="viewOrderDetails('${o._id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;">Xem chi tiết</button>`;
        if (o.orderStatus === 'pending_payment') {
          actionsHtml = `<a href="/order-success.html?orderCode=${o.orderCode}&total=${o.total}&method=${o.paymentMethod}" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Thanh toán</a>`;
        } else if (o.orderStatus === 'completed' || o.orderStatus === 'delivering') {
          actionsHtml += `<button onclick="openComplaintModal('${o._id}', '${o.orderCode}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Khiếu nại</button>`;
        } else if (o.orderStatus === 'dispute') {
          actionsHtml += `<span class="status-badge dispute" style="cursor: pointer; font-size: 0.8rem; padding: 4px 8px; vertical-align: middle;" onclick="document.querySelector('[data-tab=complaints-tab]').click()" title="Xem trạng thái khiếu nại">Đang khiếu nại</span>`;
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
          const isDisputed = o.orderStatus === 'dispute';
          const complaintBtnHtml = isDisputed 
            ? `<span class="status-badge dispute" style="padding: 4px 8px; font-size: 0.8rem;">Đang khiếu nại</span>`
            : `<button onclick="openComplaintModal('${o._id}', '${o.orderCode}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Khiếu nại 🚨</button>`;

          credsHtml = `
            <div class="login-credentials-reveal" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 12px;">
              <h5 style="color: var(--accent-cyan); margin-bottom: 12px; font-size: 0.95rem;">🔑 Thông tin đăng nhập nick:</h5>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Tài khoản: <strong id="cred-user-${item._id}" style="color: white; font-family: monospace;">${item.loginInfo.username}</strong></span>
                  <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copyText('cred-user-${item._id}')">Copy</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Mật khẩu: <input type="password" id="cred-pass-${item._id}" value="${item.loginInfo.password}" readonly style="background:transparent; border:none; color:white; font-family:monospace; font-weight:bold; font-size:1.1rem; width:150px; outline:none;"></span>
                  <div style="display: flex; gap: 5px;">
                    <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="togglePasswordVisibility('cred-pass-${item._id}')">Hiện/Ẩn</button>
                    <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" onclick="copyText('cred-pass-${item._id}')">Copy</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Email liên kết: <strong id="cred-email-${item._id}" style="color: white;">${item.loginInfo.linkedEmail || 'Không có'}</strong></span>
                  <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" ${item.loginInfo.linkedEmail ? '' : 'disabled'} onclick="copyText('cred-email-${item._id}')">Copy</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                  <span>Chú ý bảo mật:</span>
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <strong id="cred-note-${item._id}" style="color: var(--warning); font-size: 0.85rem;">${item.loginInfo.securityNote || 'Không có'}</strong>
                    <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;" ${item.loginInfo.securityNote ? '' : 'disabled'} onclick="copyText('cred-note-${item._id}')">Copy</button>
                  </div>
                </div>
              </div>
              <p style="color: var(--accent-pink); font-size: 0.8rem; font-weight: bold; margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px;">⚠️ Vui lòng đổi mật khẩu ngay sau khi nhận nick.</p>
              <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
                <button onclick="openReviewModal('${item.accountId}')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Đánh giá nick ★</button>
                ${complaintBtnHtml}
              </div>
            </div>
          `;
        } else {
          credsHtml = `
            <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; margin-top: 10px; font-size: 0.85rem; color: var(--warning); border: 1px dashed var(--warning);">
              🔒 Thông tin sẽ hiển thị sau khi đơn hoàn thành.
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
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword.length < 6) {
    window.showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    window.showToast('Mật khẩu mới và xác nhận mật khẩu không khớp.', 'error');
    return;
  }

  if (newPassword === currentPassword) {
    window.showToast('Mật khẩu mới không được trùng với mật khẩu hiện tại.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
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

  if (!title) {
    window.showToast('Vui lòng chọn lý do khiếu nại.', 'error');
    return;
  }

  if (description.length < 20) {
    window.showToast('Mô tả chi tiết khiếu nại phải có tối thiểu 20 ký tự.', 'error');
    return;
  }

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

// New profile, upload avatar, activate tab from URL and wallet recharge logic
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch('/api/auth/upload-avatar', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      window.showToast('Tải lên ảnh đại diện thành công.', 'success');
      const preview = document.getElementById('profile-avatar-preview');
      const letter = document.getElementById('profile-avatar-letter');
      if (preview) {
        preview.src = data.url;
        preview.style.display = 'block';
        preview.dataset.uploadedUrl = data.url;
      }
      if (letter) letter.style.display = 'none';
    } else {
      window.showToast(data.message || 'Lỗi tải ảnh đại diện.', 'error');
    }
  } catch (err) {
    console.error(err);
    window.showToast('Không thể tải ảnh đại diện lên.', 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const fullName = document.getElementById('profile-name').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const address = document.getElementById('profile-address').value.trim();
  
  const preview = document.getElementById('profile-avatar-preview');
  const avatar = preview.dataset.uploadedUrl || (currentUser ? currentUser.avatar : '');

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, address, avatar })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      await loadUserProfile();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
    window.showToast('Không thể cập nhật thông tin cá nhân.', 'error');
  }
}

function activateTabFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get('tab');
  if (activeTab) {
    let tabId = activeTab;
    if (!tabId.endsWith('-tab')) tabId += '-tab';
    const targetItem = document.querySelector(`.dashboard-nav-item[data-tab="${tabId}"]`);
    if (targetItem) {
      targetItem.click();
    }
  }
}

function setupWalletRechargeUI() {
  const btnCard = document.getElementById('btn-subtab-card');
  const btnBank = document.getElementById('btn-subtab-bank');
  const cardContent = document.getElementById('subtab-card-content');
  const bankContent = document.getElementById('subtab-bank-content');

  if (btnCard && btnBank && cardContent && bankContent) {
    btnCard.onclick = () => {
      btnCard.classList.remove('btn-outline');
      btnCard.classList.add('btn-cyan');
      btnBank.classList.remove('btn-cyan');
      btnBank.classList.add('btn-outline');
      cardContent.style.display = 'block';
      bankContent.style.display = 'none';
    };

    btnBank.onclick = () => {
      btnBank.classList.remove('btn-outline');
      btnBank.classList.add('btn-cyan');
      btnCard.classList.remove('btn-cyan');
      btnCard.classList.add('btn-outline');
      cardContent.style.display = 'none';
      bankContent.style.display = 'block';
    };
  }

  const providerBtns = document.querySelectorAll('.provider-btn');
  providerBtns.forEach(btn => {
    btn.onclick = () => {
      providerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('card-provider').value = btn.getAttribute('data-provider');
    };
  });

  const denomBtns = document.querySelectorAll('.denom-btn');
  denomBtns.forEach(btn => {
    btn.onclick = () => {
      denomBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('card-denomination').value = btn.getAttribute('data-value');
    };
  });

  const cardForm = document.getElementById('cardRechargeForm');
  if (cardForm) {
    cardForm.onsubmit = async (e) => {
      e.preventDefault();
      const provider = document.getElementById('card-provider').value;
      const denomination = Number(document.getElementById('card-denomination').value);
      const serial = document.getElementById('card-serial').value.trim();
      const code = document.getElementById('card-code').value.trim();

      try {
        const res = await fetch('/api/wallet/recharge-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, denomination, serial, code })
        });
        const data = await res.json();
        if (data.success) {
          window.showToast(data.message, 'success');
          cardForm.reset();
        } else {
          window.showToast(data.message, 'error');
        }
      } catch (err) {
        console.error(err);
        window.showToast('Không thể gửi yêu cầu nạp thẻ cào.', 'error');
      }
    };
  }

  const bankAmountBtns = document.querySelectorAll('.bank-amount-btn');
  const bankAmountInput = document.getElementById('bank-amount');
  bankAmountBtns.forEach(btn => {
    btn.onclick = () => {
      bankAmountBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bankAmountInput.value = btn.getAttribute('data-value');
      updateDepositMemoAndQR();
    };
  });

  if (bankAmountInput) {
    bankAmountInput.oninput = () => {
      const currentVal = bankAmountInput.value;
      bankAmountBtns.forEach(b => {
        if (b.getAttribute('data-value') === currentVal) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      updateDepositMemoAndQR();
    };
  }

  const bankForm = document.getElementById('bankRechargeForm');
  if (bankForm) {
    bankForm.onsubmit = async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById('bank-amount').value);
      const fileInput = document.getElementById('bank-proof');

      if (!amount || amount <= 0) {
        window.showToast('Vui lòng chọn hoặc nhập số tiền nạp hợp lệ.', 'error');
        return;
      }
      if (fileInput.files.length === 0) {
        window.showToast('Vui lòng tải lên ảnh minh chứng chuyển khoản.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('proofImage', fileInput.files[0]);

      try {
        const res = await fetch('/api/wallet/recharge-bank', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          window.showToast(data.message, 'success');
          bankForm.reset();
          fileInput.value = '';
          bankAmountBtns.forEach(b => b.classList.remove('active'));
          const defaultBtn = document.querySelector('.bank-amount-btn[data-value="100000"]');
          if (defaultBtn) defaultBtn.classList.add('active');
          bankAmountInput.value = 100000;
          updateDepositMemoAndQR();
        } else {
          window.showToast(data.message, 'error');
        }
      } catch (err) {
        console.error(err);
        window.showToast('Không thể gửi yêu cầu nạp tiền.', 'error');
      }
    };
  }

  initCopyButtons();
}

function initCopyButtons() {
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        navigator.clipboard.writeText(targetEl.textContent.trim()).then(() => {
          window.showToast('Đã copy vào clipboard!', 'success');
        }).catch(err => {
          console.error(err);
        });
      }
    };
  });
}

window.copyText = function(id) {
  const el = document.getElementById(id);
  if (el) {
    const textVal = el.tagName === 'INPUT' ? el.value : el.textContent;
    navigator.clipboard.writeText(textVal.trim()).then(() => {
      window.showToast('Đã copy vào clipboard!', 'success');
    }).catch(err => {
      console.error(err);
    });
  }
};

window.togglePasswordVisibility = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.type = el.type === 'password' ? 'text' : 'password';
  }
};
