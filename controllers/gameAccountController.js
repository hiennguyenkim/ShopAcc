const GameAccount = require('../models/GameAccount');
const Category = require('../models/Category');
const generateSlug = require('../utils/generateSlug');
const deleteFile = require('../utils/deleteFile');
const createAuditLog = require('../utils/createAuditLog');
const { decrypt } = require('../utils/cryptoHelper');

// Check if user is staff or admin
const isStaffOrAdmin = (user) => {
  return user && (user.role === 'staff' || user.role === 'admin');
};

const getGameAccounts = async (req, res, next) => {
  try {
    const { 
      gameType, 
      category, 
      minPrice, 
      maxPrice, 
      rank, 
      status, 
      search, 
      sort, 
      limit = 12, 
      page = 1,
      isAdminView 
    } = req.query;

    // Handle expired reservation times first to release accounts
    const expiredReservations = await GameAccount.find({
      status: 'reserved',
      reservedUntil: { $lt: new Date() }
    });

    if (expiredReservations.length > 0) {
      const expiredIds = expiredReservations.map(acc => acc._id);
      await GameAccount.updateMany(
        { _id: { $in: expiredIds } },
        { status: 'available', $unset: { reservedUntil: '' } }
      );
    }

    const query = {};

    // For public views, only show 'available' (or handle reserved expired dynamically)
    if (isAdminView === 'true' && isStaffOrAdmin(req.user)) {
      if (status) {
        query.status = status;
      }
    } else {
      // Public filter: default status is available if not specified
      query.status = status || 'available';
      query.isActive = true;
    }

    if (gameType) {
      if (gameType.includes(',')) {
        query.gameType = { $in: gameType.split(',') };
      } else {
        query.gameType = gameType;
      }
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (rank) {
      query.rank = { $regex: rank, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let selectFields = '-loginInfo';
    if (isAdminView === 'true' && isStaffOrAdmin(req.user)) {
      selectFields = ''; // Show all including loginInfo
    }

    // Sort setup
    let sortQuery = { createdAt: -1 };
    if (sort) {
      if (sort === 'price_asc') sortQuery = { price: 1 };
      else if (sort === 'price_desc') sortQuery = { price: -1 };
      else if (sort === 'newest') sortQuery = { createdAt: -1 };
      else if (sort === 'oldest') sortQuery = { createdAt: 1 };
    }

    const skip = (page - 1) * limit;

    const [gameAccounts, total] = await Promise.all([
      GameAccount.find(query)
        .select(selectFields)
        .populate('category', 'name slug')
        .sort(sortQuery)
        .skip(Number(skip))
        .limit(Number(limit)),
      GameAccount.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    const decryptedAccounts = gameAccounts.map(acc => {
      const obj = acc.toObject();
      if (obj.loginInfo && obj.loginInfo.password) {
        obj.loginInfo.password = decrypt(obj.loginInfo.password);
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: decryptedAccounts.length,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: totalPages,
      totalPages: totalPages,
      gameAccounts: decryptedAccounts,
      accounts: decryptedAccounts
    });
  } catch (error) {
    next(error);
  }
};

const getGameAccountById = async (req, res, next) => {
  try {
    let selectFields = '-loginInfo';
    if (req.user && req.user.role === 'admin') {
      selectFields = '';
    }

    const gameAccount = await GameAccount.findById(req.params.id)
      .select(selectFields)
      .populate('category', 'name slug');

    if (!gameAccount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản game.' });
    }

    if (req.user && req.user.role === 'admin') {
      await createAuditLog(
        req.user._id,
        'VIEW_CREDENTIALS',
        `Xem thông tin đăng nhập của nick: ${gameAccount.code}`,
        req.ip,
        'GameAccount',
        gameAccount._id
      );
    }

    const obj = gameAccount.toObject();
    if (obj.loginInfo && obj.loginInfo.password) {
      obj.loginInfo.password = decrypt(obj.loginInfo.password);
    }

    res.status(200).json({
      success: true,
      gameAccount: obj
    });
  } catch (error) {
    next(error);
  }
};

const getGameAccountBySlug = async (req, res, next) => {
  try {
    let selectFields = '-loginInfo';
    if (req.user && req.user.role === 'admin') {
      selectFields = '';
    }

    const gameAccount = await GameAccount.findOne({ slug: req.params.slug })
      .select(selectFields)
      .populate('category', 'name slug');

    if (!gameAccount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản game.' });
    }

    if (req.user && req.user.role === 'admin') {
      await createAuditLog(
        req.user._id,
        'VIEW_CREDENTIALS',
        `Xem thông tin đăng nhập của nick: ${gameAccount.code}`,
        req.ip,
        'GameAccount',
        gameAccount._id
      );
    }

    const obj = gameAccount.toObject();
    if (obj.loginInfo && obj.loginInfo.password) {
      obj.loginInfo.password = decrypt(obj.loginInfo.password);
    }

    res.status(200).json({
      success: true,
      gameAccount: obj
    });
  } catch (error) {
    next(error);
  }
};

const createGameAccount = async (req, res, next) => {
  try {
    const { 
      code, 
      name, 
      gameType, 
      category, 
      price, 
      oldPrice, 
      description, 
      rank, 
      level, 
      server, 
      accountType, 
      loginInfo,
      lienQuanInfo,
      freeFireInfo,
      fifaInfo,
      lolInfo,
      pubgInfo,
      warrantyDays
    } = req.body;

    const slug = generateSlug(`${gameType}-${code}-${name}`);

    // Check if code or slug unique
    const existing = await GameAccount.findOne({ $or: [{ code }, { slug }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản hoặc tiêu đề game đã tồn tại.' });
    }

    // Process images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push(`/uploads/game-accounts/${file.filename}`);
      });
    }

    const gameAccountData = {
      code,
      name,
      slug,
      gameType,
      category,
      price,
      oldPrice,
      description,
      rank,
      level,
      server,
      accountType,
      images,
      warrantyDays,
      loginInfo: typeof loginInfo === 'string' ? JSON.parse(loginInfo) : loginInfo,
      lienQuanInfo: typeof lienQuanInfo === 'string' ? JSON.parse(lienQuanInfo) : lienQuanInfo,
      freeFireInfo: typeof freeFireInfo === 'string' ? JSON.parse(freeFireInfo) : freeFireInfo,
      fifaInfo: typeof fifaInfo === 'string' ? JSON.parse(fifaInfo) : fifaInfo,
      lolInfo: typeof lolInfo === 'string' ? JSON.parse(lolInfo) : lolInfo,
      pubgInfo: typeof pubgInfo === 'string' ? JSON.parse(pubgInfo) : pubgInfo
    };

    const newAccount = await GameAccount.create(gameAccountData);

    await createAuditLog(req.user._id, 'CREATE_GAME_ACCOUNT', `Đăng bán nick mới: ${code} (${gameType})`, req.ip);

    const obj = newAccount.toObject();
    if (obj.loginInfo && obj.loginInfo.password) {
      obj.loginInfo.password = decrypt(obj.loginInfo.password);
    }

    res.status(201).json({
      success: true,
      message: 'Đăng bán tài khoản game thành công.',
      gameAccount: obj
    });
  } catch (error) {
    next(error);
  }
};

const updateGameAccount = async (req, res, next) => {
  try {
    const gameAccount = await GameAccount.findById(req.params.id);
    if (!gameAccount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản game.' });
    }

    const { 
      code, 
      name, 
      category, 
      price, 
      oldPrice, 
      description, 
      rank, 
      level, 
      server, 
      accountType, 
      loginInfo,
      lienQuanInfo,
      freeFireInfo,
      fifaInfo,
      lolInfo,
      pubgInfo,
      warrantyDays,
      status,
      isActive,
      deleteImages // array of image paths to delete
    } = req.body;

    if (code && code !== gameAccount.code) {
      const existing = await GameAccount.findOne({ code, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Mã tài khoản đã bị trùng.' });
      }
      gameAccount.code = code;
    }

    if (name) {
      gameAccount.name = name;
      gameAccount.slug = generateSlug(`${gameAccount.gameType}-${gameAccount.code}-${name}`);
    }

    if (category) gameAccount.category = category;
    if (price !== undefined) gameAccount.price = price;
    if (oldPrice !== undefined) gameAccount.oldPrice = oldPrice;
    if (description !== undefined) gameAccount.description = description;
    if (rank !== undefined) gameAccount.rank = rank;
    if (level !== undefined) gameAccount.level = level;
    if (server !== undefined) gameAccount.server = server;
    if (accountType !== undefined) gameAccount.accountType = accountType;
    if (warrantyDays !== undefined) gameAccount.warrantyDays = warrantyDays;
    if (status !== undefined) gameAccount.status = status;
    if (isActive !== undefined) gameAccount.isActive = isActive;

    if (loginInfo) {
      const parsedLogin = typeof loginInfo === 'string' ? JSON.parse(loginInfo) : loginInfo;
      gameAccount.loginInfo = { ...gameAccount.loginInfo, ...parsedLogin };
    }

    // Dynamic info updates
    if (lienQuanInfo) gameAccount.lienQuanInfo = typeof lienQuanInfo === 'string' ? JSON.parse(lienQuanInfo) : lienQuanInfo;
    if (freeFireInfo) gameAccount.freeFireInfo = typeof freeFireInfo === 'string' ? JSON.parse(freeFireInfo) : freeFireInfo;
    if (fifaInfo) gameAccount.fifaInfo = typeof fifaInfo === 'string' ? JSON.parse(fifaInfo) : fifaInfo;
    if (lolInfo) gameAccount.lolInfo = typeof lolInfo === 'string' ? JSON.parse(lolInfo) : lolInfo;
    if (pubgInfo) gameAccount.pubgInfo = typeof pubgInfo === 'string' ? JSON.parse(pubgInfo) : pubgInfo;

    // Handle image deletions
    let updatedImages = [...gameAccount.images];
    if (deleteImages) {
      const filesToDelete = typeof deleteImages === 'string' ? JSON.parse(deleteImages) : deleteImages;
      filesToDelete.forEach(img => {
        deleteFile(img);
        updatedImages = updatedImages.filter(i => i !== img);
      });
    }

    // Handle new uploads
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        updatedImages.push(`/uploads/game-accounts/${file.filename}`);
      });
    }
    gameAccount.images = updatedImages;

    await gameAccount.save();

    await createAuditLog(req.user._id, 'UPDATE_GAME_ACCOUNT', `Cập nhật thông tin nick: ${gameAccount.code}`, req.ip);

    const obj = gameAccount.toObject();
    if (obj.loginInfo && obj.loginInfo.password) {
      obj.loginInfo.password = decrypt(obj.loginInfo.password);
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản game thành công.',
      gameAccount: obj
    });
  } catch (error) {
    next(error);
  }
};

const deleteGameAccount = async (req, res, next) => {
  try {
    const gameAccount = await GameAccount.findById(req.params.id);
    if (!gameAccount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản game.' });
    }

    // Check if account is in sold status - might want to avoid deleting purchased logs, but admin can purge
    if (gameAccount.status === 'sold') {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa nick đã bán thành công vì liên quan đến lịch sử đơn hàng.' 
      });
    }

    // Delete files
    gameAccount.images.forEach(img => {
      deleteFile(img);
    });

    await GameAccount.deleteOne({ _id: req.params.id });

    await createAuditLog(req.user._id, 'DELETE_GAME_ACCOUNT', `Xóa nick game: ${gameAccount.code}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Xóa tài khoản game thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'reserved', 'sold', 'hidden', 'checking', 'error'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái nick không hợp lệ.' });
    }

    const gameAccount = await GameAccount.findById(req.params.id);
    if (!gameAccount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản game.' });
    }

    const oldStatus = gameAccount.status;
    gameAccount.status = status;
    
    if (status === 'sold') {
      gameAccount.soldAt = new Date();
    } else {
      gameAccount.soldAt = undefined;
    }

    await gameAccount.save();

    await createAuditLog(
      req.user._id, 
      'UPDATE_ACCOUNT_STATUS', 
      `Cập nhật trạng thái nick ${gameAccount.code} từ ${oldStatus} sang ${status}`, 
      req.ip
    );

    const obj = gameAccount.toObject();
    if (obj.loginInfo && obj.loginInfo.password) {
      obj.loginInfo.password = decrypt(obj.loginInfo.password);
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công.',
      gameAccount: obj
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGameAccounts,
  getGameAccountById,
  getGameAccountBySlug,
  createGameAccount,
  updateGameAccount,
  deleteGameAccount,
  updateStatus
};
