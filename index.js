const express = require('express');
var session = require('express-session');
const merchantRoutes = require('./routes/merchant');
const { sendResponse } = require("./helpers/helper");
const element = require("./helpers/index");
const { PORT } = require("./config/custom.config");
const axios = require('axios');
require('dotenv').config();

const app = express();

// Function to log messages to Elasticsearch
const logToElasticsearch = async (message) => {
    try {
        await axios.post(`https://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}/${process.env.LOG_INDEX}/_doc`, {
            message: message,
            timestamp: new Date().toISOString(),
        }, {
            auth: {
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD,
            }
        });
    } catch (error) {
        console.error('Error sending log to Elasticsearch:', error);
    }
};

// Override console.log to send logs to Elasticsearch
const originalConsoleLog = console.log;
console.log = (...args) => {
    const message = args.join(' ');
    originalConsoleLog(...args); // Keep original console functionality
    logToElasticsearch(message); // Send the log to Elasticsearch
};

// Middleware and route setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({ 
    cookie: { maxAge: 60000 },
    store: new session.MemoryStore,
    saveUninitialized: true,
    resave: true,
    secret: 'secret'
}));

app.post("/api/merchant-services/parameterEncryptionTemp", async (req, res) => {
    if (req.method === 'POST' && (!req.headers['key'] || !req.headers['iv'])) {
        return res.send(await sendResponse(1));
    } else {
        let encParameters = await element.parameterEncryption(JSON.stringify(req.body), req.headers['key'], req.headers['iv']);
        return res.send({ data: encParameters });
    }
});

app.post("/api/merchant-services/parameterDecryptionTemp", async (req, res) => {
    if (req.method === 'POST' && (!req.headers['key'] || !req.headers['iv'])) {
        return res.send(await sendResponse(1));
    } else {
        let originalParameters = await element.parameterDecryption(req.body.data, req.headers['key'], req.headers['iv']);
        return res.send(originalParameters);
    }
});

// Middleware to log HTTP requests
app.use(async (req, res, next) => {
    // Store the original res.send function
    const oldSend = res.send.bind(res);

    // Override the res.send function to capture the status code
    res.send = async function (body) {
        const logMessage = `${req.method} ${req.originalUrl} - Status: ${res.statusCode}`;
        console.log(logMessage); // Log to console
        await logToElasticsearch(logMessage); // Send to Elasticsearch
        return oldSend(body); // Call the original send function
    };

    next();
});

// Merchant routes
app.use("/api/merchant-services", async (req, res, next) => {
    if (req.method === 'POST' && (!req.headers['userid'] || !req.headers['password'])) {
        return res.send(await sendResponse(1));
    }
    next();
}, merchantRoutes);

// Catch 404 and forward to error handler
app.all('*', async (req, res) => {
    res.send(await sendResponse(15));
});

// Start function
const start = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`${PORT} port connected`); // This will log to console and Elasticsearch
        });
    } catch (error) {
        console.log('Error starting the server:', error);
    }
}

// Start the application
start();
