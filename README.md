<a href="https://flotiq.com/">
    <img src="https://editor.flotiq.com/fonts/fq-logo.svg" alt="Flotiq logo" title="Flotiq" align="right" height="60" />
</a>

Flotiq CLI
==================

CLI application for starting your next project with Flotiq fast. 
Currently supports importing data from Wordpress into Flotiq and seeding example data from our Gatsby starters.

## Setup for usage

`npm install -g flotiq-cli`

## Setup for development

Clone this repository:

`git clone https://github.com/flotiq/flotiq-cli.git`

Enter the directory:

` cd flotiq-cli`

Install dependencies:

` npm install`


## Usage

### Launch a Gatsby starter project

This command will:
- clone the Flotiq Gatsby starter,
- setup your Flotiq account to include the required Content Type Definitions,
- import example content into your account (e.g. images, blog posts, product descriptions),
- run `gatsby develop` for you.
Execute:
`flotiq start [flotiqApiKey] [projectName] [flotiqStarterUrl]`

or in development:

`node bin/flotiq start [flotiqApiKey] [projectName] [flotiqStarterUrl]`


### Import example data for a Gatsby starter

This command imports Content Types and Content Objects from Gatsby starter to your Flotiq account using the API key.
Gatsby starter must include directory `.flotiq` with `ContentType[0-9]` folders, each of them containing ContentTypeDefinition.json file, and contentObject[0-9].json files.

The number at the end of the directory or file name defines the file import order. 
The `.flotiq/images` directory in a particular starter stores images that will be imported into your Media Library.

Execute:
`flotiq import [flotiqApiKey] [projectName]`

or in development:

`node bin/flotiq import [flotiqApiKey] [projectName]`

### Import data from Wordpress to Flotiq

The `wordpress-import` command will:
- setup your Flotiq account to include required Content Type Definitions,
- automatically pull tags, categories, media, posts and pages from the provided Wordpress URL into your Flotiq account.

Execute:
`flotiq wordpress-import [flotiqApiKey] [wordpressUrl]`

or in development:

`node bin/flotiq wordpress-import [flotiqApiKey] [wordpressUrl]`

### Parameters

`flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))
`projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
`flotiqStarterUrl` - full link to GatsbyJs starter, the list below
`wordpressUrl` - full link to WordPress site from which you wish to migrate content to Flotiq

### Flags

`--json-output`, `-j` - Error and console output will be additionally written into json file named `output.json`.

## Gatsby Starters

You can choose one of our starters:

* [Recipe website Gatsby starter](https://github.com/flotiq/gatsby-starter-recipes) - to use this starter use: `https://github.com/flotiq/gatsby-starter-recipes` as the `flotiqStarterUrl`
* [Event calendar Gatsby starter](https://github.com/flotiq/gatsby-starter-event-calendar) - to use this starter use: `https://github.com/flotiq/gatsby-starter-event-calendar` as the `flotiqStarterUrl`
* [Project portfolio Gatsby starter](https://github.com/flotiq/gatsby-starter-projects) - to use this starter use: `https://github.com/flotiq/gatsby-starter-projects` as the `flotiqStarterUrl`
* [Simple blog Gatsby starter](https://github.com/flotiq/gatsby-starter-blog) - to use this starter use: `https://github.com/flotiq/gatsby-starter-blog` as the `flotiqStarterUrl`
* [Gatsby and Snipcart boilerplate, sourcing products from Flotiq](https://github.com/flotiq/gatsby-starter-products) - to use this starter use: `https://github.com/flotiq/gatsby-starter-products` as the `flotiqStarterUrl`
* [Gatsby and Snipcart boilerplate, e-commerce and Flotiq, products with categories](https://github.com/flotiq/gatsby-starter-products-with-categories) - to use this starter use: `https://github.com/flotiq/gatsby-starter-products-with-categories` as the `flotiqStarterUrl`

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
 Incorrect wordpress url.
