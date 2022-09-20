<a href="https://flotiq.com/">
    <img src="https://editor.flotiq.com/fonts/fq-logo.svg" alt="Flotiq logo" title="Flotiq" align="right" height="60" />
</a>

Flotiq CLI
==================

CLI application for starting your next project with Flotiq fast. 
Currently supports importing data from WordPress into Flotiq and seeding example data from our Gatsby starters.

## Setup

`npm install -g flotiq-cli`


## Usage

### Launch a Gatsby starter project

This command will:
- clone the Flotiq Gatsby starter,
- setup your Flotiq account to include the required Content Type Definitions,
- import example content into your account (e.g. images, blog posts, product descriptions),
- run `gatsby develop` for you.

Execute:
`flotiq start [projectName] [flotiqStarterUrl] [flotiqApiKey]`

**Parameters**

* `projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
* `flotiqStarterUrl` - full link to GatsbyJs starter, the list below
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))


### Import example data for a Gatsby starter

This command imports Content Types and Content Objects from Gatsby starter to your Flotiq account using the API key.
Gatsby starter must include directory `.flotiq` with `ContentType[0-9]` folders, each of them containing ContentTypeDefinition.json file, and contentObject[0-9].json files.

The number at the end of the directory or file name defines the file import order. 
The `.flotiq/images` directory in a particular starter stores images that will be imported into your Media Library.

Execute:
`flotiq import [projectName] [flotiqApiKey]`

**Parameters**

* `projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

#### Import variables

There is a possibility to use dynamic data in json files. 
We implemented our parser to create dynamic date value, but it can be extended in the future.
To use dynamic date in imported `contentObject.json` files use `{{date}}` function:

* `{{date}}` means `now`, outputs e.g. 2022-01-01
* `{{date:+5d}}` means `now + 5 days`, outputs e.g. 2022-01-06 
* `{{date:-5m}}` means `now - 5 months`, outputs e.g. 2021-06-01
* `{{date:+5y}}` means `now + 5 years`, outputs e.g. 2027-01-01

### Import data from Wordpress to Flotiq

The `wordpress-import` command will:
- setup your Flotiq account to include required Content Type Definitions,
- automatically pull tags, categories, media, posts and pages from the provided Wordpress URL into your Flotiq account.

Execute:
`flotiq wordpress-import [wordpressUrl] [flotiqApiKey]`

**Parameters**

* `wordpressUrl` - full link to WordPress site from which you wish to migrate content to Flotiq
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

### Purge data in Flotiq account

This command will remove all data from your account. Great for testing imports. Command require additional confirmation.

Execute:
`flotiq purge [flotiqApiKey] [options]`

**Parameters**

* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))
* `options` - additional options for command:
  * `withInternal=1` - purge should remove also internal type objects (`_media`)

### Export data from Flotiq to json files

This command exports data from the Flotiq account to local JSON files. If the key is limited to selected Content Types, then the data available for this key will be exported.

Execute:
`flotiq export [directory] [flotiqApiKey]`

**Parameters**

* `directory` - path to the directory where the files will be saved
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

### Flags

`--json-output`, `-j` - Error and console output will be additionally written into json file named `output.json`.

### Install Flotiq SDK

Execute:
`flotiq sdk install [language] [directory] [flotiqApiKey]`

**Parameters**

* `language` - SDK language: csharp, go, java, javascript, php, python, typescript
* `directory` - path to the directory where the files will be saved
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

### Display stats

This command displays your Flotiq API Key following statistics:
* number of Content Type Definitions, Content Objects by CTD, total Content Objects, Media, Webhooks,
* 10 recently modified objects.

Execute:
`flotiq stats [flotiqApiKey]`

**Parameters**

* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))


## Gatsby Starters

You can choose one of our starters:

* [Recipe website Gatsby starter-1](https://github.com/flotiq/flotiq-gatsby-recipe-1) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-recipe-1` as the `flotiqStarterUrl`
* [Recipe website Gatsby starter-2](https://github.com/flotiq/flotiq-gatsby-recipe-2) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-recipe-2` as the `flotiqStarterUrl`
* [Event calendar Gatsby starter-1](https://github.com/flotiq/flotiq-gatsby-event-1) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-event-1` as the `flotiqStarterUrl`
* [Event calendar Gatsby starter-2](https://github.com/flotiq/flotiq-gatsby-event-2) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-event-2` as the `flotiqStarterUrl`
* [Project portfolio Gatsby starter-1](https://github.com/flotiq/flotiq-gatsby-portfolio-1) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-portfolio-1` as the `flotiqStarterUrl`
* [Project portfolio Gatsby starter-2](https://github.com/flotiq/flotiq-gatsby-portfolio-2) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-portfolio-2` as the `flotiqStarterUrl`
* [Simple blog Gatsby starter-1](https://github.com/flotiq/flotiq-gatsby-blog-1) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-blog-1` as the `flotiqStarterUrl`
* [Simple blog Gatsby starter-2](https://github.com/flotiq/flotiq-gatsby-blog-2) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-blog-2` as the `flotiqStarterUrl`
* [Gatsby and Snipcart boilerplate, sourcing products from Flotiq-1](https://github.com/flotiq/flotiq-gatsby-shop-1) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-shop-1` as the `flotiqStarterUrl`
* [Gatsby and Snipcart boilerplate, sourcing products from Flotiq-2](https://github.com/flotiq/flotiq-gatsby-shop-2) - to use this starter use: `https://github.com/flotiq/flotiq-gatsby-shop-2` as the `flotiqStarterUrl`


## Setup for development

Clone this repository:

`git clone https://github.com/flotiq/flotiq-cli.git`

Enter the directory:

` cd flotiq-cli`

Install dependencies:

` npm install`

**Usage**

`node bin/flotiq start [projectName] [flotiqStarterUrl] [flotiqApiKey]`

**Import example data**

`node bin/flotiq import [projectName] [flotiqApiKey]`

**Import from wordpress**

`node bin/flotiq wordpress-import [wordpressUrl] [flotiqApiKey]`

**Purge data**

`node bin/flotiq purge [flotiqApiKey] [options]`

**Export data to JSON file**

`node bin/flotiq export [directory] [flotiqApiKey]`

**Install Flotiq SDK**

`node bin/flotiq sdk install [language] [directory] [flotiqApiKey]`

**Display Stats**

`node bin/flotiq stats [flotiqApiKey]`


## Collaboration

If you wish to talk with us about this project, feel free to hop on [![Discord Chat](https://img.shields.io/discord/682699728454025410.svg)](https://discord.gg/FwXcHnX)  .
   
If you found a bug, please report it in [issues](https://github.com/flotiq/flotiq-cli/issues).


## Errors
To make your life and ours easier, we have prepared an error codes.


### 1XX - Execution error

#### #100
  Writing or reading a file error.
  
#### #101
  Flotiq API bad response.

### #2XX - Start
#### #200

 Gatsby's error, more info is in the output.
 
### #3XX - Import

#### #300
 Problem with adding Content Object.

#### #302
 Incorrect Flotiq API key.
 
 
### #4XX - Wordpress-importer

#### #400
 Incorrect WordPress url.

## NPM publish

To publish a new package in NPM, you need to update the version in the packages.json and packages-lock.json files and then commit the changes with the message "Release x.y.z".
Where x.y.z is the new version of the package.
Commit about this on the master branch will start building a tag about this version and publishing a new version to npm.
