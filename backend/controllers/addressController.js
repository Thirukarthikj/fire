const Address = require('../models/Address');

// GET /api/addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/addresses
exports.createAddress = async (req, res, next) => {
  try {
    const { name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, label } = req.body;

    const count = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = count === 0 || isDefault === true;

    if (shouldBeDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const address = await Address.create({
      user: req.user._id,
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country: country || 'India',
      isDefault: shouldBeDefault,
      label: label || 'home'
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/addresses/:id
exports.updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, label } = req.body;

    const address = await Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
      address.isDefault = true;
    }

    if (name) address.name = name;
    if (phone) address.phone = phone;
    if (addressLine1) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (pincode) address.pincode = pincode;
    if (country) address.country = country;
    if (label) address.label = label;

    await address.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/addresses/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, user: req.user._id });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    await address.deleteOne();

    if (wasDefault) {
      const another = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/addresses/:id/default
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, user: req.user._id });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await Address.updateMany({ user: req.user._id }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated',
      data: address
    });
  } catch (error) {
    next(error);
  }
};

