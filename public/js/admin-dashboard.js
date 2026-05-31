document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadAdminProfile();
  loadAnalytics();
  loadNicks();
  loadCategoriesAndCollections();
  loadUsers();
  loadCoupons();
  loadSiteSettingsForm();
  loadAuditLogs();

  // Bind Form Submissions
  document.getElementById('nickForm').addEventListener('submit', handleNickSubmit);
  document.getElementById('walletForm').addEventListener('submit', handleWalletSubmit);
  document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
  document.getElementById('collectionForm').addEventListener('submit', handleCollectionSubmit);
  document.getElementById('couponForm').addEventListener('submit', handleCouponSubmit);
  document.getElementById('siteSettingsForm').addEventListener('submit', handleSiteSettingsSubmit);

  // Bind Date range clicks
  document.getElementById('btn-apply-stats').addEventListener('click', loadAnalytics);
  document.getElementById('btn-range-7days').addEventListener('click', () => setDateRange(7));
  document.getElementById('btn-range-month').addEventListener('click', () => setDateRange(0, true));
  document.getElementById('btn-range-year').addEventListener('click', () => setDateRange(0, false, true));

  // Logo file change preview
  const logoInput = document.getElementById('logoUpload');
  if (logoInput) {
    logoInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('logo-preview').src = URL.createObjectURL(file);
      }
    };
  }
  const btnUploadLogo = document.getElementById('btn-upload-logo');
  if (btnUploadLogo) {
    btnUploadLogo.onclick = async () => {
      if (!logoInput || logoInput.files.length === 0) {
        window.showToast('Vui lòng chọn file logo mới.', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('logo', logoInput.files[0]);

      try {
        const res = await fetch('/api/site-settings/upload-logo', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          window.showToast('Tải lên logo thành công.', 'success');
          await fetch('/api/site-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logo: data.url })
          });
          
          document.getElementById('logo-preview').src = data.url;
          const siteLogo = document.getElementById('site-logo');
          if (siteLogo) {
            siteLogo.src = data.url;
          }
          document.querySelectorAll('.logo img, img.logo').forEach(img => {
            img.src = data.url;
          });
        } else {
          window.showToast(data.message || 'Lỗi tải logo.', 'error');
        }
      } catch (err) {
        console.error(err);
        window.showToast('Không thể tải logo lên.', 'error');
      }
    };
  }

  setupRechargesSubTabs();
});

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

      if (targetTab === 'recharges-tab') {
        loadRechargeRequests();
      }
    });
  });
}

