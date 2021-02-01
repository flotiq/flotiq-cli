const FLOTIQ_RW_API_KEY = {
    name: "flotiqApiKey",
    type: "input",
    message: "Flotiq RW api key:"
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


//--------------------------Questions-Sections--------------------------------

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

module.exports = {
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
    GATSBY_STARTER_URL,
    WORDPRESS_PAGE_URL,
    START_QUESTIONS,
    IMPORT_QUESTIONS,
    WORDPRESS_IMPORT_QUESTIONS

}
