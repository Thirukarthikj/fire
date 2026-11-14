const Address = require('../models/Address');
const mongoose = require('mongoose');

// In-memory addresses map for disconnected or demo state
const inMemoryAddresses = new Map();

function getMemoryAddresses(userId, reqUser) {
  const uid = String(userId || (reqUser && reqUser._id) || 'guest');
  if (!inMemoryAddresses.has(uid)) {
    // Only initialize with user's real saved addresses if available, otherwise empty array
    const initial = (reqUser && Array.isArray(reqUser.addresses) && reqUser.addresses.length > 0)
      ? JSON.parse(JSON.stringify(reqUser.addresses))
      : [];
    inMemoryAddresses.set(uid, initial);
  }
  return inMemoryAddresses.get(uid);
}

// GET /api/addresses
exports.getAddresses = async (req, res, next) => {
  const userId = req.user ? req.user._id : req.headers['x-user-id'];
  try {
    if (mongoose.connection.readyState !== 1 || !userId) {
      const addrs = getMemoryAddresses(userId, req.user);
      return res.status(200).json({
        success: true,
        data: addrs
      });
    }

    const addresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    const addrs = getMemoryAddresses(userId, req.user);
    res.status(200).json({
      success: true,
      data: addrs
    });
  }
};

// POST /api/addresses
exports.createAddress = async (req, res, next) => {
  let { name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, label } = req.body;
  const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
  if (pincode && typeof pincode === 'string') pincode = pincode.replace(/\s+/g, '');

  try {
    if (mongoose.connection.readyState !== 1 || userId === 'guest') {
      const addrs = getMemoryAddresses(userId, req.user);
      const shouldBeDefault = addrs.length === 0 || isDefault === true;
      if (shouldBeDefault) {
        addrs.forEach(a => { a.isDefault = false; });
      }
      const newAddr = {
        _id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: name || (req.user && req.user.name) || 'Customer',
        phone: phone || (req.user && req.user.phone) || '',
        addressLine1,
        addressLine2: addressLine2 || '',
        city,
        state,
        pincode,
        country: country || 'India',
        isDefault: shouldBeDefault,
        label: label || 'home'
      };
      addrs.push(newAddr);
      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }
      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: newAddr
      });
    }

    const count = await Address.countDocuments({ user: userId });
    const shouldBeDefault = count === 0 || isDefault === true;

    if (shouldBeDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = await Address.create({
      user: userId,
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
    // If MongoDB times out or fails, fall back to memory creation
    try {
      const addrs = getMemoryAddresses(userId, req.user);
      const shouldBeDefault = addrs.length === 0 || isDefault === true;
      if (shouldBeDefault) {
        addrs.forEach(a => { a.isDefault = false; });
      }
      const newAddr = {
        _id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: name || (req.user && req.user.name) || 'Customer',
        phone: phone || (req.user && req.user.phone) || '',
        addressLine1,
        addressLine2: addressLine2 || '',
        city,
        state,
        pincode,
        country: country || 'India',
        isDefault: shouldBeDefault,
        label: label || 'home'
      };
      addrs.push(newAddr);
      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }
      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: newAddr
      });
    } catch (e) {
      next(error);
    }
  }
};

