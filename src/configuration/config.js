import "dotenv/config";

const settings = {
    apiUrl: process.env.FLOTIQ_API_URL || 'https://api.flotiq.com',
    gatsbyCli:'./node_modules/.bin/gatsby'
}

export default settings;
