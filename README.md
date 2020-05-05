### Flotiqu CLI starter
CLI application who allowed fast starting Gatsby project with Flotiq integration.
The application imports Flotiq contentTypes and objects from Gatsby starter to yur Flotiq account using apy key.
Gatsby starter bust include directory examples with  ContentTypeDefinition.json file, and contentObject[0-1].json files.
Number of end file, define file import order.
Directory example/images stored images required by contentObject.

### Setup
clone ths repository

``git clone git@git.cdwv.pl:cdwv/flotiq-cli.git``

enter directory

`` cd flotiq-cli``

install dependencies

`` npm install``


### Usage
Run:

``` node index.json start [apiKey] [projectName] [flotiqSterterUrl]```

Or for load examples:
 
``` node index.json import [apiKey] [projectName]```

### Gatsby 
