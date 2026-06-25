import inquirer from "inquirer";

function apiKeyDefinedInDotEnv() {
    return process.env.FLOTIQ_API_KEY !== undefined && process.env.FLOTIQ_API_KEY !== "";
}

function optionalParamFlotiqApiKey(yargs) {
    if (apiKeyDefinedInDotEnv()) {
        yargs.positional("flotiqApiKey", {
            describe: "Flotiq Read and write API KEY.",
            type: "string",
        });
    }
}

function checkCommand(yargs, numRequired) {
    if (yargs.argv._.length <= numRequired) {
        yargs.showHelp();
        process.exit(1);
    }
}

async function askQuestions(yargs, questions) {
    const answers = await inquirer.prompt(questions);
    return await checkAllParameters(yargs, answers, questions);
}

async function checkAllParameters(yargs, answer, questions) {
    const newAnswer = answer;

    for (let i = 0; i < questions.length; i++) {
        const paramName = questions[i].name;

        while (!newAnswer[paramName].length) {
            if (!questions[i].defaultAnswer) {
                const param = await inquirer.prompt(questions[i]);
                newAnswer[paramName] = param[paramName];
            } else {
                newAnswer[paramName] = questions[i].defaultAnswer;
            }
        }
    }

    return newAnswer;
}

export { apiKeyDefinedInDotEnv, optionalParamFlotiqApiKey, checkCommand, askQuestions };
