const axios = require('axios');
const https = require('https');
const logger = require('./logger');

class API {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async sendRequest(path, data, method = 'POST') {
        logger.info(`Sending request to ${path}, method: ${method}, data: ${JSON.stringify(data)}`);
        const url = `${this.baseUrl}${path}`;

        const agent = new https.Agent({
            rejectUnauthorized: false
        });

        try {
            const response = method === 'GET'
                ? await axios.get(url, { params: data }, { httpsAgent: agent })
                : await axios.post(url, data, { httpsAgent: agent });

            logger.info(`FROM: ${path}, Response: ${JSON.stringify(response.data)}`);

            return response.data;
        } catch (error) {
            logger.error(`API request failed: ${error}`);
            return { success: false };
        }
    }
}

module.exports = API;
