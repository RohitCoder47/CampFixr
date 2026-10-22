const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const crypto = require("crypto");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const complaintSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: String,
priority: String,
assignment: String,
  possibleDuplicateIds: { type: [String], default: [] },
verifiedBy: { type: String, default: "" },
verifiedAt: { type: Date, default: null },
assignedDepartment: { type: String, default: "" },
assignedTo: { type: String, default: "" },
assignedAt: { type: Date, default: null },
status: { type: String, default: "Submitted" },
  activity: [{
    action: { type: String, required: true },
    by: { type: String, default: "" },
    role: { type: String, default: "" },
    date: { type: Date, default: Date.now }
  }],
date: { type: Date, default: Date.now }
});

const Complaint = mongoose.model("Complaint", complaintSchema);
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["student", "admin", "department"],
    required: true
  },
  department: {
    type: String,
    default: ""
  },
  passwordResetCodeHash: { type: String, default: "" },
  passwordResetExpiresAt: { type: Date, default: null },
  passwordResetAttempts: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  postedBy: { type: String, required: true },
  date: { type: Date, default: Date.now }
});
const Notice = mongoose.model("Notice", noticeSchema);

function requireLogin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Please sign in first." });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Login expired. Sign in again." });
  }
}

function requireRole(role) {
  return function (req, res, next) {
    if (req.user.role !== role) {
      return res.status(403).json({
        message: "A student account is required to submit a complaint."
      });
    }
    next();
  };
}

app.get("/api/notices", requireLogin, async function (req, res) {
  try {
    const notices = await Notice.find().sort({ date: -1 }).limit(50).lean();
    res.json(notices);
  } catch (error) {
    console.error("Notices load error:", error.message);
    res.status(500).json({ message: "Failed to load notices."});
  }
});

app.post("/api/admin/notices", requireLogin, async function (req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    if (!title || !message) {
      return res.status(400).json({ message: "Title and notice message are required."});
    }

    const notice = await Notice.create({
      title: title,
      message: message,
      postedBy: req.user.username
    });
    res.status(201).json({ message:"Notice published successfully.", notice: notice });
  } catch (error) {
    console.error("Notice create error:", error.message);
    res.status(500).json({ message:"Failed to publish notice." });
  }
});

app.post("/api/admin/password-reset-code", requireLogin, async function (req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const username = String(req.body.username || "").trim();
    const student = await User.findOne({ username: username, role: "student" });
    if (!student) {
      return res.status(404).json({ message:"No account found with this Student ID." });
    }

    const code = crypto.randomBytes(6).toString("hex").toUpperCase();
    student.passwordResetCodeHash = crypto.createHash("sha256").update(code).digest("hex");
    student.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    student.passwordResetAttempts = 0;
    await student.save();

    res.json({
      message: "A one-time reset code has been generated and is valid for 15 minutes. Share the code securely with the student.",
      resetCode: code
    });
  } catch (error) {
    console.error("Password reset code error:", error.message);
    res.status(500).json({ message:"Failed to generate reset code." });
  }
});

app.post("/api/auth/reset-password", async function (req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const code = String(req.body.code || "").trim().toUpperCase();
    const newPassword = String(req.body.newPassword || "");

    if (!username || !code || newPassword.length < 8) {
      return res.status(400).json({
        message:"Please provide the Student ID, reset code, and a new password with at least 8 characters."
      });
    }

    const student = await User.findOne({ username: username, role: "student" });
    const unavailable = !student || !student.passwordResetCodeHash ||
      !student.passwordResetExpiresAt ||
      student.passwordResetExpiresAt.getTime() < Date.now() ||
      student.passwordResetAttempts >= 5;

    if (unavailable) {
      return res.status(400).json({
        message:"Invalid or expired reset code. Get a new one from the admin."
      });
    }

    const suppliedHash = crypto.createHash("sha256").update(code).digest("hex");
    if (suppliedHash !== student.passwordResetCodeHash) {
      student.passwordResetAttempts += 1;
      await student.save();
      return res.status(400).json({
        message: "Invalid or expired reset code. Contact admin for a new one."
      });
    }

    student.passwordHash = await bcrypt.hash(newPassword, 12);
    student.passwordResetCodeHash = "";
    student.passwordResetExpiresAt = null;
    student.passwordResetAttempts = 0;
    await student.save();

    res.json({ message:"Password reset successfully. Please sign in with your new password." });
  } catch (error) {
    console.error("Password reset error:", error.message);
    res.status(500).json({ message:"Failed to reset password." });
  }
});

