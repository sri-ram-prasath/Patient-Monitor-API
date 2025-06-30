const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Joi = require("joi");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors({
    origin: "http://localhost:3000", 
    methods: "GET,POST",
    allowedHeaders: "Content-Type",
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// Patient Schema
const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const Patient = mongoose.model("Patient", PatientSchema);

// Heart Rate Schema
const HeartRateSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  heartRate: { type: Number, required: true },
}, { timestamps: true });

const HeartRate = mongoose.model("HeartRate", HeartRateSchema);

// Validation Schemas
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// API: Register User
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Create user (No encryption)
    const newUser = new User({ name, email, password });
    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// API: Login User
app.post("/api/login", async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.status(200).json({ message: "Login successful", userId: user._id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// API: Add Patient
app.post("/api/patient", async (req, res) => {
  try {
    const { name, age, userId } = req.body;
    const newPatient = await Patient.create({ name, age, userId });
    res.status(201).json({ message: "Patient added", patientId: newPatient._id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// API: Get Patient by ID
app.get("/api/patient/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// API: Record Heart Rate
app.post("/api/heart-rate", async (req, res) => {
  try {
    const { patientId, heartRate } = req.body;
    const newRecord = await HeartRate.create({ patientId, heartRate });
    res.status(201).json({ message: "Heart rate recorded", recordId: newRecord._id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// API: Get Heart Rate for a Patient
app.get("/api/heart-rate/:patientId", async (req, res) => {
  try {
    const records = await HeartRate.find({ patientId: req.params.patientId });
    if (records.length === 0) return res.status(404).json({ error: "No records found" });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
