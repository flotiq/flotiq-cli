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
const STARTER_URL = {
    name: "url",
    type: "input",
    message: "Starter repository url:"
};
const WORDPRESS_PAGE_URL = {
    name: "wordpressUrl",
    type: "input",
    message: "Url to wordpress project:"
};
const CF_SPACE_ID = {
    name: "contentfulSpaceId",
    type: "input",
    message: "Contentful space ID"
}
const CF_API_KEY = {
    name: "contentfulApiKey",
    type: "input",
    message: "Contentful api key"
}
const PURGE_QUESTION_CONFIRMATION = {
    name: "confirmation",
    type: "input",
    message: "Are you sure you want to delete all data available for this API KEY? [y/N]",
    defaultAnswer: 'n'
}
const LANGUAGE = {
    name: "language",
    type: "input",
    message: "SDK language to install",
    defaultAnswer: 'javascript'
}
const CONTENT_TYPE_NAME = {
    name: "ctdName",
    type: "input",
    message: "API Name of the Content Type Definition:"
}

const FILE_PATH = {
    name: "filePath",
    type: "input",
    message: "File's directory path ( `.` for current directory ):"
}

const START_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
    STARTER_URL,
]

const IMPORT_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
]

const WORDPRESS_IMPORT_QUESTIONS = [
    FLOTIQ_RW_API_KEY,
    WORDPRESS_PAGE_URL,
]

const CONTENTFUL_IMPORT = [
    FLOTIQ_RW_API_KEY,
    CF_SPACE_ID,
    CF_API_KEY,
]

const PURGE_QUESTION = [
    PURGE_QUESTION_CONFIRMATION
]

const EXPORT_QUESTIONS = [
    FLOTIQ_API_KEY,
    PROJECT_DIRECTORY
]

const INSTALL_SDK = [
    LANGUAGE,
    PROJECT_DIRECTORY,
    FLOTIQ_API_KEY,
]

const EXCEL_MIGRATION = [
    FLOTIQ_API_KEY,
    CONTENT_TYPE_NAME,
    FILE_PATH
]

const STATS = [
    FLOTIQ_API_KEY,
]

module.exports = {
    FLOTIQ_RW_API_KEY,
    PROJECT_DIRECTORY,
    STARTER_URL,
    WORDPRESS_PAGE_URL,
    START_QUESTIONS,
    IMPORT_QUESTIONS,
    WORDPRESS_IMPORT_QUESTIONS,
    CONTENTFUL_IMPORT,
    PURGE_QUESTION,
    EXPORT_QUESTIONS,
    INSTALL_SDK,
    EXCEL_MIGRATION,
    STATS
}