app.post("/api/auth/setup-first-admin", async function (req, res) {
  try {
    const { setupKey, username, password } = req.body;

    if (!process.env.ADMIN_SETUP_KEY) {
      return res.status(500).json({
        message: "ADMIN_SETUP_KEY is not set in the .env file."
      });
    }

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({
        message: "Invalid setup key."
      });
    }

    const adminAlreadyExists = await User.exists({ role: "admin" });

    if (adminAlreadyExists) {
      return res.status(409).json({
        message: "An admin account already exists."
      });
    }

    if (!username || !password || password.length < 8) {
      return res.status(400).json({
        message: "Please enter a username and a password with at least 8 characters."
      });
    }

    const usernameAlreadyExists = await User.exists({ username: username.trim() });

    if (usernameAlreadyExists) {
      return res.status(409).json({
        message: "This username is already taken."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      username: username.trim(),
      passwordHash: passwordHash,
      role: "admin"
    });

    res.status(201).json({
      message: "First admin account created successfully."
    });
  } catch (error) {
    console.error("Admin setup error:", error.message);
    res.status(500).json({
      message: "Admin account was not created."
    });
  }
});
app.post("/api/auth/register-student", async function (req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || password.length < 8) {
      return res.status(400).json({
        message: "Please enter a Student ID/username and a password of at least 8 characters."
      });
    }

    if (await User.exists({ username: username })) {
      return res.status(409).json({
        message: "An account with this Student ID/username already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      username: username,
      passwordHash: passwordHash,
      role: "student"
    });

    res.status(201).json({
      message: "Student account created successfully. Please sign in with your new password.",
      username: username
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this Student ID/username already exists."
      });
    }
    console.error("Student registration error:", error.message);
    res.status(500).json({ message: "Failed to create student account." });
  }
});

