require('dotenv').config();

let settings = {
    apiUrl: process.env.FLOTIQ_API_URL || 'https://api.flotiq.com',
    gatsbyCli:'./node_modules/.bin/gatsby'
}

module.exports = settings;
