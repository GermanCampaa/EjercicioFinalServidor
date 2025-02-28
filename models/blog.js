const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: String,
  snippet: String,
  body: String,
  imagePath: String,
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
