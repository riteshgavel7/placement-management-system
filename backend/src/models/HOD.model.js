const mongoose = require('mongoose');

const hodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true }, 
    role: { type: String, default: 'HOD' }
});

const HOD = mongoose.model('HOD', hodSchema);
module.exports = HOD;