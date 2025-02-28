const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { type } = require('os');

// Definir el esquema para el modelo de usuario
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email:{
    type:String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Método para encriptar la contraseña antes de guardar el usuario
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
