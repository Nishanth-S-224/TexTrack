require('dotenv').config();

const app=require('./app');
const mongoose = require('mongoose');
const dbUri = process.env.MONGO_URI;

mongoose.connect(dbUri)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err)); 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));