app.post("/api/auth/login", async function (req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        message: "Write down both the Username and password."
      });
    }

    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(401).json({
        message: "The Username or password is incorrect."
      });
    }

    const passwordIsCorrect = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordIsCorrect) {
      return res.status(401).json({
        message: "The Username or password is incorrect."
      });
    }

    const token = jwt.sign(
  {
    userId: user._id,
    username: user.username,
    role: user.role,
    department: user.department
  },
  process.env.JWT_SECRET,
  { expiresIn: "8h" }
);

    res.json({
      message: "Login successful",
      token: token,
      user: {
        username: user.username,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed due to an error." });
  }
});
app.post("/api/admin/create-student", requireLogin, async function (req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || password.length < 8) {
      return res.status(400).json({
        message: "Please enter a Student ID/username and a password of at least 8 characters."
      });
    }

    if (await User.exists({ username: username })) {
      return res.status(409).json({
        message: "This username is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      username: username,
      passwordHash: passwordHash,
      role: "student"
    });

    res.status(201).json({
      message: "Student account created successfully.",
      username: username
    });
  } catch (error) {
    console.error("Student account error:", error.message);
    res.status(500).json({ message: "Student account was not created." });
  }
});
app.post(
  "/api/admin/create-department",
  requireLogin,
  async function (req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
      }

      const username = String(req.body.username || "").trim();
      const password = String(req.body.password || "");
      const department = String(req.body.department || "").trim();

      if (!username || !department || password.length < 8) {
        return res.status(400).json({
          message:"Staff username, department, and a password of at least 8 characters are required."
        });
      }

      if (await User.exists({ username: username })) {
        return res.status(409).json({
          message: "This username is already registered."
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await User.create({
        username: username,
        passwordHash: passwordHash,
        role: "department",
        department: department
      });

      res.status(201).json({
        message: "Department account created successfully.",
        username: username,
        department: department
      });
    } catch (error) {
      console.error("Department account error:", error.message);
      res.status(500).json({
        message:"Failed to create department account."
      });
    }
  }
);

function analyzeWithCpp(text) {
  return new Promise(function (resolve, reject) {
    const cppFile = path.join(__dirname, "complaint_processor.exe");
    const cppProgram = spawn(cppFile, [], { windowsHide: true });
    let output = "";
    let errorText = "";

    cppProgram.stdout.on("data", function (data) { output += data.toString(); });
    cppProgram.stderr.on("data", function (data) { errorText += data.toString(); });
    cppProgram.on("error", function (error) {
      reject(new Error("C++ complaint analyzer could not start: " + error.message));
    });
    cppProgram.on("close", function (code) {
      if (code !== 0) {
        reject(new Error(errorText || "C++ complaint analysis failed."));
        return;
      }
      const category = output.match(/^Category: (.+)$/m);
      const priority = output.match(/^Priority: (.+)$/m);
      const assignment = output.match(/^Assignment: (.+)$/m);
      if (!category || !priority) {
        reject(new Error("C++ analyzer returned an invalid result."));
        return;
      }
      resolve({
        category: category[1].trim(),
        priority: priority[1].trim(),
        assignment: assignment ? assignment[1].trim() : "Admin review required"
      });
    });
    cppProgram.stdin.on("error", function (error) {
      reject(new Error("Could not send complaint text to C++: " + error.message));
    });
    cppProgram.stdin.end(String(text));
  });
}
function rankComplaintsWithCpp(complaints) {
  return new Promise(function (resolve, reject) {
    if (!complaints.length) return resolve([]);

    const cppFile = path.join(__dirname, "complaint_processor.exe");
    const cppProgram = spawn(cppFile, ["--rank"], { windowsHide: true });
    let output = "";
    let errorText = "";

    cppProgram.stdout.on("data", function (data) { output += data.toString(); });
    cppProgram.stderr.on("data", function (data) { errorText += data.toString(); });
    cppProgram.on("error", function (error) {
      reject(new Error("C++ priority queue could not start: " + error.message));
    });
    cppProgram.on("close", function (code) {
      if (code !== 0) {
        reject(new Error(errorText || "C++ complaint priority sorting failed."));
        return;
      }

      const complaintById = new Map(complaints.map(function (complaint) {
        return [String(complaint._id), complaint];
      }));
      const ranked = output.split(/\r?\n/).filter(Boolean)
        .map(function (id) { return complaintById.get(id); })
        .filter(Boolean);
      if (ranked.length !== complaints.length) {
        reject(new Error("C++ priority queue returned an incomplete complaint order."));
        return;
      }
      resolve(ranked);
    });
    cppProgram.stdin.on("error", function (error) {
      reject(new Error("Could not send complaints to C++ priority queue: " + error.message));
    });

    const input = complaints.map(function (complaint) {
      return String(complaint._id) + String.fromCharCode(9) +
        String(complaint.priority || "Low");
    }).join(String.fromCharCode(10));
    cppProgram.stdin.end(input + String.fromCharCode(10));
  });
}
function findPossibleDuplicatesWithCpp(text, complaints) {
  return new Promise(function (resolve, reject) {
    if (!complaints.length) return resolve([]);

    const cppFile = path.join(__dirname, "complaint_processor.exe");
    const cppProgram = spawn(cppFile, ["--duplicates"], { windowsHide: true });
    let output = "";
    let errorText = "";
    cppProgram.stdout.on("data", function (data) { output += data.toString(); });
    cppProgram.stderr.on("data", function (data) { errorText += data.toString(); });
    cppProgram.on("error", function (error) {
      reject(new Error("C++ duplicate detector could not start: " + error.message));
    });
    cppProgram.on("close", function (code) {
      if (code !== 0) {
        reject(new Error(errorText || "C++ duplicate detection failed."));
        return;
      }
      resolve(output.split(/\r?\n/).filter(Boolean));
    });

    const clean = function (value) {
      return String(value || "").replace(/[\t\r\n]+/g, " ");
    };
    const existingRows = complaints.map(function (complaint) {
      return String(complaint._id) + String.fromCharCode(9) +
        clean(complaint.title) + " " + clean(complaint.description);
    });
    cppProgram.stdin.end(
      clean(text) + String.fromCharCode(10) +
      existingRows.join(String.fromCharCode(10)) + String.fromCharCode(10)
    );
  });
}
app.post(
  "/api/complaints",
  requireLogin,
  requireRole("student"),
  async function (req, res) {
  try {
    const { title, description } = req.body;

    if ( !title || !description) {
      return res.status(400).json({
        message: "Student ID, title, and description are required."
      });
    }

    const analysis = await analyzeWithCpp(title.trim() + " " + description.trim());
    const recentComplaints = await Complaint.find({})
      .sort({ date: -1 }).limit(500).select("_id title description").lean();
    const possibleDuplicateIds = await findPossibleDuplicatesWithCpp(
      title.trim() + " " + description.trim(),
      recentComplaints
    );

    const complaint = new Complaint({
      studentId: req.user.username,
      title: title,
      description: description,
      category: analysis.category,
      priority: analysis.priority,
      assignment: analysis.assignment,
      possibleDuplicateIds: possibleDuplicateIds,
      activity: [{
        action: "Complaint submitted",
        by: req.user.username,
        role: "student",
        date: new Date()
      }]
    });

    await complaint.save();

    res.status(201).json({
      message: "The complaint has been saved.",
      complaint: complaint,
      possibleDuplicateIds: possibleDuplicateIds
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "The Complaint was not saved.check the backend and the C++ program."
    });
  }
});

function calculateComplaintStatisticsWithCpp(complaints) {
  return new Promise(function (resolve, reject) {
    const cppFile = path.join(__dirname, "complaint_processor.exe");
    const cppProgram = spawn(cppFile, ["--stats"], { windowsHide: true });
    let output = "";
    let errorText = "";
    cppProgram.stdout.on("data", function (data) { output += data.toString(); });
    cppProgram.stderr.on("data", function (data) { errorText += data.toString(); });
    cppProgram.on("error", function (error) {
      reject(new Error("C++ statistics analyzer could not start: " + error.message));
    });
    cppProgram.on("close", function (code) {
      if (code !== 0) {
        reject(new Error(errorText || "C++ complaint statistics failed."));
        return;
      }
      const stats = { total: 0, categories: {}, statuses: {} };
      output.split(/\r?\n/).forEach(function (line) {
        const parts = line.split(String.fromCharCode(9));
        const count = Number(parts[2] || parts[1] || 0);
        if (parts[0] === "TOTAL") stats.total = count;
        if (parts[0] === "CATEGORY") stats.categories[parts[1]] = count;
        if (parts[0] === "STATUS") stats.statuses[parts[1]] = count;
      });
      resolve(stats);
    });
    cppProgram.stdin.on("error", function (error) {
      reject(new Error("Could not send complaints to C++ statistics: " + error.message));
    });
    const input = complaints.map(function (complaint) {
      return String(complaint.category || "Other") + String.fromCharCode(9) +
        String(complaint.status || "Submitted");
    }).join(String.fromCharCode(10));
    cppProgram.stdin.end(input);
  });
}

app.get("/api/complaint-statistics", requireLogin, async function (req, res) {
  try {
    let query = {};
    if (req.user.role === "student") query = { studentId: req.user.username };
    else if (req.user.role === "department") query = { assignedTo: req.user.username };
    else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Complaint statistics access denied." });
    }
    const records = await Complaint.find(query).select("category status").lean();
    const statistics = await calculateComplaintStatisticsWithCpp(records);
    res.json(statistics);
  } catch (error) {
    console.error("Complaint statistics error:", error.message);
    res.status(500).json({ message: "Complaint statistics could not be calculated." });
  }
});
app.get(
  "/api/complaints/:studentId",
  requireLogin,
  async function (req, res) {
    try {
      if (
        req.user.role !== "student" ||
        req.user.username !== req.params.studentId
      ) {
        return res.status(403).json({
          message: "You can only view your own complaints."
        });
      }

      const complaints = await Complaint.find({
        studentId: req.user.username
      }).sort({ date: -1 });

      res.json(complaints);
    } catch (error) {
      res.status(500).json({
        message: "The complaints could not be loaded."
      });
    }
  }
);
app.get("/api/admin/complaints", requireLogin, async function (req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const complaints = await Complaint.find().sort({ date: -1 }).lean();
    const rankedComplaints = await rankComplaintsWithCpp(complaints);
    res.json(rankedComplaints);
  } catch (error) {
    console.error("Admin complaints error:", error.message);
    res.status(500).json({
      message: "Complaints could not be loaded."
    });
  }
});
app.patch(
  "/api/admin/complaints/:id/assign",
  requireLogin,
  async function (req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
      }

      const staffUsername = String(req.body.staffUsername || "").trim();

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Complaint ID." });
      }

      const staff = await User.findOne({
        username: staffUsername,
        role: "department"
      });

      if (!staff) {
        return res.status(404).json({
          message: "No department account found with this username."
        });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      complaint.verifiedBy = req.user.username;
      complaint.verifiedAt = new Date();
      complaint.assignedDepartment = staff.department;
      complaint.assignedTo = staff.username;
      complaint.assignedAt = new Date();
      complaint.assignment = "Assigned to " + staff.department;
      complaint.status = "Assigned";
      complaint.activity.push({
        action: "Assigned to " + staff.department,
        by: req.user.username,
        role: "admin",
        date: new Date()
      });

      await complaint.save();

      res.json({
        message: "Complaint verified and assigned.",
        complaint: complaint
      });
    } catch (error) {
      console.error("Complaint assignment error:", error.message);
      res.status(500).json({ message: "Failed to assign complaint." });
    }
  }
);
app.get("/api/department/complaints", requireLogin, async function (req, res) {
  try {
    if (req.user.role !== "department") {
      return res.status(403).json({ message: "Department access required." });
    }

    const complaints = await Complaint.find({
      assignedTo: req.user.username
    }).sort({ date: -1 }).lean();
    const rankedComplaints = await rankComplaintsWithCpp(complaints);
    res.json(rankedComplaints);
  } catch (error) {
    console.error("Department complaints error:", error.message);
    res.status(500).json({ message: "Failed to load department complaints."});
  }
});
app.patch(
  "/api/department/complaints/:id/status",
  requireLogin,
  async function (req, res) {
    try {
      if (req.user.role !== "department") {
        return res.status(403).json({
          message: "Department access required."
        });
      }

      const allowedStatuses = ["In Progress", "Resolved"];
      const status = String(req.body.status || "").trim();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Status must be In Progress or Resolved."
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid Complaint ID."});
      }

      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedTo: req.user.username
      });

      if (!complaint) {
        return res.status(404).json({
          message: "No assigned complaint found."
        });
      }

      complaint.status = status;
      complaint.activity.push({
        action: "Status changed to " + status,
        by: req.user.username,
        role: "department",
        date: new Date()
      });
      await complaint.save();

      res.json({
        message:"Complaint status updated successfully.",
        complaint: complaint
      });
    } catch (error) {
      console.error("Department status error:", error.message);
      res.status(500).json({
        message: "Failed to update complaint status."
      });
    }
  }
);

mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("MongoDB connected");

    app.listen(3000, function () {
      console.log("Backend is running.: http://localhost:3000");
    });
  })
  .catch(function (error) {
    console.log("Failed to connect to MongoDB:", error.message);
  });
