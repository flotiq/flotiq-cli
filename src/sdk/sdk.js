const https = require('https');
const fs = require('fs');
const unzipper = require('unzipper');
const {exec} = require("child_process");
const ERROR_COLOR  ='\x1b[36m%s\x1b[0m';

module.exports = sdk = async (language, directory, apiKey) => {
    const filePath = `${directory}/flotiq-sdk-${language}.zip`;
    await checkProject(language);
    await download(language, filePath, apiKey);
    await extract(filePath);
    if (language === 'javascript') {
        await installJSsdk(language);
    }
    await clean(filePath);
}
checkProject = async (language) => {
    const path = `lib/${language}-sdk`;

    if (fs.existsSync(path)) {
        console.error(ERROR_COLOR, 'SDK are installed in lib/');
        process.exit(1);
    }
}
download = async (language, filePath, apiKey) => {
    console.log('Start downloading SDK');
    const file = fs.createWriteStream(filePath);
    return new Promise((resolve) => {
        https.get(`https://lambda-api.flotiq.com/generate-sdk?lang=${language}&token=${apiKey}`, (response) => {
            if (response.statusCode !== 200) {
                console.error(ERROR_COLOR, 'Error downloading SDK, please check FLOTIQ API KEY');
                console.error(ERROR_COLOR, `Response status code: ${response.statusCode}`);
                file.close();
                fs.unlinkSync(filePath);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Download Completed');
                resolve();
            })
        });
    })
}

extract = async (filePath) => {
    return fs.createReadStream(filePath)
        .pipe(unzipper.Extract({path: 'lib/'}))
        .promise();
}

installJSsdk = async (language) => {
    const cmd = `cd lib/${language}-sdk && npm install && npm run build`;
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(ERROR_COLOR, `error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(stderr);
        }
        console.log(stdout);
    });
}

clean = async (filePath) => {
    fs.unlinkSync(filePath);
}


