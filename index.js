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
    const username = req.body.username;
    if (!username) return res.json({ error: "Path `username` is required." });
    
    const user = new User({ username });
    await user.save();
    
    res.json({ username: user.username, _id: user._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users - Lấy tất cả users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users.map(u => ({ username: u.username, _id: u._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper parsing dates ensuring correct UTC representation for freeCodeCamp test runner
function parseInputDate(dateStr) {
  if (!dateStr) return new Date();
  // Handles YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  }
  const d = new Date(dateStr);
  return d.toString() === 'Invalid Date' ? new Date() : d;
}

// POST /api/users/:_id/exercises - Thêm exercise cho user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = parseInputDate(date);

    const newExercise = new Exercise({
      userId: user._id.toString(),
      description: description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    const exercise = await newExercise.save();

    res.json({
      _id: user._id.toString(),
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:_id/logs - Lấy nhật ký tập luyện của user
app.get('/api/users/:_id/logs', async function(req, res) {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { from, to, limit } = req.query;

    let filter = { userId: user._id.toString() };

    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = parseInputDate(from);
      }
      if (to) {
        filter.date.$lte = parseInputDate(to);
      }
    }

    let query = Exercise.find(filter);

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id.toString(),
      username: user.username,
      count: log.length,
      log: log
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
