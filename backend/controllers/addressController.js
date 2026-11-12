const Address = require('../models/Address');
const mongoose = require('mongoose');

// In-memory addresses map for disconnected or demo state
const inMemoryAddresses = new Map();

function getMemoryAddresses(userId, reqUser) {
  const uid = String(userId);
  if (!inMemoryAddresses.has(uid)) {
    const initial = (reqUser && reqUser.addresses && reqUser.addresses.length)
      ? JSON.parse(JSON.stringify(reqUser.addresses))
      : [
          {
            _id: 'addr_demo_' + Date.now(),
            name: reqUser && reqUser.name ? reqUser.name : 'Rahul Sharma',
            phone: reqUser && reqUser.phone ? reqUser.phone : '+91 98765 43210',
            addressLine1: '42 Diwalipura Garden Street',
            addressLine2: 'Near Gandhi Circle',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600001',
            country: 'India',
            isDefault: true,
            label: 'home'
          }
        ];
    inMemoryAddresses.set(uid, initial);
  }
  return inMemoryAddresses.get(uid);
}

// GET /api/addresses
exports.getAddresses = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const addrs = getMemoryAddresses(req.user._id, req.user);
      return res.status(200).json({
        success: true,
        data: addrs
      });
    }

    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    const addrs = getMemoryAddresses(req.user._id, req.user);
    res.status(200).json({
      success: true,
      data: addrs
    });
  }
};

// POST /api/addresses
exports.createAddress = async (req, res, next) => {
  try {
    const { name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, label } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const addrs = getMemoryAddresses(req.user._id, req.user);
      const shouldBeDefault = addrs.length === 0 || isDefault === true;
      if (shouldBeDefault) {
        addrs.forEach(a => a.isDefault = false);
      }
      const newAddr = {
        _id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: name || req.user.name,
        phone: phone || req.user.phone,
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
      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: newAddr
      });
    }

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

