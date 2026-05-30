function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

async function addToCart(account) {
  if (!account) return;

  // Verify account is available
  if (['sold', 'hidden', 'checking', 'error'].includes(account.status)) {
    window.showToast('Không thể mua tài khoản này vì trạng thái không cho phép.', 'error');
    return;
  }

  try {
    // Check authentication
    const meRes = await fetch('/api/auth/me');
    const meData = await meRes.json();
    if (!meData.success || !meData.user) {
      window.showToast('Vui lòng đăng nhập để thực hiện tác vụ này.', 'warning');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }, 1000);
      return;
    }

    // Call backend API to add to database cart
    const cartRes = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account._id })
    });
    const cartData = await cartRes.json();
    if (!cartData.success) {
      window.showToast(cartData.message, 'error');
      return;
    }

    const cart = getCart();
    const exists = cart.some(item => item.accountId === account._id);
    
    if (exists) {
      window.showToast('Tài khoản này đã có trong giỏ hàng của bạn.', 'warning');
      return;
    }

    // Each account is unique (Quantity always 1)
    cart.push({
      accountId: account._id,
      code: account.code,
      name: account.name,
      gameType: account.gameType,
      image: account.images[0] || '',
      price: account.price,
      subtotal: account.price,
      slug: account.slug
    });

    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartBadge();
    window.showToast('Đã thêm vào giỏ hàng!', 'success');
  } catch (error) {
    console.error(error);
    window.showToast('Lỗi kết nối khi thêm vào giỏ.', 'error');
  }
}

function removeFromCart(accountId) {
  let cart = getCart();
  cart = cart.filter(item => item.accountId !== accountId);
  localStorage.setItem('cart', JSON.stringify(cart));
  window.updateCartBadge();
  window.showToast('Đã xóa khỏi giỏ hàng.', 'info');
}

function clearCart() {
  localStorage.removeItem('cart');
  window.updateCartBadge();
}

window.getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
