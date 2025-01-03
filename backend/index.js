require('dotenv').config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express(); // Initialize app here, before using it

mongoose.connect(process.env.MONGODB_URI, 
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    err && console.error(err);
    console.log("Successfully connected to MongoDB: compilerdb");
  }
);

const { generateFile } = require("./generateFile");
const { addJobToQueue } = require("./jobQueue");
const Job = require("./models/Job");

// Use cors after app initialization
app.use(cors({
  origin: 'https://appro-s-online-compiler.vercel.app'
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST /run to run code
app.post("/run", async (req, res) => {
  const { language = "cpp", code } = req.body;

  console.log(language, "Length:", code.length);

  if (code === undefined) {
    return res.status(400).json({ success: false, error: "Empty code body!" });
  }
  
  // Need to generate a file with content from the request
  const filepath = await generateFile(language, code);

  // Save the job to DB
  const job = await new Job({ language, filepath }).save();
  const jobId = job["_id"];
  addJobToQueue(jobId);

  res.status(201).json({ jobId });
});

// GET / to check if the server is running
app.get("/", (req, res) => {
  res.json("Hello Arjun");
});

// GET /status to check job status
app.get("/status", async (req, res) => {
  const jobId = req.query.id;

  if (jobId === undefined) {
    return res.status(400).json({ success: false, error: "missing id query param" });
  }

  const job = await Job.findById(jobId);

  if (job === undefined) {
    return res.status(400).json({ success: false, error: "couldn't find job" });
  }

  return res.status(200).json({ success: true, job });
});

// Start the server
app.listen(5000, () => {
  console.log(`Listening on port 5000!`);
});
