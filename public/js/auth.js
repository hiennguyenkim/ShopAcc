// Handles Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        window.showToast(data.message, 'success');
        setTimeout(() => {
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get('redirect');
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            // Redirect based on role
            if (data.user.role === 'admin') {
              window.location.href = '/admin-dashboard.html';
            } else if (data.user.role === 'staff') {
              window.location.href = '/staff-dashboard.html';
            } else {
              window.location.href = '/index.html';
            }
          }
        }, 1000);
      } else {
        window.showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      window.showToast('Có lỗi kết nối xảy ra.', 'error');
    }
  });
}

// Handles Register Form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, phone, password })
      });
      const data = await res.json();

      if (data.success) {
        window.showToast(data.message, 'success');
        setTimeout(() => {
          window.location.href = '/user-dashboard.html';
        }, 1000);
      } else {
        window.showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      window.showToast('Có lỗi kết nối xảy ra.', 'error');
    }
  });
}

// Handles Forgot Password Form
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        window.showToast(data.message, 'success');
        
        const resultDiv = document.getElementById('forgot-password-result');
        const passPlaceholder = document.getElementById('temp-password-placeholder');
        if (resultDiv && passPlaceholder) {
          passPlaceholder.textContent = data.tempPassword;
          resultDiv.style.display = 'block';
        }
      } else {
        window.showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      window.showToast('Có lỗi kết nối xảy ra.', 'error');
    }
  });
}
