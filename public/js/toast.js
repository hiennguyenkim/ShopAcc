const showToast = (message, type = 'success') => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '🔔';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  // Fadeout and remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'scale(0.9)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

const showModal = (message, onConfirm) => {
  let overlay = document.getElementById('custom-confirm-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'custom-confirm-modal';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Xác nhận tác vụ</h3>
        <button class="modal-close" onclick="closeConfirmModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeConfirmModal()">Hủy</button>
        <button class="btn btn-cyan" id="confirmModalBtn">Đồng ý</button>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';

  const confirmBtn = overlay.querySelector('#confirmModalBtn');
  confirmBtn.onclick = () => {
    onConfirm();
    closeConfirmModal();
  };
};

const closeConfirmModal = () => {
  const overlay = document.getElementById('custom-confirm-modal');
  if (overlay) {
    overlay.style.display = 'none';
  }
};

window.showToast = showToast;
window.showModal = showModal;
window.closeConfirmModal = closeConfirmModal;
