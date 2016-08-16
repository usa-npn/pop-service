"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const csvBuilders_1 = require("./csvBuilders");
const zipBuilder_1 = require("./zipBuilder");
const npnPortalParams_1 = require("./npnPortalParams");
const express = require("express");
var morgan = require('morgan');
var bunyan = require('bunyan');
var path = require('path');
var bodyParser = require('body-parser');
var config = require('config');
var http = require('http');
var https = require('https');
var fs = require('graceful-fs');
var moment = require('moment');
var crypto = require('crypto');
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: config.get('mysql_host'),
    user: config.get('mysql_user'),
    password: config.get('mysql_password'),
    database: config.get('mysql_database')
});
let app = express();
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
process.on('uncaughtException', (err) => {
    log.error(err, "Something Broke!.");
    console.error(err.stack);
});
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use((err, req, res, next) => {
    log.error(err, "Something broke!.");
    console.error(err);
    res.send({ download_path: 'error' });
    // console.error(err.stack);
    // res.status(500).send('Something broke!');
});
function convertSetToArray(set) {
    let array = [];
    set.forEach((item) => array.push(item));
    return array;
}
function getObservationsServiceCall(reportType) {
    if (reportType === 'Raw')
        return 'observations/getObservations.json';
    if (reportType === 'Individual-Level Summarized')
        return 'observations/getSummarizedData.json';
    if (reportType === 'Site-Level Summarized')
        return 'observations/getSiteLevelData.json';
}
function getZippedData(req) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let requestTimestamp = Date.now();
            let params = npnPortalParams_1.getNpnPortalParams(req);
            log.info(params, "Data Request made with these params");
            let sites = new Set();
            let individuals = new Set();
            let observers = new Set();
            let groups = new Set();
            let phenophases = new Set();
            let datasets = new Set();
            let csvFileNames = [];
            csvFileNames.push(yield csvBuilders_1.createSearchParametersCsv(params, requestTimestamp));
            if (params.downloadType != 'Raw') {
                // for summarized data reports we need to chunk our requests in yearly intervals
                let startDate = moment(params.start_date, "YYYY-MM-DD");
                let endDate = moment(params.end_date, "YYYY-MM-DD");
                let tempStartDate = moment(startDate);
                let tempEndDate = moment(startDate).add(1, "years");
                let writeHeader = true;
                let headerWrote = false;
                while (tempEndDate.isBefore(endDate)) {
                    params.start_date = tempStartDate.format("YYYY-MM-DD");
                    params.end_date = tempEndDate.format("YYYY-MM-DD");
                    headerWrote = (yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, 'observations' + requestTimestamp.toString() + '.csv', true, writeHeader, sites, individuals, observers, groups, phenophases, datasets))[1];
                    tempStartDate.add(1, "years");
                    tempEndDate.add(1, "years");
                    if (headerWrote)
                        writeHeader = false;
                }
                params.start_date = tempStartDate.format("YYYY-MM-DD");
                params.end_date = endDate.format("YYYY-MM-DD");
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, 'observations' + requestTimestamp.toString() + '.csv', true, writeHeader, sites, individuals, observers, groups, phenophases, datasets))[0]);
            }
            else
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, 'observations' + requestTimestamp.toString() + '.csv', true, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
            if (params.ancillary_data) {
                if (params.ancillary_data.indexOf("Sites") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("stations/getStationDetails.json", { "site_id": convertSetToArray(sites) }, 'site_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                if (params.ancillary_data.indexOf("Individual Plants") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("individuals/getPlantDetails.json", { "individual_id": convertSetToArray(individuals) }, 'individual_plant_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                if (params.ancillary_data.indexOf("Observers") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("person/getObserverDetails.json", { "person_id": convertSetToArray(observers) }, 'person_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                if (params.ancillary_data.indexOf("Observation Details") != -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getObservationGroupDetails.json", { "observation_group_id": convertSetToArray(groups) }, 'observation_group_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                if (params.ancillary_data.indexOf("Protocols") != -1) {
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSpeciesProtocolDetails.json", {}, 'species_protocol_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getProtocolDetails.json", {}, 'protocol_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getPhenophaseDetails.json", { "phenophase_id": convertSetToArray(phenophases) }, 'phenophase_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSecondaryPhenophaseDetails.json", {}, 'species-specific_phenophase_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getAbundanceDetails.json", {}, 'intensity_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getDatasetDetails.json", { "dataset_id": convertSetToArray(datasets) }, 'dataset_data' + requestTimestamp.toString() + '.csv', false, true, sites, individuals, observers, groups, phenophases, datasets))[0]);
                }
            }
            let zipFileName = yield zipBuilder_1.createZip(params.downloadType, csvFileNames, requestTimestamp);
            for (var csvFile of csvFileNames) {
                fs.unlink(config.get('save_path') + csvFile, (err) => {
                    if (err)
                        throw err;
                });
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
app.post("/pop/download", (req, res) => {
    console.log("in /dot/download");
    getZippedData(req)
        .then(zipFile => {
        res.setHeader("Content-Type", "application/json");
        res.send(zipFile);
    })
        .catch(err => {
        console.error(err);
        res.send({ download_path: 'error' });
    });
});
app.get("/pop/search", (req, res) => {
    console.log("get /dot/search");
    let hashedJson = req.query.searchId;
    connection.query('SELECT JSON from Pop_Search WHERE Hash = ?', hashedJson, (err, result) => {
        if (err)
            throw err;
        if (result[0]) {
            res.send(JSON.parse(result[0].JSON));
        }
        else {
            res.send(null);
        }
    });
});
app.post("/pop/search", (req, res) => {
    console.log("post /dot/search");
    // CREATE TABLE usanpn2.Pop_Search (Search_ID INT(11) NOT NULL AUTO_INCREMENT, Hash TEXT, Json TEXT, Save_Count INT(11), PRIMARY KEY(Search_ID));
    let foundHash = false;
    let saveCount = 1;
    let saveJson = JSON.stringify(req.body.searchJson); //"{test: 'sfsdsdgi', test2: 'sdfsgs'}";
    let hashedJson = crypto.createHash('md5').update(saveJson).digest('hex');
    connection.query('SELECT * from Pop_Search WHERE Hash = ?', hashedJson, (err, result) => {
        if (err)
            throw err;
        if (result[0]) {
            foundHash = true;
            saveCount = result[0].Save_Count;
        }
        if (!foundHash) {
            var popSearch = { Hash: hashedJson, Json: saveJson, Save_Count: saveCount };
            connection.query('INSERT INTO Pop_Search SET ?', popSearch, (err, result) => {
                if (err)
                    throw err;
                console.log('Last insert:', result);
                res.send({ saved_search_hash: hashedJson });
            });
        }
        else {
            connection.query('Update Pop_Search SET Save_count = ? WHERE Hash = ?', [saveCount + 1, hashedJson], (err, result) => {
                if (err)
                    throw err;
                console.log('Last insert:', result);
                res.send({ saved_search_hash: hashedJson });
            });
        }
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
server.listen(config.get('port'), () => {
    console.log("Server listening on port " + config.get("port"));
    connection.connect();
});
//# sourceMappingURL=server.js.map