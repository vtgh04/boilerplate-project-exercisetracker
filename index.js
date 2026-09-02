const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

// Thêm DNS Google trực tiếp trong code
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.static('public'));

// Đọc dữ liệu form POST
app.use(express.urlencoded({ extended: false }));

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB Error:', err));


// ====================
// SCHEMA & MODEL
// ====================

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', userSchema);


const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  description: {
    type: String,
    required: true
  },

  duration: {
    type: Number,
    required: true
  },

  date: {
    type: Date,
    required: true
  }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);


// ====================
// HOME PAGE
// ====================

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// ====================
// CREATE USER
// POST /api/users
// ====================

app.post('/api/users', async function(req, res) {
  try {
    const user = new User({
      username: req.body.username
    });

    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


// ====================
// GET ALL USERS
// GET /api/users
// ====================

app.get('/api/users', async function(req, res) {
  try {
    const users = await User.find({});

    const result = users.map(function(user) {
      return {
        username: user.username,
        _id: user._id
      };
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


// Helper để parse ngày từ string YYYY-MM-DD không bị lệch múi giờ
function parseDate(dateString) {
  if (!dateString) return new Date();
  const dateParts = dateString.split('-');
  if (dateParts.length === 3) {
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  }
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ====================
// ADD EXERCISE
// POST /api/users/:_id/exercises
// ====================

app.post('/api/users/:_id/exercises', async function(req, res) {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const exerciseDate = parseDate(req.body.date);

    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: exerciseDate
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id.toString(),
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


// ====================
// GET USER LOG
// GET /api/users/:_id/logs
// ====================

app.get('/api/users/:_id/logs', async function(req, res) {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const filter = {
      userId: user._id
    };

    if (req.query.from || req.query.to) {
      filter.date = {};

      if (req.query.from) {
        filter.date.$gte = parseDate(req.query.from);
      }

      if (req.query.to) {
        filter.date.$lte = parseDate(req.query.to);
      }
    }

    let query = Exercise.find(filter);

    // LIMIT
    if (req.query.limit) {
      query = query.limit(Number(req.query.limit));
    }

    const exercises = await query;

    const log = exercises.map(function(exercise) {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      };
    });

    res.json({
      _id: user._id.toString(),
      username: user.username,
      count: log.length,
      log: log
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


// ====================
// START SERVER
// ====================

const listener = app.listen(process.env.PORT || 3000, function() {
  console.log(
    'Your app is listening on port ' +
    listener.address().port
  );
});