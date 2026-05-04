const fs = require('fs');
const os = require('os');
const path = require('path');
const loading = require('loading-cli');
const inquirer = require('inquirer');

const colorYellow = (str) => {
    return `\x1b[33m${str}\x1b[0m`;
}

const getWorkingPath = () => fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);

const loader = loading({
    text: colorYellow("Watching for changes ..."), color: "yellow"
});

async function confirm(msg) {
    const response = await inquirer.prompt([{
        name: 'confirmation', type: 'confirm', message: msg
    }]);
    return response.confirmation;
}

module.exports = {
    getWorkingPath,
    loader,
    confirm,
    colorYellow
}