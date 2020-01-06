# USA-NPN Phenology Observation Portal Nodejs Server

This repository contains the nodejs server for the USA-NPN phenology observation portal. This server's main purpose is to take requests from the phenology observation portal, generate multiple csv reports containing npn phenology observation data, zip up the reports, and send them to the end user.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisities

To run the pop server the following need to be installed:

* [nodejs](https://nodejs.org/en/) - it is recommended to use [nvm](https://github.com/creationix/nvm) to manage multiple versions of nodejs

All additional dependancies are managed through [npm](https://www.npmjs.com/), the node package manager which is included with node.

### Installing

After cloning the project you will need to take the following steps.

cd into the main directory and install all dependancies through npm. 

```
cd pop-service
npm install
```
The command installs all dependencies listed in the package.json file into a folder called node_modules.

Create config files in the pop-service/config/ directory using the readme in that same directory as a guide. For example:

```
vi pop-serverice/config/default.json

{
  "npn_portal_path": "location of npn portal endpoint",
  "server_path": "path where client can find server",
  "save_path": "path to save zips",
  "logs_path": "path to save logs",
  "protocol": "http or https",
  "ssl_cert": "dir to ssl cert",
  "ssl_key": "dir to ssl key",
  "port": portNumber the nodejs server will listen on,
  "mysql_host": ,
  "mysql_user": ,
  "mysql_password": ,
  "mysql_database":
}

```

Transpile the typescript into javascript.

```
cd pop-service
tsc
```

At this point you can start the server.

```
node pop-service/built/server.js
```

## Deployment

This server is currently deployed using ubuntu upstart which autostarts the server on boot and provides the following commands.

```
sudo service pop-service stop
sudo service pop-service start
sudo service pop-service restart
sudo service pop-service status
```

The service is located in /etc/init/pop-service.conf

A common deployment will look like this
```
cd pop-service
sudo service pop-service stop
sudo git pull
sudo npm install - this is only needed if the commit added a new npm package
sudo tsc
sudo service pop-service start
```

## Related Projects

This repository only contains one of three main peices used to deliver phenology observations to public. The following repositories contain the other two pieces.

* [USA-NPN Phenology Observation Portal](https://github.com/usa-npn/phenology-observation-portal) - the web-browser front end used to request data
* USA-NPN Rest Services (currently in svn) - rest services to interface with NPN data

## Authors

* **Jeff Switzer** - [NPN](https://github.com/usa-npn)
* **Lee Marsh** - [NPN](https://github.com/usa-npn)

See also the list of [contributors](https://www.usanpn.org/about/staff) who participated in this project.
