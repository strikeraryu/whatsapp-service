const qrcode = require('qrcode-terminal');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const { AwsS3Store } = require('wwebjs-aws-s3');
const {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} = require('@aws-sdk/client-s3');


dotenv.config();

const USER_SESSION_PATH = process.env.USER_SESSION_PATH || 'user_session';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
});

const putObjectCommand = PutObjectCommand;
const headObjectCommand = HeadObjectCommand;
const getObjectCommand = GetObjectCommand;
const deleteObjectCommand = DeleteObjectCommand;

const store = new AwsS3Store({
    bucketName: process.env.BUCKET_NAME,
    remoteDataPath: 'sessions/',
    s3Client: s3,
    putObjectCommand,
    headObjectCommand,
    getObjectCommand,
    deleteObjectCommand
});


function log(message, level = "INFO") {
    console.log(`[${level}] [${new Date().toISOString()}] - ${message}`);
}

async function quit_session(success) {
    try {
        const data = { action_id: process.env.ACTION_ID, code: success ? 0 : 1 };
        await sendRequest('/webhook/action/update', data);
    } catch (e) {
        log(`An error occurred: ${e}`);
    }

    log("Quitting session...");
    process.exit(success ? 0 : 1);
}

function validAction() {
    return process.env.UUID != null;
}

async function sendRequest(path, data, method = 'POST') {
    log(`Sending request to ${path}, method: ${method}, data: ${JSON.stringify(data)}`);

    const url = `${BASE_URL}/${path}`;

    try {
        const response = method === 'GET'
            ? await axios.get(url, { params: data })
            : await axios.post(url, data);
        log(`Response: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (e) {
        log(`An error occurred: ${e}`);
        return { success: false };
    }
}

async function loginSuccess(uuid) {
    log("Session logged in successfully");
    try {
        const data = { uuid, message: "Logged in successfully", login_success: true };
        await sendRequest('/webhook/login/update', data);
        return true;
    } catch (e) {
        log(`Failed to upload session data: ${e}`, "ERROR");
        return false;
    }
}

async function loginFailed(uuid, message = "Login failed") {
    log(message, "ERROR");
    try {
        const data = { uuid, message, login_success: false };
        const response = await sendRequest('/webhook/login/update', data);

        return response.success;
    } catch (e) {
        log(`Failed to update session data: ${e}`, "ERROR");
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function startLoginSession(uuid) {
    log("Starting login session...");

    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: `${uuid}`,
            dataPath: USER_SESSION_PATH,
            store: store,
            backupSyncIntervalMs: 600000
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });
    let isClientReady = false;

    client.on('qr', async (qr) => {
        log("QR Code received");
        const success = await sendQrCode(qr);

        if (!success) {
            log("Failed to send QR code to server", "ERROR");
            quit_session(false);
        }
    });

    const processSession = async () => {
        if (isClientReady) {
            console.log("Processing session...");
            const success = await loginSuccess(uuid);

            if (!success) {
                await loginFailed(uuid, "Failed to update after login success");
            }

            await client.destroy();
            quit_session(success);
        }
    };

    // client.on('message_create', message => {
    //     if (message.body === '!ping') {
    //         client.sendMessage(message.from, "Hello from bot").then(response => {
    //             console.log('Message sent successfully:', response);
    //         }).catch(err => {
    //             console.error('Failed to send message:', err);
    //         });
    //     }
    //
    // });

    client.on('remote_session_saved', () => {
        log("Remote session saved");
        processSession();
    });

    client.on('ready', async () => {
        log("Client is ready!");
        isClientReady = true;

        await sleep(10000);

        client.sendMessage("91@c.us", "Test Message").then(response => {
            console.log('Message sent successfully:', response);
        }).catch(err => {
            console.error('Failed to send message:', err);
        });
    });

    client.on('authenticated', async () => {
        log("authenticated");
    });

    client.on('auth_failure', async () => {
        try {
            log("Authentication failed", "ERROR");
            await loginFailed(uuid, "Authentication failed");

            await client.destroy();
            quit_session(false);
        } catch (error) {
            await loginFailed(uuid, `Initialization failed: ${error.message}`);

            await client.destroy();
            quit_session(false);
        }
    });

    try {
        await client.initialize();
    } catch (error) {
        await loginFailed(uuid, `Initialization failed: ${error.message}`);

        await client.destroy();
        quit_session(false);
    }
}

if (require.main === module) {
    log("Starting...");

    try {
        if (validAction()) {
            const uuid = process.env.UUID;
            startLoginSession(uuid).catch(error => {
                log(`Unexpected error: ${error}`, "ERROR");
                quit_session(false);
            });
        } else {
            log("Invalid action", "ERROR");
            quit_session(false);
        }
    } catch (error) {
        log(`Unexpected error: ${error}`, "ERROR");
        quit_session(false);
    }
}
