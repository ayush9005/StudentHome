const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Permissive CORS engine routing to clear cross-origin preflight checks
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Persistent Engine Database Configurations
const db = new Datastore({ filename: path.join(__dirname, 'properties.db'), autoload: true });
const authDb = new Datastore({ filename: path.join(__dirname, 'users.db'), autoload: true });
const bookingsDb = new Datastore({ filename: path.join(__dirname, 'bookings.db'), autoload: true });

// Core Root Diagnostics Route
app.get('/', (req, res) => {
    res.send('StudentHome Backend Server is running and persistent!');
});

// Authentication Architecture
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, error: "Missing identity tracking definitions" });

    const cleanEmail = email.toLowerCase().trim();
    authDb.findOne({ email: cleanEmail }, (err, user) => {
        if (user) return res.status(400).json({ success: false, error: "Email already exists inside registration track data node" });
        
        authDb.insert({ name, email: cleanEmail, password, role }, (err, doc) => {
            if (err) return res.status(500).json({ success: false, error: "Registration sequence allocation drop" });
            res.status(201).json({ success: true, token: "mock_token_" + Date.now(), role: doc.role });
        });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, error: "Credentials verification parameters empty" });

    authDb.findOne({ email: email.toLowerCase().trim(), password, role }, (err, user) => {
        if (!user) return res.status(400).json({ success: false, error: "Invalid credentials signatures or matching role parameters" });
        res.status(200).json({ success: true, token: "mock_token_" + Date.now(), role: user.role });
    });
});

// Property Map System Endpoints
app.get('/api/properties', (req, res) => {
    db.find({}, (err, docs) => res.json(docs || []));
});

app.post('/api/properties', (req, res) => {
    db.insert(req.body, (err, doc) => {
        if (err) return res.status(500).json({ success: false, error: "Write operation failed" });
        res.status(201).json(doc);
    });
});

app.post('/api/properties/review', (req, res) => {
    const { propertyName, rating } = req.body;
    db.findOne({ name: propertyName }, (err, prop) => {
        if (prop) {
            const calculatedScore = parseFloat(((Number(prop.rating) + parseFloat(rating)) / 2).toFixed(1));
            db.update({ name: propertyName }, { $set: { rating: calculatedScore } }, {}, () => {
                res.status(200).json({ success: true });
            });
        } else {
            res.status(404).json({ error: "Target asset matching parameter structural validation dropped" });
        }
    });
});

// Bookings Tracking Nodes
app.post('/api/bookings', (req, res) => {
    bookingsDb.insert(req.body, (err, doc) => {
        if (err) return res.status(500).json({ success: false });
        res.status(201).json({ success: true });
    });
});

app.get('/api/bookings', (req, res) => {
    const { email } = req.query;
    bookingsDb.find({ studentEmail: email }, (err, docs) => res.json(docs || []));
});

app.get('/landlord/all-bookings', (req, res) => {
    bookingsDb.find({}, (err, docs) => res.json(docs || []));
});

app.listen(PORT, () => {
    console.log(`StudentHome backend running on port ${PORT}`);
});