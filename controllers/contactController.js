const ContactMessage = require('../models/ContactMessage');
const createAuditLog = require('../utils/createAuditLog');

const createMessage = async (req, res, next) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
    }

    const newMessage = await ContactMessage.create({
      fullName,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Gửi lời nhắn thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.',
      contactMessage: newMessage
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    }

    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ.' });
    }

    message.status = status;
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái tin nhắn thành công.',
      contactMessage: message
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMessage,
  getMessages,
  updateStatus
};
