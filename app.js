const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    'https://abesecroomandlaballocation.netlify.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

const SECRET_KEY = process.env.JWT_SECRET_KEY;
const USERS_FILE = path.join(__dirname, 'users.json');
const REQUESTS_FILE = path.join(__dirname, 'requests.json');

const BLOCKS = {
    ab: "Aryabhatta",
    kc: "KC",
    bb: "Bhabha",
    rm: "Raman",
    rj: "Ramanujan"
};

const getUsers = () => fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : [];
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

const getRequests = () => fs.existsSync(REQUESTS_FILE) ? JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')) : [];
const saveRequests = (requests) => fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8');

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ username, isAdmin: user.isAdmin }, SECRET_KEY, { expiresIn: '2h' });

    res.cookie("authToken", token, {
        httpOnly: true,
        sameSite: "None",
        secure: process.env.NODE_ENV === "production", 
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
    }).json({ message: "Login successful", isAdmin: user.isAdmin });
});

// Logout Route
app.get("/logout", (req, res) => {
    res.clearCookie("authToken", {
        httpOnly: true,
        sameSite: "None",
        secure: process.env.NODE_ENV === "production"
    }).json({ message: "Logged out" });
});

// Current User Route
app.get("/currentUser", (req, res) => {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(401).json({ message: "Not logged in" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ username: decoded.username, isAdmin: decoded.isAdmin });
    } catch {
        res.status(403).json({ message: "Invalid or expired token" });
    }
});

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch {
        res.status(403).json({ message: "Invalid or expired token" });
    }
};

// Admin-only Middleware
const authorizeAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
};

// User-only Middleware
const authorizeUser = (req, res, next) => {
    if (req.user.isAdmin) {
        return res.status(403).json({ message: "Only regular users can make bookings" });
    }
    next();
};

// Room Data Route
app.get("/roomData/:block_code", (req, res) => {
    const data = getBlockJson(req.params.block_code);
    data ? res.json(data) : res.status(404).send("Block not found");
});

// Booking Requests (User only)
app.post("/book/:place/:block_code/:room_no/:day/:slot", authenticate, authorizeUser, (req, res) => {
    const request = { ...req.params, ...req.body, type: "room" };
    const requests = getRequests();
    requests.push(request);
    saveRequests(requests);
    res.json({ message: "Booking request submitted." });
});

// Booking Approvals (Admin only)
app.post("/approveRequest", authenticate, authorizeAdmin, (req, res) => {
    const { index } = req.body;
    const requests = getRequests();
    const request = requests[index];

    if (!request) return res.status(404).send("Request not found");

    applyBooking(request);
    requests.splice(index, 1);
    saveRequests(requests);

    res.json({ message: "Request approved." });
});

// Reject Request (Admin only)
app.post("/rejectRequest", authenticate, authorizeAdmin, (req, res) => {
    const { index } = req.body;
    const requests = getRequests();

    if (!requests[index]) return res.status(404).send("Request not found");

    requests.splice(index, 1);
    saveRequests(requests);

    res.json({ message: "Request rejected." });
});

// Helpers
function applyBooking(request) {
    if (request.type === "room") {
        const blockData = getBlockJson(request.block_code);
        const blockName = BLOCKS[request.block_code];
        const room = blockData[blockName].rooms.find(r => r.room_no === request.room_no);
        const dayData = room.days.find(d => d.day === request.day);
        dayData.slots[request.slot] = {
            status: "Occupied",
            subject: request.subject_code,
            teacher: request.faculty_name
        };
        fs.writeFileSync(path.join(__dirname, `${request.block_code.toUpperCase()}.json`), JSON.stringify(blockData, null, 2));
    } else {
        const sa = require("./SA.json");
        const seminar = sa[BLOCKS[request.block_code]][request.seminar][0];
        const booking = seminar.bookings.find(b => b.date === request.date);
        booking[request.slot] = { booked_by: request.faculty_name, purpose: request.purpose };
        fs.writeFileSync(path.join(__dirname, 'SA.json'), JSON.stringify(sa, null, 2));
    }
}

function getBlockJson(blockCode) {
    const filePath = path.join(__dirname, `${blockCode.toUpperCase()}.json`);
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
}

app.use((req, res) => res.status(404).send("Route not found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
