import fs from "fs";
import os from "os";
import path from "path";
import loading from "loading-cli";
import inquirer from "inquirer";

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

export {
    getWorkingPath,
    loader,
    confirm,
    colorYellow,
};

export default {
    getWorkingPath,
    loader,
    confirm,
    colorYellow,
};