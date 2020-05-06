const exec = require('child_process').exec;
const config = require('../configuration/config');

exports.setup = async (projectDirectory, starterUrl) => {
    console.log('gatsby setup');
    await runGatsbyProcess(projectDirectory, starterUrl);

    function runGatsbyProcess(projectDirectory) {
        console.log(process.platform);
        let p = config.gatsbyCli;
        if (process.platform === 'win32') {
            console.log('replac');
            p = p.replace("/.//gi", "");
            p = p.replace("///gi", "\\");
        }
        console.log(p);
        let cmd = p + ' new ' + projectDirectory + ' ' + starterUrl;
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
