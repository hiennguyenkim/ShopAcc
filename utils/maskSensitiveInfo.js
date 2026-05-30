const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.substring(0, 2)}***${name.substring(name.length - 1)}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || phone.length < 6) return phone;
  return `${phone.substring(0, 3)}****${phone.substring(phone.length - 3)}`;
};

const maskSensitiveInfo = {
  maskEmail,
  maskPhone
};

module.exports = maskSensitiveInfo;