async function loadAdminProfile() {
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

// Global Chart Instances
let revenueChartInstance = null;
let categoryRevenueChartInstance = null;
let categoryCountChartInstance = null;

// Stats & Interactive Chart.js integration
async function loadAnalytics() {
  try {
    const startDate = document.getElementById('stats-start-date').value;
    const endDate = document.getElementById('stats-end-date').value;

    let queryStr = '';
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) queryStr = '?' + params.join('&');

    const overviewRes = await fetch(`/api/stats/overview${queryStr}`);
    const overviewData = await overviewRes.json();

    const chartRes = await fetch(`/api/stats/revenue-chart${queryStr}`);
    const chartData = await chartRes.json();

    const categoryRes = await fetch(`/api/stats/by-category${queryStr}`);
    const categoryData = await categoryRes.json();

    if (overviewData.success && chartData.success && categoryData.success) {
      document.getElementById('stat-revenue').textContent = `${overviewData.totalRevenue.toLocaleString('vi-VN')}đ`;
      document.getElementById('stat-sold-count').textContent = overviewData.totalSoldNicks;
      document.getElementById('stat-users-count').textContent = overviewData.newUsers;

      // Group revenue by date for the Chart
      const dailyData = chartData.chartData;
      const lineLabels = dailyData.map(d => d.date);
      const lineValues = dailyData.map(d => d.revenue);

      // Render line chart
      const ctx = document.getElementById('revenueChart').getContext('2d');
      if (revenueChartInstance) {
        revenueChartInstance.data.labels = lineLabels.length > 0 ? lineLabels : ['Chưa có dữ liệu'];
        revenueChartInstance.data.datasets[0].data = lineValues.length > 0 ? lineValues : [0];
        revenueChartInstance.update();
      } else {
        revenueChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: lineLabels.length > 0 ? lineLabels : ['Chưa có dữ liệu'],
            datasets: [{
              label: 'Doanh thu (đ)',
              data: lineValues.length > 0 ? lineValues : [0],
              borderColor: '#00f0ff',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af' }
              },
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af' }
              }
            },
            plugins: {
              legend: { labels: { color: '#fff' } }
            }
          }
        });
      }

      // Category stats
      const catStats = categoryData.stats;
      const catLabels = catStats.map(s => s.label);
      const catRevenues = catStats.map(s => s.revenue);
      const catCounts = catStats.map(s => s.nickCount);

      // Category Revenue bar chart
      const ctxCatRev = document.getElementById('categoryRevenueChart').getContext('2d');
      if (categoryRevenueChartInstance) {
        categoryRevenueChartInstance.data.labels = catLabels.length > 0 ? catLabels : ['Trống'];
        categoryRevenueChartInstance.data.datasets[0].data = catRevenues.length > 0 ? catRevenues : [0];
        categoryRevenueChartInstance.update();
      } else {
        categoryRevenueChartInstance = new Chart(ctxCatRev, {
          type: 'bar',
          data: {
            labels: catLabels.length > 0 ? catLabels : ['Trống'],
            datasets: [{
              label: 'Doanh thu (đ)',
              data: catRevenues.length > 0 ? catRevenues : [0],
              backgroundColor: 'rgba(171, 38, 255, 0.6)',
              borderColor: '#ab26ff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
              x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
          }
        });
      }

      // Category Nick Count bar chart
      const ctxCatCount = document.getElementById('categoryCountChart').getContext('2d');
      if (categoryCountChartInstance) {
        categoryCountChartInstance.data.labels = catLabels.length > 0 ? catLabels : ['Trống'];
        categoryCountChartInstance.data.datasets[0].data = catCounts.length > 0 ? catCounts : [0];
        categoryCountChartInstance.update();
      } else {
        categoryCountChartInstance = new Chart(ctxCatCount, {
          type: 'bar',
          data: {
            labels: catLabels.length > 0 ? catLabels : ['Trống'],
            datasets: [{
              label: 'Số nick đã bán',
              data: catCounts.length > 0 ? catCounts : [0],
              backgroundColor: 'rgba(0, 240, 255, 0.6)',
              borderColor: '#00f0ff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', stepSize: 1 } },
              x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
          }
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function setDateRange(daysAgo, startOfMonth = false, startOfYear = false) {
  const end = new Date();
  let start = new Date();

  if (startOfMonth) {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (startOfYear) {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    start.setDate(end.getDate() - daysAgo);
  }

  const format = (d) => d.toISOString().split('T')[0];
  document.getElementById('stats-start-date').value = format(start);
  document.getElementById('stats-end-date').value = format(end);

  loadAnalytics();
}

// Game accounts management list
async function loadNicks() {
  try {
    const tbody = document.getElementById('admin-nicks-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải danh sách nick...</td></tr>';

    const res = await fetch('/api/game-accounts?isAdminView=true');
    const data = await res.json();

    if (data.success && data.gameAccounts.length > 0) {
      tbody.innerHTML = '';
      data.gameAccounts.forEach(acc => {
        const tr = document.createElement('tr');
        
        const gameTypeNames = {
          lien_quan: 'Liên Quân',
          free_fire: 'Free Fire',
          fifa_mobile: 'FIFA Mobile',
          lol: 'LMHT',
          pubg: 'PUBG'
        };

        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold; color: var(--accent-cyan);">${acc.code}</td>
          <td><strong>${acc.name}</strong></td>
          <td>${gameTypeNames[acc.gameType] || acc.gameType}</td>
          <td style="font-weight: 700; color: white;">${acc.price.toLocaleString('vi-VN')}đ</td>
          <td><span class="status-badge ${acc.status}">${acc.status}</span></td>
          <td>
            <button onclick="editNick('${acc._id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;">Sửa</button>
            <button onclick="deleteNick('${acc._id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Chưa có sản phẩm nào đăng bán.</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }
}

// Load categories list & options
async function loadCategoriesAndCollections() {
  try {
    // 1. Categories
    const catRes = await fetch('/api/categories');
    const catData = await catRes.json();
    const catSelect = document.getElementById('nick-category');
    const catTbody = document.getElementById('admin-categories-tbody');

    if (catData.success) {
      catSelect.innerHTML = '';
      catTbody.innerHTML = '';
      
      catData.categories.forEach(cat => {
        // Dropdown selection option
        const opt = document.createElement('option');
        opt.value = cat._id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);

        // Table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${cat.name}</strong></td>
          <td>${cat.slug}</td>
          <td><button onclick="deleteCategory('${cat._id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Xóa</button></td>
        `;
        catTbody.appendChild(tr);
      });
    }

    // 2. Collections
    const colRes = await fetch('/api/collections');
    const colData = await colRes.json();
    const colTbody = document.getElementById('admin-collections-tbody');
    if (colData.success) {
      colTbody.innerHTML = '';
      colData.collections.forEach(col => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${col.name}</strong></td>
          <td>${col.gameAccounts.length} nick</td>
          <td><button onclick="deleteCollection('${col._id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Xóa</button></td>
        `;
        colTbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// User accounts management panel
async function loadUsers() {
  try {
    const tbody = document.getElementById('admin-users-tbody');
    const res = await fetch('/api/accounts');
    const data = await res.json();

    if (data.success && data.accounts.length > 0) {
      tbody.innerHTML = '';
      data.accounts.forEach(user => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
          <td>
            <strong>${user.fullName}</strong><br>
            <small style="color: var(--text-muted);">@${user.username} | ${user.email}</small>
          </td>
          <td>
            <select onchange="changeUserRole('${user._id}', this.value)" class="form-control" style="padding: 4px 8px; font-size: 0.85rem; width: 100px;">
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
              <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td style="font-weight: 700; color: white;">${user.balance.toLocaleString('vi-VN')}đ</td>
          <td>
            <button onclick="toggleUserStatus('${user._id}', ${user.isActive})" class="btn ${user.isActive ? 'btn-outline' : 'btn-danger'}" style="padding: 4px 8px; font-size: 0.8rem;">
              ${user.isActive ? 'Khóa' : 'Mở'}
            </button>
          </td>
          <td>
            <button onclick="openWalletModal('${user._id}', '${user.username}')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Ví 💸</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function changeUserRole(userId, role) {
  try {
    const res = await fetch(`/api/accounts/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadUsers();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
      loadUsers();
    }
  } catch (err) {
    console.error(err);
  }
}

async function toggleUserStatus(userId, currentStatus) {
  const actionText = currentStatus ? 'khóa' : 'mở khóa';
  window.showModal(`Bạn có chắc muốn ${actionText} tài khoản này?`, async () => {
    try {
      const res = await fetch(`/api/accounts/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadUsers();
        loadAuditLogs();
      } else {
        window.showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Wallet adjustments
function openWalletModal(userId, username) {
  document.getElementById('wallet-user-id').value = userId;
  document.getElementById('wallet-username-display').value = username;
  document.getElementById('wallet-modal-overlay').style.display = 'flex';
}

function closeWalletModal() {
  document.getElementById('wallet-modal-overlay').style.display = 'none';
}

async function handleWalletSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('wallet-user-id').value;
  const action = document.getElementById('wallet-action').value;
  const amount = Number(document.getElementById('wallet-amount').value);

  try {
    const res = await fetch(`/api/accounts/${userId}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, action })
    });
    const data = await res.json();
    
    if (data.success) {
      window.showToast(data.message, 'success');
      closeWalletModal();
      document.getElementById('walletForm').reset();
      loadUsers();
      loadAnalytics();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Coupons management list
async function loadCoupons() {
  try {
    const tbody = document.getElementById('admin-coupons-tbody');
    const res = await fetch('/api/coupons');
    const data = await res.json();

    if (data.success && data.coupons.length > 0) {
      tbody.innerHTML = '';
      data.coupons.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: bold;">${c.code}</td>
          <td>${c.discountType === 'percent' ? 'Phần trăm (%)' : 'Số tiền cố định (đ)'}</td>
          <td style="color: white; font-weight: bold;">${c.discountValue.toLocaleString('vi-VN')}${c.discountType === 'percent' ? '%' : 'đ'}</td>
          <td>${c.usedCount} / ${c.usageLimit}</td>
          <td>${new Date(c.endDate).toLocaleDateString('vi-VN')}</td>
          <td>
            <button onclick="deleteCoupon('${c._id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// SiteSettings autofills form details
async function loadSiteSettingsForm() {
  try {
    const res = await fetch('/api/site-settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      document.getElementById('bannerTitle').value = s.bannerTitle || '';
      document.getElementById('bannerSubtitle').value = s.bannerSubtitle || '';
      document.getElementById('contactPhone').value = s.contactPhone || '';
      document.getElementById('contactEmail').value = s.contactEmail || '';
      document.getElementById('address').value = s.address || '';
      
      if (s.logo) {
        document.getElementById('logo-preview').src = s.logo;
      }
      document.getElementById('zaloLink').value = s.zaloLink || '';
      document.getElementById('facebookLink').value = s.facebookLink || '';
      document.getElementById('tiktokLink').value = s.tiktokLink || '';
      
      const bank = s.bankInfo;
      document.getElementById('bankName').value = bank.bankName || '';
      document.getElementById('bankAccount').value = bank.accountNumber || '';
      document.getElementById('bankOwner').value = bank.ownerName || '';
    }
  } catch (err) {
    console.error(err);
  }
}

// AuditLogs logging details
async function loadAuditLogs() {
  try {
    const tbody = document.getElementById('admin-audit-tbody');
    const res = await fetch('/api/audit-logs');
    const data = await res.json();

    if (data.success && data.logs.length > 0) {
      tbody.innerHTML = '';
      data.logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(l.createdAt).toLocaleString('vi-VN')}</td>
          <td><strong>${l.user ? l.user.username : 'Hệ thống'}</strong></td>
          <td><span class="status-badge hidden" style="font-size: 0.75rem;">${l.action}</span></td>
          <td style="max-width: 350px; font-size: 0.85rem;">${l.details}</td>
          <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${l.ipAddress || '127.0.0.1'}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// Modals toggling
function openNickModal() {
  document.getElementById('nick-id').value = '';
  document.getElementById('nickForm').reset();
  document.getElementById('nick-modal-title').textContent = 'Đăng Bán Nick Game Mới';
  document.getElementById('nick-modal-overlay').style.display = 'flex';
}

function closeNickModal() {
  document.getElementById('nick-modal-overlay').style.display = 'none';
}

async function handleNickSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('nick-id').value;
  
  const code = document.getElementById('nick-code').value.trim();
  const name = document.getElementById('nick-name').value.trim();
  const category = document.getElementById('nick-category').value;
  const gameType = document.getElementById('nick-gameType').value;
  const price = Number(document.getElementById('nick-price').value);
  const oldPrice = document.getElementById('nick-oldPrice').value ? Number(document.getElementById('nick-oldPrice').value) : undefined;
  
  const rank = document.getElementById('nick-rank').value.trim();
  const level = document.getElementById('nick-level').value.trim();
  const server = document.getElementById('nick-server').value.trim();
  const warrantyDays = Number(document.getElementById('nick-warranty').value);
  
  const loginUser = document.getElementById('nick-login-user').value.trim();
  const loginPass = document.getElementById('nick-login-pass').value;
  const loginMethod = document.getElementById('nick-login-method').value.trim();
  const description = document.getElementById('nick-desc').value.trim();

  const fileInput = document.getElementById('nick-images');

  const formData = new FormData();
  formData.append('code', code);
  formData.append('name', name);
  formData.append('category', category);
  formData.append('gameType', gameType);
  formData.append('price', price);
  if (oldPrice) formData.append('oldPrice', oldPrice);
  formData.append('rank', rank);
  formData.append('level', level);
  formData.append('server', server);
  formData.append('warrantyDays', warrantyDays);
  formData.append('description', description);

  const loginInfo = { username: loginUser, password: loginPass, loginMethod };
  formData.append('loginInfo', JSON.stringify(loginInfo));

  if (fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('images', fileInput.files[i]);
    }
  }

  let url = '/api/game-accounts';
  let method = 'POST';
  
  if (id) {
    url = `/api/game-accounts/${id}`;
    method = 'PUT';
  }

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeNickModal();
      loadNicks();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function editNick(id) {
  try {
    const res = await fetch(`/api/game-accounts/${id}`);
    const data = await res.json();
    
    if (data.success && data.gameAccount) {
      const acc = data.gameAccount;
      document.getElementById('nick-id').value = acc._id;
      
      document.getElementById('nick-code').value = acc.code;
      document.getElementById('nick-name').value = acc.name;
      document.getElementById('nick-category').value = acc.category._id;
      document.getElementById('nick-gameType').value = acc.gameType;
      document.getElementById('nick-price').value = acc.price;
      document.getElementById('nick-oldPrice').value = acc.oldPrice || '';
      
      document.getElementById('nick-rank').value = acc.rank || '';
      document.getElementById('nick-level').value = acc.level || '';
      document.getElementById('nick-server').value = acc.server || '';
      document.getElementById('nick-warranty').value = acc.warrantyDays || 0;
      
      // Select files empty since it represents new uploads override
      document.getElementById('nick-images').value = '';
      document.getElementById('nick-desc').value = acc.description || '';

      // Set credentials
      document.getElementById('nick-login-user').value = acc.loginInfo ? acc.loginInfo.username : '';
      document.getElementById('nick-login-pass').value = acc.loginInfo ? acc.loginInfo.password : '';
      document.getElementById('nick-login-method').value = acc.loginInfo ? acc.loginInfo.loginMethod : 'direct';

      document.getElementById('nick-modal-title').textContent = 'Cập Nhật Tài Khoản Game';
      document.getElementById('nick-modal-overlay').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

function deleteNick(id) {
  window.showModal('Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản game này?', async () => {
    try {
      const res = await fetch(`/api/game-accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadNicks();
        loadAuditLogs();
      } else {
        window.showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Category triggers
function openCategoryModal() { document.getElementById('category-modal-overlay').style.display = 'flex'; }
function closeCategoryModal() { document.getElementById('category-modal-overlay').style.display = 'none'; }

async function handleCategorySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name').value.trim();
  const description = document.getElementById('cat-desc').value.trim();
  const fileInput = document.getElementById('cat-image');

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  if (fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  }

  try {
    const res = await fetch('/api/categories', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeCategoryModal();
      document.getElementById('categoryForm').reset();
      loadCategoriesAndCollections();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

function deleteCategory(id) {
  window.showModal('Xóa danh mục này có thể ảnh hưởng đến hiển thị sản phẩm game. Xác nhận xóa?', async () => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadCategoriesAndCollections();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Collection triggers
function openCollectionModal() { document.getElementById('collection-modal-overlay').style.display = 'flex'; }
function closeCollectionModal() { document.getElementById('collection-modal-overlay').style.display = 'none'; }

async function handleCollectionSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('col-name').value.trim();
  const description = document.getElementById('col-desc').value.trim();
  const fileInput = document.getElementById('col-image');

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  if (fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  }

  try {
    const res = await fetch('/api/collections', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeCollectionModal();
      document.getElementById('collectionForm').reset();
      loadCategoriesAndCollections();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

function deleteCollection(id) {
  window.showModal('Xác nhận xóa bộ sưu tập game này?', async () => {
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadCategoriesAndCollections();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Coupon triggers
function openCouponModal() { document.getElementById('coupon-modal-overlay').style.display = 'flex'; }
function closeCouponModal() { document.getElementById('coupon-modal-overlay').style.display = 'none'; }

async function handleCouponSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('coup-code').value.trim().toUpperCase();
  const name = document.getElementById('coup-name').value.trim();
  const discountType = document.getElementById('coup-type').value;
  const discountValue = Number(document.getElementById('coup-val').value);
  const minOrderValue = Number(document.getElementById('coup-minVal').value);
  const usageLimit = Number(document.getElementById('coup-limit').value);
  const startDate = document.getElementById('coup-start').value;
  const endDate = document.getElementById('coup-end').value;

  const couponBody = { code, name, discountType, discountValue, minOrderValue, usageLimit, startDate, endDate };

  try {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponBody)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      closeCouponModal();
      document.getElementById('couponForm').reset();
      loadCoupons();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

function deleteCoupon(id) {
  window.showModal('Xác nhận xóa mã giảm giá này?', async () => {
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadCoupons();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Site settings trigger
async function handleSiteSettingsSubmit(e) {
  e.preventDefault();
  const bannerTitle = document.getElementById('bannerTitle').value.trim();
  const bannerSubtitle = document.getElementById('bannerSubtitle').value.trim();
  const contactPhone = document.getElementById('contactPhone').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();
  const address = document.getElementById('address').value.trim();
  
  const zaloLink = document.getElementById('zaloLink').value.trim();
  const facebookLink = document.getElementById('facebookLink').value.trim();
  const tiktokLink = document.getElementById('tiktokLink').value.trim();

  const bankName = document.getElementById('bankName').value.trim();
  const accountNumber = document.getElementById('bankAccount').value.trim();
  const ownerName = document.getElementById('bankOwner').value.trim();

  const settingsBody = {
    bannerTitle,
    bannerSubtitle,
    contactPhone,
    contactEmail,
    address,
    zaloLink,
    facebookLink,
    tiktokLink,
    bankInfo: { bankName, accountNumber, ownerName }
  };

  try {
    const res = await fetch('/api/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsBody)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadSiteSettingsForm();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

window.editNick = editNick;
window.deleteNick = deleteNick;
window.deleteCategory = deleteCategory;
window.deleteCollection = deleteCollection;
window.changeUserRole = changeUserRole;
window.toggleUserStatus = toggleUserStatus;
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.deleteCoupon = deleteCoupon;
window.openNickModal = openNickModal;
window.closeNickModal = closeNickModal;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.openCollectionModal = openCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.openCouponModal = openCouponModal;
window.closeCouponModal = closeCouponModal;

// Recharges Approve/Reject logic
let currentRechargeSubTab = 'card';

function setupRechargesSubTabs() {
  const btnCard = document.getElementById('btn-recharge-tab-card');
  const btnBank = document.getElementById('btn-recharge-tab-bank');
  const cardView = document.getElementById('recharge-card-admin-view');
  const bankView = document.getElementById('recharge-bank-admin-view');

  if (btnCard && btnBank && cardView && bankView) {
    btnCard.onclick = () => {
      btnCard.classList.remove('btn-outline');
      btnCard.classList.add('btn-cyan');
      btnBank.classList.remove('btn-cyan');
      btnBank.classList.add('btn-outline');
      cardView.style.display = 'block';
      bankView.style.display = 'none';
      currentRechargeSubTab = 'card';
      loadRechargeRequests();
    };

    btnBank.onclick = () => {
      btnBank.classList.remove('btn-outline');
      btnBank.classList.add('btn-cyan');
      btnCard.classList.remove('btn-cyan');
      btnCard.classList.add('btn-outline');
      cardView.style.display = 'none';
      bankView.style.display = 'block';
      currentRechargeSubTab = 'bank';
      loadRechargeRequests();
    };
  }
}

async function loadRechargeRequests() {
  try {
    if (currentRechargeSubTab === 'card') {
      const tbody = document.getElementById('admin-cards-tbody');
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Đang tải danh sách thẻ cào...</td></tr>';
      
      const res = await fetch('/api/wallet/admin/cards');
      const data = await res.json();
      
      if (data.success && data.recharges.length > 0) {
        tbody.innerHTML = '';
        data.recharges.forEach(r => {
          const tr = document.createElement('tr');
          const time = new Date(r.createdAt).toLocaleString('vi-VN');
          const username = r.user ? `${r.user.fullName} (@${r.user.username})` : 'N/A';
          
          let actionsHtml = '';
          if (r.status === 'pending') {
            actionsHtml = `
              <button onclick="processCardRechargeAdmin('${r._id}', 'approved')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Duyệt</button>
              <button onclick="processCardRechargeAdmin('${r._id}', 'rejected')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">Từ chối</button>
              <button onclick="processCardRechargeAdmin('${r._id}', 'duplicate')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">Trùng</button>
            `;
          } else {
            actionsHtml = `<span style="color: var(--text-muted); font-size: 0.85rem;">Đã xử lý bởi ${r.processedBy ? r.processedBy.username : 'QTV'}</span>`;
          }

          tr.innerHTML = `
            <td style="font-size: 0.85rem; color: var(--text-muted);">${time}</td>
            <td><strong>${username}</strong></td>
            <td><span class="status-badge pending">${r.provider.toUpperCase()}</span></td>
            <td style="font-weight: bold; color: white;">${r.denomination.toLocaleString('vi-VN')}đ</td>
            <td style="font-family: monospace;">${r.serial}</td>
            <td style="font-family: monospace;">${r.code}</td>
            <td><span class="status-badge ${r.status}">${r.status}</span></td>
            <td>${actionsHtml}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Không có yêu cầu nạp thẻ cào nào.</td></tr>';
      }
    } else {
      const tbody = document.getElementById('admin-banks-tbody');
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải danh sách chuyển khoản...</td></tr>';
      
      const res = await fetch('/api/wallet/admin/banks');
      const data = await res.json();
      
      if (data.success && data.recharges.length > 0) {
        tbody.innerHTML = '';
        data.recharges.forEach(r => {
          const tr = document.createElement('tr');
          const time = new Date(r.createdAt).toLocaleString('vi-VN');
          const username = r.user ? `${r.user.fullName} (@${r.user.username})` : 'N/A';
          
          let actionsHtml = '';
          if (r.status === 'pending') {
            actionsHtml = `
              <button onclick="processBankRechargeAdmin('${r._id}', 'approved')" class="btn btn-cyan" style="padding: 4px 8px; font-size: 0.8rem;">Duyệt</button>
              <button onclick="processBankRechargeAdmin('${r._id}', 'rejected')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem; margin-left: 5px;">Từ chối</button>
            `;
          } else {
            actionsHtml = `<span style="color: var(--text-muted); font-size: 0.85rem;">Đã xử lý bởi ${r.processedBy ? r.processedBy.username : 'QTV'}</span>`;
          }

          tr.innerHTML = `
            <td style="font-size: 0.85rem; color: var(--text-muted);">${time}</td>
            <td><strong>${username}</strong></td>
            <td style="font-weight: bold; color: white;">${r.amount.toLocaleString('vi-VN')}đ</td>
            <td>
              <a href="${r.proofImage}" target="_blank">
                <img src="${r.proofImage}" style="max-height: 50px; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;" alt="Bill bill">
              </a>
            </td>
            <td><span class="status-badge ${r.status}">${r.status}</span></td>
            <td>${actionsHtml}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Không có yêu cầu nạp chuyển khoản nào.</td></tr>';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function processCardRechargeAdmin(id, action) {
  let reason = '';
  if (action === 'rejected' || action === 'duplicate') {
    reason = window.prompt('Nhập lý do từ chối / trùng lặp (không bắt buộc):') || '';
  }

  try {
    const res = await fetch(`/api/wallet/admin/card/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadRechargeRequests();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function processBankRechargeAdmin(id, action) {
  let note = '';
  if (action === 'rejected') {
    note = window.prompt('Nhập lý do từ chối (không bắt buộc):') || '';
  }

  try {
    const res = await fetch(`/api/wallet/admin/bank/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message, 'success');
      loadRechargeRequests();
      loadAuditLogs();
    } else {
      window.showToast(data.message, 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

window.processCardRechargeAdmin = processCardRechargeAdmin;
window.processBankRechargeAdmin = processBankRechargeAdmin;
