"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var csvBuilders_1 = require("./csvBuilders");
var zipBuilder_1 = require("./zipBuilder");
var npnPortalParams_1 = require("./npnPortalParams");
var express = require("express");
var moment = require("moment");
var bunyan = require('bunyan');
var morgan = require('morgan');
var fs = require('graceful-fs');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var mysql = require('mysql');
var config = require('config');
var util = require('util');
var path = require('path');
// import * as http from 'http';  //not using because won't allow server.setTimeout(0);
// import * as https from 'https';
var http = require('http');
var https = require('https');
var pool = mysql.createPool({
    connectionLimit: 20,
    host: config.get('mysql_host'),
    user: config.get('mysql_user'),
    password: config.get('mysql_password'),
    database: config.get('mysql_database'),
    debug: false
});
var app = express();
// allows us to consume json from post requests
app.use(bodyParser.json());
// create a write stream (in append mode) and set up a log to record requests
var accessLogStream = fs.createWriteStream(path.join(config.get("logs_path"), 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
var log = bunyan.createLogger({
    name: 'dot_service',
    streams: [
        {
            level: 'info',
            path: path.join(config.get("logs_path"), 'info.log')
        },
        {
            level: 'error',
            path: path.join(config.get("logs_path"), 'error.log')
        }
    ]
});
process.on('uncaughtException', function (err) {
    log.error(err, "Something Broke!.");
    console.error(err.stack);
});
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(function (err, req, res, next) {
    log.error(err, "Something broke!.");
    console.error(err);
    res.send({ download_path: 'error' });
    // console.error(err.stack);
    // res.status(500).send('Something broke!');
});
function convertSetToArray(set) {
    var array = [];
    set.forEach(function (item) { return array.push(item); });
    return array;
}
function getObservationsServiceCall(reportType) {
    if (reportType === 'Status and Intensity')
        return 'observations/getObservations.json';
    if (reportType === 'Individual Phenometrics')
        return 'observations/getSummarizedData.json';
    if (reportType === 'Site Phenometrics')
        return 'observations/getSiteLevelData.json';
}
function getZippedData(req) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var requestTimestamp = Date.now();
            var params = npnPortalParams_1.getNpnPortalParams(req);
            log.info(params, "Data Request made with these params");
            var sites = new Set();
            var individuals = new Set();
            var observers = new Set();
            var groups = new Set();
            var csvFileNames = [];
            csvFileNames.push(yield csvBuilders_1.createSearchParametersCsv(params, requestTimestamp));
            if (params.downloadType != 'Status and Intensity') {
                // for summarized data reports we need to chunk our requests in yearly intervals
                var startDate = moment(params.start_date, "YYYY-MM-DD");
                var endDate = moment(params.end_date, "YYYY-MM-DD");
                var tempStartDate = moment(startDate);
                var tempEndDate = moment(startDate).add(1, "years");
                var writeHeader = true;
                var headerWrote = false;
                var sheetName = void 0;
                if (params.downloadType == "Individual Phenometrics") {
                    sheetName = "individual_phenometrics_data";
                }
                else {
                    sheetName = "site_phenometrics_data";
                }
                while (tempEndDate.isBefore(endDate)) {
                    params.start_date = tempStartDate.format("YYYY-MM-DD");
                    params.end_date = tempEndDate.format("YYYY-MM-DD");
                    headerWrote = (yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + '.csv', "observation", true, writeHeader, sites, individuals, observers, groups))[1];
                    tempStartDate.add(1, "years");
                    tempEndDate.add(1, "years");
                    if (headerWrote)
                        writeHeader = false;
                }
                params.start_date = tempStartDate.format("YYYY-MM-DD");
                params.end_date = endDate.format("YYYY-MM-DD");
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + '.csv', "observation", true, writeHeader, sites, individuals, observers, groups))[0]);
            }
            else
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, 'status_intensity_observation_data' + requestTimestamp.toString() + '.csv', "observation", true, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data) {
                if (params.ancillary_data.indexOf("Sites") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("stations/getStationDetails.json", { "ids": convertSetToArray(sites).toString(), 'no_live': true }, 'ancillary_site_data' + requestTimestamp.toString() + '.csv', "station", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Individual Plants") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("individuals/getPlantDetails.json", { "individual_id": convertSetToArray(individuals) }, 'ancillary_individual_plant_data' + requestTimestamp.toString() + '.csv', "individual", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Observers") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("person/getObserverDetails.json", { "person_id": convertSetToArray(observers) }, 'ancillary_person_data' + requestTimestamp.toString() + '.csv', "observer", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Site Visit Details") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getObservationGroupDetails.json", { "observation_group_id": convertSetToArray(groups) }, 'ancillary_site_visit_data' + requestTimestamp.toString() + '.csv', "obs_group", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Protocols (7 files)") != -1) {
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSpeciesProtocolDetails.json", {}, 'ancillary_species_protocol_data' + requestTimestamp.toString() + '.csv', "species_protocol", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getProtocolDetails.json", {}, 'ancillary_protocol_data' + requestTimestamp.toString() + '.csv', "protocol", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getPhenophaseDetails.json", {}, 'ancillary_phenophase_data' + requestTimestamp.toString() + '.csv', "phenophase", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSecondaryPhenophaseDetails.json", {}, 'ancillary_species-specific_info_data' + requestTimestamp.toString() + '.csv', "sspi", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getAbundanceDetails.json", {}, 'ancillary_intensity_data' + requestTimestamp.toString() + '.csv', "intensity", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getDatasetDetails.json", {}, 'ancillary_dataset_data' + requestTimestamp.toString() + '.csv', "dataset", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getPhenophaseDefinitionDetails.json", {}, 'ancillary_phenophase_definition_data' + requestTimestamp.toString() + '.csv', "phenophase_definition", false, true, sites, individuals, observers, groups))[0]);
                }
            }
            var zipFileName = yield zipBuilder_1.createZip(params.downloadType, csvFileNames, requestTimestamp);
            // remove csv files that were just zipped
            for (var _i = 0, csvFileNames_1 = csvFileNames; _i < csvFileNames_1.length; _i++) {
                var csvFile = csvFileNames_1[_i];
                fs.unlink(config.get('save_path') + csvFile, function (err) {
                    if (err)
                        throw err;
                });
            }
            // remove old zip files
            var filesInDownloadsDirectory = fs.readdirSync(config.get('save_path'));
            for (var i in filesInDownloadsDirectory) {
                var filePath = config.get('save_path') + filesInDownloadsDirectory[i];
                if (path.extname(filePath) === '.zip') {
                    //console.log('looking at: ' + filePath);
                    var stats = fs.statSync(filePath);
                    var mtime = new Date(util.inspect(stats.mtime));
                    //console.log('last modified time: ' + mtime);
                    var daysOld = moment(requestTimestamp).diff(moment(mtime), 'days');
                    //console.log('file is ' + daysOld + ' days old');
                    if (daysOld > 1) {
                        //console.log('file is going to be deleted');
                        fs.unlink(filePath, function (err) {
                            if (err)
                                throw err;
                        });
                    }
                }
            }
            log.info("Sending " + zipFileName + " to the client");
            return { download_path: config.get('server_path') + zipFileName };
        }
        catch (error) {
            log.error(error, "Could not produce zip file.");
            console.error(error);
            return { download_path: 'error' };
        }
    });
}
app.post("/pop/download", function (req, res) {
    console.log("in /dot/download");
    getZippedData(req)
        .then(function (zipFile) {
        res.setHeader("Content-Type", "application/json");
        res.send(zipFile);
    })
        .catch(function (err) {
        console.error(err);
        res.send({ download_path: 'error' });
    });
});
app.get("/pop/search", function (req, res) {
    console.log("get /dot/search");
    var hashedJson = req.query.searchId;
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            res.send(null);
        }
        else {
            connection.query('SELECT JSON from Pop_Search WHERE Hash = ?', hashedJson, function (err, result) {
                if (err)
                    throw err;
                if (result[0]) {
                    res.send(JSON.parse(result[0].JSON));
                }
                else {
                    res.send(null);
                }
                connection.release();
            });
        }
    });
});
app.post("/pop/search", function (req, res) {
    console.log("post /dot/search");
    // CREATE TABLE usanpn2.Pop_Search (Search_ID INT(11) NOT NULL AUTO_INCREMENT, Hash TEXT, Json TEXT, Save_Count INT(11), PRIMARY KEY(Search_ID));
    var foundHash = false;
    var saveCount = 1;
    var saveJson = JSON.stringify(req.body.searchJson);
    var hashedJson = crypto.createHash('md5').update(saveJson).digest('hex');
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            res.send(null);
            connection.release();
        }
        else {
            connection.query('SELECT * from Pop_Search WHERE Hash = ?', hashedJson, function (err, result) {
                if (err)
                    throw err;
                if (result[0]) {
                    foundHash = true;
                    saveCount = result[0].Save_Count;
                }
                if (!foundHash) {
                    var popSearch = { Hash: hashedJson, Json: saveJson, Save_Count: saveCount };
                    connection.query('INSERT INTO Pop_Search SET ?', popSearch, function (err, result) {
                        if (err)
                            throw err;
                        console.log('Last insert:', result);
                        res.send({ saved_search_hash: hashedJson });
                    });
                }
                else {
                    connection.query('Update Pop_Search SET Save_count = ? WHERE Hash = ?', [saveCount + 1, hashedJson], function (err, result) {
                        if (err)
                            throw err;
                        console.log('Last insert:', result);
                        res.send({ saved_search_hash: hashedJson });
                    });
                }
                connection.release();
            });
        }
    });
});
app.get("/pop/fgdc", function (req, res) {
    console.log("get /dot/fgdc");
    var filePath = config.get('metadata_path') + "USA-NPN_Phenology_observation_data.xml";
    var file = fs.createWriteStream(filePath);
    var gitUrl = "https://raw.githubusercontent.com/usa-npn/metadata/master/USA-NPN_Phenology_observation_data.xml";
    https.get(gitUrl, function (gitResponse) {
        gitResponse.pipe(file);
        file.on('finish', function () {
            res.download(filePath, 'USA-NPN_Phenology_observation_data.xml'); // Set disposition and send it.
        });
    });
});
if (config.get('protocol') === 'https') {
    var certificate = fs.readFileSync(config.get('ssl_cert'));
    var privateKey = fs.readFileSync(config.get('ssl_key'));
    console.log("creating https server");
    var server = https.createServer({ key: privateKey, cert: certificate }, app);
    server.setTimeout(0);
}
else {
    console.log("creating http server");
    var server = http.createServer(app);
    server.setTimeout(0);
}
server.listen(config.get('port'), function () {
    console.log("Server listening on port " + config.get("port"));
});
