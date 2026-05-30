const Category = require('../models/Category');
const generateSlug = require('../utils/generateSlug');
const deleteFile = require('../utils/deleteFile');
const createAuditLog = require('../utils/createAuditLog');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục.' });
    }
    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const slug = generateSlug(name);

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Danh mục này đã tồn tại.' });
    }

    let image = '';
    if (req.file) {
      image = `/uploads/categories/${req.file.filename}`;
    }

    const newCategory = await Category.create({
      name,
      slug,
      description,
      image
    });

    await createAuditLog(req.user._id, 'CREATE_CATEGORY', `Tạo danh mục mới: ${name}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công.',
      category: newCategory
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục.' });
    }

    if (name && name !== category.name) {
      const slug = generateSlug(name);
      const existingCategory = await Category.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'Tên danh mục đã bị trùng.' });
      }
      category.name = name;
      category.slug = slug;
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (req.file) {
      // delete old file
      if (category.image) {
        deleteFile(category.image);
      }
      category.image = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();

    await createAuditLog(req.user._id, 'UPDATE_CATEGORY', `Cập nhật danh mục: ${category.name}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công.',
      category
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục.' });
    }

    if (category.image) {
      deleteFile(category.image);
    }

    await Category.deleteOne({ _id: req.params.id });

    await createAuditLog(req.user._id, 'DELETE_CATEGORY', `Xóa danh mục: ${category.name}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Xóa danh mục thành công.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
