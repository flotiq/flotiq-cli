const yargs = require('yargs');
const questionsText = require("./questions");

yargs
    .command('sdk install [language] [directory] [flotiqApiKey]', 'Install Flotiq SDK', (yargs) => {
        yargs.positional('language', {
            describe: 'SDK language',
            type: 'string',
        })
        yargs.positional('directory', {
            describe: 'Directory when SDK are installed',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
    }, async (argv) => {
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 3) {
            let answers = await askQuestions(questionsText.START_QUESTIONS);
            let {flotiqApiKey, projectDirectory, url} = answers;
            start(flotiqApiKey, projectDirectory, url, yargs.argv['json-output']);
        } else if (yargs.argv._.length === 3 && apiKeyDefinedInDotEnv()) {
            start(process.env.FLOTIQ_API_KEY, argv.directory, argv.url, yargs.argv['json-output']);
        } else if (yargs.argv._.length === 4) {
            start(argv.flotiqApiKey, argv.directory, argv.url, yargs.argv['json-output']);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .help()
    .argv;
