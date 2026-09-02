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
    
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }
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

// Helper for parsing date strings safely (handles standard UTC dates used by FCC runner)
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (d.toString() === 'Invalid Date') {
    return new Date();
  }
  // If YYYY-MM-DD string format, append UTC time to avoid timezone offset shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  return d;
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
        filter.date.$gte = parseDate(from);
      }
      if (to) {
        filter.date.$lte = parseDate(to);
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
