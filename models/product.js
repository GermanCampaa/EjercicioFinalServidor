const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  paypalId: String,  // PayPal Button ID
});

module.exports = mongoose.model('Product', productSchema);
