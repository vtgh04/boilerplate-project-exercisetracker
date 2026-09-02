const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const dns = require('dns')
require('dotenv').config()

dns.setServers(['8.8.8.8', '8.8.4.4'])

mongoose.connect(process.env.MONGO_URI);

app.use(cors())
app.use(express.static('public'))

// Middleware parse body
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST /api/users - Tạo user mới
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const user = await newUser.save();
    res.json({ username: user.username, _id: String(user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users - Lấy tất cả users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users.map(u => ({ username: u.username, _id: String(u._id) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper parsing date String format (YYYY-MM-DD) avoiding timezone shifts
function parseDate(dateString) {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateString);
}

// POST /api/users/:_id/exercises - Thêm exercise cho user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = parseDate(date);

    const newExercise = new Exercise({
      userId: String(user._id),
      description: String(description),
      duration: parseInt(duration),
      date: exerciseDate
    });

    const exercise = await newExercise.save();

    res.json({
      _id: String(user._id),
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:_id/logs - Lấy nhật ký tập luyện của user
app.get('/api/users/:_id/logs', async function(req, res) {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const filter = {
      userId: String(user._id)
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
      _id: String(user._id),
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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
