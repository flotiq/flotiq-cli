import "dotenv/config";

const settings = {
    apiUrl: process.env.FLOTIQ_API_URL || 'https://api.flotiq.com',
}

export default settings;
