const FLOTIQ_RW_API_KEY = {
    name: "flotiqApiKey",
    type: "input",
    message: "Flotiq RW api key:"
};

const FLOTIQ_API_KEY = {
    name: "flotiqApiKey",
    type: "input",
    message: "Flotiq api key:"
};

const PROJECT_DIRECTORY = {
    name: "projectDirectory",
    type: "input",
    message: "Project directory path:"
};
const GATSBY_STARTER_URL = {
    name: "url",
    type: "input",
    message: "Gatsby starter repository url:"
};
const WORDPRESS_PAGE_URL = {
    name: "wordpressUrl",
    type: "input",
    message: "Url to wordpress project:"
};
const PURGE_QUESTION_CONFIRMATION = {
    name: "confirmation",
    type: "input",
    message: "Are you sure you want to delete all data available for this API KEY? [y/N]",
    defaultAnswer: 'n'
}

const START_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
    GATSBY_STARTER_URL,
]

const IMPORT_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
]

const WORDPRESS_IMPORT_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    WORDPRESS_PAGE_URL,
]

const PURGE_QUESTION = [
    PURGE_QUESTION_CONFIRMATION
]

const EXPORT_QUESTIONS = [
    FLOTIQ_API_KEY,
    PROJECT_DIRECTORY
]

module.exports = {
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
    GATSBY_STARTER_URL,
    WORDPRESS_PAGE_URL,
    START_QUESTIONS,
    IMPORT_QUESTIONS,
    WORDPRESS_IMPORT_QUESTIONS,
    PURGE_QUESTION,
    EXPORT_QUESTIONS
}
