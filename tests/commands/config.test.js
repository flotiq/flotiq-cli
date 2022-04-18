const {execSync} = require('child_process');
const EXAMPLE_API_KEY = '35aa457f06e1da94f9b37420c56f5909';
const homedir = require('os').homedir();
const fs = require('fs');
const assert = require("assert");
const CONFIG_DIR = homedir + '/.config/configstore/;'
const FILE_NAME = 'flotiq-cli.json';
const CONFIG_FILE_PATH = CONFIG_DIR + FILE_NAME ;

describe('Save config command test', () => {
    test('Success config', async () => {
        execSync('node ./src/command/command.js configure ' + EXAMPLE_API_KEY);
        const data = fs.readFileSync(CONFIG_FILE_PATH,  {encoding:'utf8', flag:'r'})
        const config = JSON.parse(data);
        assert.equal(config?.flotiqApiKey, EXAMPLE_API_KEY);
    })
});
