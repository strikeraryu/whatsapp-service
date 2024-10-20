const qrcode = require('qrcode-terminal');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const logger = require('./logger');
const { config, store } = require('./config');
const API = require('./api');

class Action {
    constructor(uuid, actionId) {
        this.name = 'login-session';
        this.api = new API(config.BASE_URL);
        this.timeoutId = null;
        this.uuid = uuid;
        this.actionId = actionId;
        this.message = "Action Login Session";
        this.state = {
            IsNewLogin: false,
            IsAuthenticated: false,
            IsReady: false,
            IsRemoteSessionSaved: false,
            hasError: false
        }

        this.client = new Client({
            authStrategy: new RemoteAuth({
                clientId: `${this.uuid}`,
                dataPath: config.USER_SESSION_PATH,
                store: store,
                backupSyncIntervalMs: 600000
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });


        this.setupTimeout();
        setInterval(async () => {
            await this.checkState();
        }, 1000);
    }

    setupTimeout() {
        this.timeoutId = setTimeout(async () => {
            this.state.hasError = true;
            this.message = "Action timed out";
        }, config.TIMEOUT_MS);
    }

    async cleanup(force = false) {
        try {
            let state = 'failed';
            let loginSuccess = false;
            if (force || this.state.hasError) {
                this.message = force ? "Action force quit" : this.message;
            } else if (this.state.IsAuthenticated && this.state.IsReady) {
                state = 'saved';
                loginSuccess = true;
            }


            logger.info(`Message: ${this.message}`, loginSuccess ? "INFO" : "ERROR");

            await this.api.sendRequest('/webhook/login/update', {
                uuid: this.uuid, state: state, message: this.message
            });
            await this.api.sendRequest('/webhook/action/update', {
                action_id: this.actionId, code: loginSuccess ? 0 : 1, message: this.message
            });

            this.client.destroy();
            process.exit(loginSuccess ? 0 : 1);
        } catch (e) {
            logger.error(`Unexpected error: ${e}`, "ERROR");

            await api.sendRequest('/webhook/login/update', {
                uuid: this.uuid, state: "failed", message: "Unexpected error"
            });
            await api.sendRequest('/webhook/action/update', {
                action_id: this.actionId, code: 1, message: e
            });

            process.exit(1);
        }
    }

    async checkState() {
        try {
            if (this.state.hasError) {
                this.cleanup();
            } else if (this.state.IsNewLogin && this.state.IsAuthenticated && this.state.IsReady && this.state.IsRemoteSessionSaved) {
                this.message = "Login and Session Saved successful";
                this.cleanup();
            } else if (!this.state.IsNewLogin && this.state.IsAuthenticated && this.state.IsReady) {
                this.message = "Already logged in";
                this.cleanup();
            }
        } catch (e) {
            logger.error(`Unexpected error: ${e}`, "ERROR");
            this.cleanup(force = true);
        }
    }

    async safe(callback, ...args) {
        try {
            await callback(...args);
        } catch (e) {
            logger.error(`Unexpected error: ${e}`, "ERROR");

            this.message = "Unexpected error";
            this.state.hasError = true;
        }
    }

    async execute() {
        logger.info("Starting login session...");

        this.client.on('qr', async (qr_code) => {
            this.safe(async (qr_code) => {
                logger.info("QR Code received");

                this.state.IsNewLogin = true;
                qrcode.generate(qr_code, { small: true });

                const response = await this.api.sendRequest('/webhook/qr_code', { uuid: this.uuid, qr_code });

                if (!response.success) {
                    this.message = "Failed to send QR code";
                    this.state.hasError = true;
                }
            }, qr_code);
        });

        this.client.on('remote_session_saved', () => {
            this.safe(async () => {
                logger.info("Remote session saved");

                this.state.IsRemoteSessionSaved = true;
            })
        });

        this.client.on('ready', () => {
            this.safe(async () => {
                logger.info("Client is ready!");

                this.state.IsReady = true;
            })
        });

        this.client.on('authenticated', async () => {
            this.safe(async () => {
                logger.info("Client authenticated");

                if (this.state.IsNewLogin) {
                    this.api.sendRequest('/webhook/login/update', {
                        uuid: this.uuid, state: "unsaved_authenticated",
                        message: "You are logged in but it can take 1 minute to save your session"
                    });
                }


                this.state.IsAuthenticated = true;
            })
        });

        this.client.on('auth_failure', async () => {
            this.safe(async () => {
                logger.info("Authentication failed");

                this.state.IsAuthenticated = false;
            })
        });

        try {
            await this.client.initialize();
        } catch (error) {
            logger.error(`Failed to initialize client: ${error}`, "ERROR");

            this.message = "Failed to initialize client";
            this.state.hasError = true;
        }
    }
}

if (require.main === module) {
    logger.info("Starting...");

    try {
        if (process.env.UUID && process.env.ACTION_ID) {
            const action = new Action(process.env.UUID, process.env.ACTION_ID);
            action.execute();
        } else {
            logger.error("Invalid action", "ERROR");
            process.exit(1);
        }
    } catch (error) {
        logger.error(`Unexpected error: ${error}`, "ERROR");
        process.exit(1);
    }
}
