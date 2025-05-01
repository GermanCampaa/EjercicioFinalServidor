const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const Blog = require('./models/blog');
const User = require('./models/user');
const traerPeliculas = require('./models/apiPeliculas');
const dotenv = require('dotenv');
const methodOverride = require('method-override');

dotenv.config();

const app = express();
const PORT = 3002;
const db = process.env.MONGO_URI;

mongoose.connect(db)
  .then(() => {
    console.log('✅ Conectado a MongoDB correctamente');
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
  })
  .catch((error) => console.log('❌ Error al conectar con MongoDB:', error));

app.set('view engine', 'ejs');
app.set('views', 'views');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Usuario no encontrado' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Contraseña incorrecta' });
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(session({
  secret: require('crypto').randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 30 }
}));

app.use(methodOverride('_method'));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.message = req.flash('error');
  next();
});

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

app.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.render('main', { Title: 'INICIO', blogs });
  } catch (error) {
    console.log(error);
  }
});

app.get('/peliculas', async (req, res) => {
  try {
    const peliculas = await traerPeliculas();
    res.render('peliculas', { Title: 'Catálogo de Películas', peliculas });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al cargar películas');
  }
});

app.get('/blogs/crear', (req, res) => {
  res.render('crear', { Title: 'Crear Blog' });
});

app.post('/blogs/crear', upload.single('image'), async (req, res) => {
  const { title, snippet, body } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const newBlog = new Blog({ title, snippet, body, imagePath });
  try {
    await newBlog.save();
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
});

app.get('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    res.render('detalles', { blog, Title: 'Detalles Blog' });
  } catch (error) {
    console.log(error);
  }
});

app.get('/blogs/:id/editar', (req, res) => {
  const { id } = req.params;
  Blog.findById(id)
    .then(blog => {
      if (!blog) {
        return res.status(404).send('Blog no encontrado');
      }
      res.render('editar', { blog, Title: 'Editar Blog' });
    })
    .catch(error => {
      console.log(error);
      res.status(500).send('Error al cargar el blog');
    });
});

app.delete('/blogs/:id', (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send('Blog no encontrado');
  }
  Blog.findByIdAndDelete(id)
    .then(result => {
      if (!result) {
        return res.status(404).send('Blog no encontrado');
      }
      res.redirect('/');
    })
    .catch(error => {
      console.log(error);
      res.status(500).send('Error al eliminar el blog');
    });
});

app.put('/blogs/:id', (req, res) => {
  const { id } = req.params;
  const { title, snippet, body } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send('Blog no encontrado');
  }
  Blog.findByIdAndUpdate(id, { title, snippet, body }, { new: true })
    .then(result => {
      if (!result) {
        return res.status(404).send('Blog no encontrado');
      }
      res.redirect('/');
    })
    .catch(error => {
      console.log(error);
      res.status(500).send('Error al actualizar el blog');
    });
});

app.get('/login', (req, res) => {
  res.render('login', { Title: 'Login' });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/usuarios',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/sign-up', (req, res) => {
  res.render('sign-up', { Title: 'Registro' });
});

app.post('/sign-up', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('error', 'La cuenta ya existe');
      return res.redirect('/sign-up');
    }
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.log(error);
    req.flash('error', 'Error al crear cuenta');
    res.redirect('/sign-up');
  }
});

app.get('/usuarios', ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find();
    res.render('usuarios', { Title: 'Usuarios Registrados', users });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al cargar los usuarios');
  }
});

app.get('/logout', (req, res) => {
  req.logout(error => {
    if (error) {
      console.log(error);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.redirect('/');
  });
});

app.use((req, res) => {
  res.status(404).render('404', { Title: 'Error 404' });
});
