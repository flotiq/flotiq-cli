const exec = require('child_process').exec;
const config = require('../configuration/config');
const fs = require('fs');

exports.setup = async (projectDirectory, starterUrl) => {
    console.log('Gatsby setup');
    await runGatsbyProcess(projectDirectory, starterUrl);

    function runGatsbyProcess(projectDirectory) {

        let cmd = config.gatsbyCli;
        if (process.platform === 'win32') {

            cmd = cmd.replace("/.//gi", "");
            cmd = cmd.replace("///gi", "\\");
        }

        cmd = cmd + ' new ' + projectDirectory + ' ' + starterUrl;
        return execShellCommand(cmd);
    }

    function execShellCommand(cmd) {
        return new Promise((resolve, reject) => {
            let commandProcess = exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(error);
                    process.exit(1);
                }
                resolve(stdout ? stdout : stderr);
            });
            // live output from gatsby
            commandProcess.stdout.on('data', function (data) {
                console.log('\x1b[36m%s\x1b[0m', data);
            });
        });
    }
}

exports.init = async (projectDirectory, apiKey) => {
    let fileContent = 'GATSBY_FLOTIQ_BASE_URL='+ config.apiUrl+'\n' +
        'FLOTIQ_API_KEY=' + apiKey+ '\n' +
        'SNIPCART_API_KEY=YOUR SNIPCART PUBLIC API KEY'
    fs.writeFile(projectDirectory + '/.env', fileContent, (err) => {
        if (err) throw err;
        console.log('Configuration is created successfully: '  + projectDirectory + '/.env')
    });
}
