<a href="https://flotiq.com/">
    <img src="https://api.flotiq.com/image/0x0/_media-baefa473-6c64-43ef-bedf-bd3716831dd8.png" alt="Flotiq logo" title="Flotiq" align="right" height="70" />
</a>

Flotiq CLI
==================

<p align="center">
    ![Npm package version](https://npmjs.com/package/flotiq-cli)
    ![Discord](https://discord.gg/V8vcfReN3w)
    ![Terminal](https://badgen.net/badge/icon/terminal?icon=terminal&label)
</p>

Flotiq is a modern and highly customizable headless CMS that offers a seamless content management experience for developers and content creators alike. With its intuitive API-first approach and flexible data model, Flotiq enables businesses to easily create, manage, and distribute content across multiple channels and platforms.

CLI application for starting your next project with Flotiq fast.
Currently supports the following commands:
- [launching Flotiq starter projects](https://github.com/flotiq/flotiq-cli#launch-a-flotiq-starter-project)
- [seeding example data from our Gatsby starters](https://github.com/flotiq/flotiq-cli#import-example-data-for-a-gatsby-starter)
- [importing data from WordPress into Flotiq](https://github.com/flotiq/flotiq-cli#import-data-from-wordpress-to-flotiq)
- [importing data from Contentful into Flotiq](https://github.com/flotiq/flotiq-cli#import-data-from-contentful-to-flotiq)
- [exporting data from your Flotiq account into JSON](https://github.com/flotiq/flotiq-cli#export-data-from-flotiq-to-json-files)
- [exporting data from your Flotiq account into Microsoft Excel format](https://github.com/flotiq/flotiq-cli#export-data-from-flotiq-to-ms-excel).
- [purging data in your Flotiq account](https://github.com/flotiq/flotiq-cli#purge-data-in-flotiq-account)
- [installing your SDK packages](https://github.com/flotiq/flotiq-cli#install-flotiq-sdk)
- [displaying account stats](https://github.com/flotiq/flotiq-cli#display-stats)

<a href="https://flotiq.com/docs/CLI/">See our docs :scroll:</a>

## Setup

`npm install -g flotiq-cli`

## Usage

### Export data from Flotiq to JSON files

`flotiq export [directory] [flotiqApiKey]`

This command exports data from the Flotiq account to local JSON files. If the key is limited to selected Content Types, then the data available for this key will be exported.

**Parameters**

* `directory` - path to the directory where the files will be saved
* `flotiqApiKey` - read-only or read and write API key to your Flotiq account

**Flags**

* `--only-definitions` - use this flag to run export only for Content Type Definitions, ignore Content Objects

### Import data from JSON files

`flotiq import [projectName] [flotiqApiKey]`

This command imports Content Types and Content Objects to your Flotiq account using the API key.
Source directory must include directory with `ContentType[Name]` folders, each of them containing ContentTypeDefinition.json file, and `contentObject[Name].json` files.

The command can import data output of the `flotiq export` command.

**Parameters**

* `projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
* `flotiqApiKey` - read and write API key to your Flotiq account

### Launch a Flotiq starter project

`flotiq start [projectName] [flotiqStarterUrl] [flotiqApiKey]`

This command will:
- clone the Flotiq Gatsby or Nextjs starter,
- setup your Flotiq account to include the required Content Type Definitions,
- import example content into your account (e.g. images, blog posts, product descriptions),
- run `gatsby develop` to start your Gatsby starter.

**Parameters**

* `projectName` - project name or project path (if you wish to start or import data from the directory you are in, use `.`)
* `flotiqStarterUrl` - full link to the starter, the list below
* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

**Flags**

* `--framework` - framework of the starter i.e. `--framework=nextjs` or `--fw=gatsby`. If no framework parameter is given, the URL will be searched for phrases i.e. Set to `gatsby` by default
* `--no-import` - skip example data import

#### Import variables

There is a possibility to use dynamic data in JSON files. 
We implemented our parser to create a dynamic date value, but it can be extended in the future.
To use dynamic date in imported `contentObject.json` files use `{{date}}` function:

* `{{date}}` means `now`, outputs e.g. 2022-01-01
* `{{date:+5d}}` means `now + 5 days`, outputs e.g. 2022-01-06 
* `{{date:-5m}}` means `now - 5 months`, outputs e.g. 2021-06-01
* `{{date:+5y}}` means `now + 5 years`, outputs e.g. 2027-01-01

### Import data from WordPress to Flotiq

`flotiq wordpress-import [wordpressUrl] [flotiqApiKey]`

This command will:

* setup your Flotiq account to include the required Content Type Definitions,
* automatically pull tags, categories, media, posts and pages from the provided WordPress URL into your Flotiq account.

**Parameters**

* `wordpressUrl` - full link to WordPress site from which you wish to migrate content to Flotiq
* `flotiqApiKey` - read and write API key to your Flotiq account

### Purge data in Flotiq account

`flotiq purge [flotiqApiKey]`

This command will remove all data from your account. Great for testing imports. Command requires additional confirmation.

**Parameters**

* `flotiqApiKey` - read and write API key to your Flotiq account

**Flags**

* `--withInternal` or `--internal` - purge will also remove internal type objects like (`_media`)
* `--force` or `--f` - purge will remove data even if Content Types relations loop to each other.

### Install Flotiq SDK

`flotiq sdk install [language] [directory] [flotiqApiKey]`

**Parameters**

* `language` - SDK language: csharp, go, java, javascript, php, python, typescript
* `directory` - path to the directory where the files will be saved
* `flotiqApiKey` - read and write API key to your Flotiq account

### Import data from Contentful to Flotiq

`flotiq contentful-import [contentfulSpaceId] [contentfulContentManagementToken] [flotiqApiKey] [translation]`

This command will automatically pull content types, assets and content objects from Contentful space to your Flotiq account.

**Parameters**

* `[translation]` - selection of Contentful's locale. en-US by default

### Export data from Flotiq to MS Excel

`flotiq excel-export [ctdName] [filePath] [flotiqApiKey]`

This command will export Content Objects from the given Content Type to an MS Excel file in .xlsx format.

**Parameters**

* `ctdName` - API name of Content Type Definition you wish to export
* `filePath` - the directory to which the xlsx file is to be saved. Type in "." if you want to save the file inside the current directory
* `flotiqApiKey` - API key to your Flotiq account with read permission

**Flags**

* `--limit=[number]` or `--l=[number]` - number of Content Objects to export counting from the top row, default: 10000
* `--hideResults` or `--hr` - information about the export process will not appear in the console

### Import data to Flotiq from MS Excel

`flotiq excel-import [ctdName] [filePath] [flotiqApiKey]`

This command will import Content Objects from an MS Excel file to the given Content Type.

**Parameters**

* `ctdName` - API name of Content Type Definition you wish to import data to
* `filePath` - the path to the xlsx file you wish to import data from
* `flotiqApiKey` - API key to your Flotiq account with read and write permissions

**Flags**

* `--limit=[number]` or `--l=[number]` - number of Content Objects imported counting from the top row, default: 10 000
* `--batchLimit` or `--bl` - number of Content Objects imported per batch call, default: 100
* `--hideResults` or `--hr` - information about the import process will not appear in the console
* `--updateExisting` or `--ue` - if content objects with a given id already exist in the Flotiq account, they will be updated

### Display stats

`flotiq stats [flotiqApiKey]`

This command displays your Flotiq API Key's following statistics:

* number of Content Type Definitions, Content Objects by CTD, total Content Objects, Media, Webhooks,
* 10 recently modified objects.

**Parameters**

* `flotiqApiKey` - API key to your Flotiq account, if you wish to import data it must be read and write API key (more about Flotiq API keys in [the documentation](https://flotiq.com/docs/API/))

## Flags

`--json-output`, `-j` - Error and console output will be additionally written into json file named `output.json`

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

## NextJs Starters

* [Recipe website NextJs starter-2](https://github.com/flotiq/flotiq-nextjs-recipe-2) - to use this starter use: `https://github.com/flotiq/flotiq-nextjs-recipe-2` as the `flotiqStarterUrl`
* [Event calendar NextJs starter-2](https://github.com/flotiq/flotiq-nextjs-event-2) - to use this starter use: `https://github.com/flotiq/flotiq-nextjs-event-2` as the `flotiqStarterUrl`
* [Project portfolio NextJs starter-2](https://github.com/flotiq/flotiq-nextjs-portfolio-2) - to use this starter use: `https://github.com/flotiq/flotiq-nextjs-portfolio-2` as the `flotiqStarterUrl`
* [Simple blog NextJs starter-1](https://github.com/flotiq/flotiq-nextjs-blog-1) - to use this starter use: `https://github.com/flotiq/flotiq-nextjs-blog-1` as the `flotiqStarterUrl`
* [NextJs and Snipcart boilerplate, sourcing products from Flotiq-2](https://github.com/flotiq/flotiq-nextjs-shop-2) - to use this starter use: `https://github.com/flotiq/flotiq-nextjs-shop-2` as the `flotiqStarterUrl`

## Setup for development

Clone this repository:

`git clone https://github.com/flotiq/flotiq-cli.git`

Enter the directory:

`cd flotiq-cli`

Install dependencies:

`npm install`

Usage

`node bin/flotiq [command]`, for example `node bin/flotiq stats [flotiqApiKey]`

## Collaboration

If you wish to talk with us about this project, feel free to hop on [![Discord Chat](https://img.shields.io/discord/682699728454025410.svg)](https://discord.gg/FwXcHnX).
   
If you found a bug, please report it in [issues](https://github.com/flotiq/flotiq-cli/issues).


## Errors
To make your life and ours easier, we have prepared error codes.

### 1XX - Execution error

#### #100
 Writing or reading a file error.

### #2XX - Start

#### #200
 Gatsby's error, more info is in the output.
 
### #3XX - Import

#### #300
 Problem with adding Content Object.
 
### #4XX - WordPress-importer

#### #400
 Incorrect WordPress URL.

## NPM publish

To publish a new package in NPM, you need to update the version in the packages.json and packages-lock.json files and then commit the changes with the message "Release x.y.z".
Where x.y.z is the new version of the package.
Commit about this on the master branch will start building a tag about this version and publishing a new version to npm.
