const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const dns = require('dns');

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
  .catch((err) => console.error('MongoDB connection error:', err));


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

    const exerciseDate = req.body.date
      ? new Date(req.body.date)
      : new Date();

    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: exerciseDate
    });

    const savedExercise = await exercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
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

    // FROM
    if (req.query.from) {
      filter.date = {
        ...filter.date,
        $gte: new Date(req.query.from)
      };
    }

    // TO
    if (req.query.to) {
      const toDate = new Date(req.query.to);

      // Bao gồm toàn bộ ngày "to"
      toDate.setUTCHours(23, 59, 59, 999);

      filter.date = {
        ...filter.date,
        $lte: toDate
      };
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
      username: user.username,
      count: log.length,
      _id: user._id,
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