<a href="https://flotiq.com/">
    <img src="https://editor.flotiq.com/fonts/fq-logo.svg" alt="Flotiq logo" title="Flotiq" align="right" height="60" />
</a>

Flotiq CLI
==================

CLI application for starting Gatsby project with Flotiq integration fast.
It imports Content Types and Content Objects from Gatsby starter to your Flotiq account using the API key.
Gatsby starter must include directory `.flotiq` with `ContentType[0-9]` folders, each of them containing ContentTypeDefinition.json file, and contentObject[0-9].json files.
The number at the end of the directory or file name, define file import order. `.flotiq/images` directory stores images required by content objects.

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

### Start project

`flotiq start [apiKey] [projectName] [flotiqSterterUrl]`

or in development:

` node bin/flotiq start [apiKey] [projectName] [flotiqSterterUrl]`

### Load examples

`flotiq import [apiKey] [projectName]`

or in development:

` node bin/flotiq import [apiKey] [projectName]`

### Import data from Wordpress to Flotiq

`flotiq wordpress-import [apiKey] [wordpressUrl]`

### Parameters

`apiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))
`projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
`flotiqStarterUrl` - full link to GatsbyJs starter, the list below
`wordpressUrl` - full link to WordPress site from which you wish to migrate content to Flotiq
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
