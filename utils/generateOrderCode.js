const generateOrderCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `ORD-${dateStr}-${code}`;
};

module.exports = generateOrderCode;
