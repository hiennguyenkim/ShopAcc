const Collection = require('../models/Collection');
const generateSlug = require('../utils/generateSlug');
const deleteFile = require('../utils/deleteFile');
const createAuditLog = require('../utils/createAuditLog');

const getCollections = async (req, res, next) => {
  try {
    const { all } = req.query;
    const filter = {};
    if (all !== 'true') {
      filter.isActive = true;
    }

    const collections = await Collection.find(filter)
      .populate({
        path: 'accounts',
        select: '-loginInfo'
      })
      .sort({ sortOrder: 1, createdAt: -1 });

    const result = collections.map(col => {
      const obj = col.toObject();
      // Backwards compatibility mappings
      obj.image = col.thumbnail;
      obj.gameAccounts = col.accounts || [];
      obj.accountCount = col.accounts ? col.accounts.length : 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: result.length,
      collections: result
    });
  } catch (error) {
    next(error);
  }
};

const getCollectionById = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id).populate({
      path: 'accounts',
      select: '-loginInfo'
    });

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    const obj = collection.toObject();
    obj.image = collection.thumbnail;
    obj.gameAccounts = collection.accounts || [];

    res.status(200).json({
      success: true,
      collection: obj
    });
  } catch (error) {
    next(error);
  }
};

const getCollectionBySlug = async (req, res, next) => {
  try {
    const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).populate({
      path: 'accounts',
      select: '-loginInfo'
    });

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    const obj = collection.toObject();
    obj.image = collection.thumbnail;
    obj.gameAccounts = collection.accounts || [];

    res.status(200).json({
      success: true,
      collection: obj
    });
  } catch (error) {
    next(error);
  }
};

const createCollection = async (req, res, next) => {
  try {
    const { name, description, accounts, isActive, sortOrder } = req.body;
    const slug = generateSlug(name);

    const existingCollection = await Collection.findOne({ slug });
    if (existingCollection) {
      return res.status(400).json({ success: false, message: 'Bộ sưu tập này đã tồn tại.' });
    }

    let thumbnail = '';
    if (req.file) {
      thumbnail = `/uploads/collections/${req.file.filename}`;
    }

    let accountsList = [];
    if (accounts) {
      accountsList = typeof accounts === 'string' ? JSON.parse(accounts) : accounts;
    }

    const newCollection = await Collection.create({
      name,
      slug,
      description,
      thumbnail,
      accounts: accountsList,
      isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
      sortOrder: Number(sortOrder || 0)
    });

    await createAuditLog(req.user._id, 'CREATE_COLLECTION', `Tạo bộ sưu tập mới: ${name}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tạo bộ sưu tập thành công.',
      collection: newCollection
    });
  } catch (error) {
    next(error);
  }
};

const updateCollection = async (req, res, next) => {
  try {
    const { name, description, accounts, isActive, sortOrder } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    if (name && name !== collection.name) {
      const slug = generateSlug(name);
      const existingCollection = await Collection.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingCollection) {
        return res.status(400).json({ success: false, message: 'Tên bộ sưu tập đã bị trùng.' });
      }
      collection.name = name;
      collection.slug = slug;
    }

    if (description !== undefined) {
      collection.description = description;
    }

    if (accounts !== undefined) {
      collection.accounts = typeof accounts === 'string' ? JSON.parse(accounts) : accounts;
    }

    if (isActive !== undefined) {
      collection.isActive = isActive === 'true' || isActive === true;
    }

    if (sortOrder !== undefined) {
      collection.sortOrder = Number(sortOrder);
    }

    if (req.file) {
      if (collection.thumbnail) {
        deleteFile(collection.thumbnail);
      }
      collection.thumbnail = `/uploads/collections/${req.file.filename}`;
    }

    await collection.save();

    await createAuditLog(req.user._id, 'UPDATE_COLLECTION', `Cập nhật bộ sưu tập: ${collection.name}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Cập nhật bộ sưu tập thành công.',
      collection
    });
  } catch (error) {
    next(error);
  }
};

const deleteCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    if (collection.thumbnail) {
      deleteFile(collection.thumbnail);
    }

    await Collection.deleteOne({ _id: req.params.id });

    await createAuditLog(req.user._id, 'DELETE_COLLECTION', `Xóa bộ sưu tập: ${collection.name}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Xóa bộ sưu tập thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const addAccountToCollection = async (req, res, next) => {
  try {
    const { accountId } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    if (!collection.accounts.includes(accountId)) {
      collection.accounts.push(accountId);
      await collection.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã thêm nick vào bộ sưu tập.',
      collection
    });
  } catch (error) {
    next(error);
  }
};

const removeAccountFromCollection = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ sưu tập.' });
    }

    collection.accounts = collection.accounts.filter(id => id.toString() !== accountId);
    await collection.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa nick khỏi bộ sưu tập.',
      collection
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCollections,
  getCollectionById,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
  addAccountToCollection,
  removeAccountFromCollection
};
