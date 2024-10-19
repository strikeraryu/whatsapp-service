const axios = require('axios');
const logger = require('./logger');

class API {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async sendRequest(path, data, method = 'POST') {
        logger.info(`Sending request to ${path}, method: ${method}, data: ${JSON.stringify(data)}`);
        const url = `${this.baseUrl}${path}`;

        try {
            const response = method === 'GET'
                ? await axios.get(url, { params: data })
                : await axios.post(url, data);

            logger.info(`FROM: ${path}, Response: ${JSON.stringify(response.data)}`);

            return response.data;
        } catch (error) {
            logger.error(`API request failed: ${error}`);
            return { success: false };
        }
    }
}

module.exports = API;