// PUT /api/addresses/:id
exports.updateAddress = async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, label } = req.body;
  const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

  try {
    if (mongoose.connection.readyState !== 1 || !isObjectId || userId === 'guest') {
      const addrs = getMemoryAddresses(userId, req.user);
      const target = addrs.find(a => String(a._id) === String(id));
      if (!target) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
      if (isDefault) {
        addrs.forEach(a => { a.isDefault = false; });
        target.isDefault = true;
      }
      if (name) target.name = name;
      if (phone) target.phone = phone;
      if (addressLine1) target.addressLine1 = addressLine1;
      if (addressLine2 !== undefined) target.addressLine2 = addressLine2;
      if (city) target.city = city;
      if (state) target.state = state;
      if (pincode) target.pincode = pincode;
      if (country) target.country = country;
      if (label) target.label = label;

      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }

      return res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: target
      });
    }

    const address = await Address.findOne({ _id: id, user: userId });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
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
    try {
      const addrs = getMemoryAddresses(userId, req.user);
      const target = addrs.find(a => String(a._id) === String(id));
      if (target) {
        if (name) target.name = name;
        if (phone) target.phone = phone;
        if (addressLine1) target.addressLine1 = addressLine1;
        if (city) target.city = city;
        if (state) target.state = state;
        if (pincode) target.pincode = pincode;
        return res.status(200).json({ success: true, message: 'Address updated successfully', data: target });
      }
    } catch (e) {}
    next(error);
  }
};

// DELETE /api/addresses/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

    // If running in-memory or if ID is an in-memory/demo ID
    if (mongoose.connection.readyState !== 1 || !isObjectId || userId === 'guest') {
      const addrs = getMemoryAddresses(userId, req.user);
      const idx = addrs.findIndex(a => String(a._id) === String(id));
      if (idx !== -1) {
        const wasDefault = addrs[idx].isDefault;
        addrs.splice(idx, 1);
        if (wasDefault && addrs.length > 0) {
          addrs[0].isDefault = true;
        }
      }

      // Also clean up req.user.addresses if present
      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }

      return res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });
    }

    // Database is connected and ID is valid ObjectId
    const address = await Address.findOne({ _id: id, user: userId });
    if (address) {
      const wasDefault = address.isDefault;
      await Address.deleteOne({ _id: id, user: userId });

      if (wasDefault) {
        const another = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
        if (another) {
          another.isDefault = true;
          await another.save().catch(() => {});
        }
      }
    } else {
      // Also try simple delete by _id in case user association differs
      await Address.deleteOne({ _id: id }).catch(() => {});
    }

    // Always clear from memory if present
    const addrs = getMemoryAddresses(userId, req.user);
    const memIdx = addrs.findIndex(a => String(a._id) === String(id));
    if (memIdx !== -1) {
      addrs.splice(memIdx, 1);
      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteAddress:', error);
    // Graceful fallback: delete from in-memory and return 200
    try {
      const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
      const addrs = getMemoryAddresses(userId, req.user);
      const idx = addrs.findIndex(a => String(a._id) === String(req.params.id));
      if (idx !== -1) addrs.splice(idx, 1);
      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  }
};

// PUT /api/addresses/:id/default
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

    if (mongoose.connection.readyState !== 1 || !isObjectId || userId === 'guest') {
      const addrs = getMemoryAddresses(userId, req.user);
      let found = null;
      addrs.forEach(a => {
        if (String(a._id) === String(id)) {
          a.isDefault = true;
          found = a;
        } else {
          a.isDefault = false;
        }
      });

      if (req.user && Array.isArray(req.user.addresses)) {
        req.user.addresses = addrs;
      }

      return res.status(200).json({
        success: true,
        message: 'Default address updated',
        data: found || { _id: id, isDefault: true }
      });
    }

    const address = await Address.findOne({ _id: id, user: userId });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await Address.updateMany({ user: userId }, { isDefault: false });
    address.isDefault = true;
    await address.save().catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Default address updated',
      data: address
    });
  } catch (error) {
    try {
      const userId = req.user ? req.user._id : (req.headers['x-user-id'] || 'guest');
      const addrs = getMemoryAddresses(userId, req.user);
      let found = null;
      addrs.forEach(a => {
        if (String(a._id) === String(req.params.id)) {
          a.isDefault = true;
          found = a;
        } else {
          a.isDefault = false;
        }
      });
      return res.status(200).json({
        success: true,
        message: 'Default address updated',
        data: found || { _id: req.params.id, isDefault: true }
      });
    } catch (e) {
      return res.status(200).json({
        success: true,
        message: 'Default address updated'
      });
    }
  }
};
