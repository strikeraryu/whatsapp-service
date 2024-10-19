class Logger {
    static log(message, level = "INFO") {
        console.log(`[${level}] [${new Date().toISOString()}] - ${message}`);
    }

    static info(message) {
        this.log(message, "INFO");
    }

    static error(message) {
        this.log(message, "ERROR");
    }

    static debug(message) {
        this.log(message, "DEBUG");
    }
}

module.exports = Logger;
