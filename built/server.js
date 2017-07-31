"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const csvBuilders_1 = require("./csvBuilders");
const zipBuilder_1 = require("./zipBuilder");
const npnPortalParams_1 = require("./npnPortalParams");
const express = require("express");
const moment = require("moment");
const bunyan = require("bunyan");
const morgan = require("morgan");
const fs = require("graceful-fs");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mysql = require("mysql");
const config = require("config");
const util = require("util");
const path = require("path");
// import * as http from 'http';  //not using because won't allow server.setTimeout(0);
// import * as https from 'https';
let http = require("http");
let https = require("https");
let pool = mysql.createPool({
    connectionLimit: 20,
    host: config.get("mysql_host"),
    user: config.get("mysql_user"),
    password: config.get("mysql_password"),
    database: config.get("mysql_database"),
    debug: false
});
let app = express();
// allows us to consume json from post requests
app.use(bodyParser.json());
// create a write stream (in append mode) and set up a log to record requests
let accessLogStream = fs.createWriteStream(path.join(config.get("logs_path").toString(), "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));
let log = bunyan.createLogger({
    name: "dot_service",
    streams: [
        {
            level: "info",
            path: path.join(config.get("logs_path").toString(), "info.log")
        },
        {
            level: "error",
            path: path.join(config.get("logs_path").toString(), "error.log")
        }
    ]
});
process.on("uncaughtException", (err) => {
    log.error(err, "Something Broke!.");
    console.error(err.stack);
});
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
// note: don't remove unused parameter next... things will break
app.use((err, req, res, next) => {
    log.error(err, "Something broke!.");
    console.error(err);
    res.send({ download_path: "error" });
    // console.error(err.stack);
    // res.status(500).send('Something broke!');
});
function convertSetToArray(set) {
    let array = [];
    set.forEach((item) => array.push(item));
    return array;
}
function getObservationsServiceCall(reportType) {
    if (reportType === "Status and Intensity")
        return "observations/getObservations.json";
    if (reportType === "Individual Phenometrics")
        return "observations/getSummarizedData.json";
    if (reportType === "Site Phenometrics")
        return "observations/getSiteLevelData.json";
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
            let csvFileNames = [];
            csvFileNames.push(yield csvBuilders_1.createSearchParametersCsv(params, requestTimestamp));
            if (params.downloadType !== "Status and Intensity") {
                // for summarized data reports we need to chunk our requests in yearly intervals
                let startDate = moment(params.start_date, "YYYY-MM-DD");
                let endDate = moment(params.end_date, "YYYY-MM-DD");
                let tempStartDate = moment(startDate);
                let tempEndDate = moment(startDate).add(1, "years");
                let writeHeader = true;
                let headerWrote = false;
                let sheetName;
                if (params.downloadType === "Individual Phenometrics") {
                    sheetName = "individual_phenometrics_data";
                }
                else {
                    sheetName = "site_phenometrics_data";
                }
                while (tempEndDate.isBefore(endDate)) {
                    params.start_date = tempStartDate.format("YYYY-MM-DD");
                    params.end_date = tempEndDate.format("YYYY-MM-DD");
                    headerWrote = (yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + ".csv", "observation", true, writeHeader, sites, individuals, observers, groups))[1];
                    tempStartDate.add(1, "years");
                    tempEndDate.add(1, "years");
                    if (headerWrote)
                        writeHeader = false;
                }
                params.start_date = tempStartDate.format("YYYY-MM-DD");
                params.end_date = endDate.format("YYYY-MM-DD");
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + ".csv", "observation", true, writeHeader, sites, individuals, observers, groups))[0]);
            }
            else
                csvFileNames.push((yield csvBuilders_1.createCsv(getObservationsServiceCall(params.downloadType), params, "status_intensity_observation_data" + requestTimestamp.toString() + ".csv", "observation", true, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data) {
                if (params.ancillary_data.indexOf("Sites") !== -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("stations/getStationDetails.json", { "ids": convertSetToArray(sites).toString(), "no_live": true }, "ancillary_site_data" + requestTimestamp.toString() + ".csv", "station", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Individual Plants") !== -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("individuals/getPlantDetails.json", { "individual_id": convertSetToArray(individuals) }, "ancillary_individual_plant_data" + requestTimestamp.toString() + ".csv", "individual", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Observers") !== -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("person/getObserverDetails.json", { "person_id": convertSetToArray(observers) }, "ancillary_person_data" + requestTimestamp.toString() + ".csv", "observer", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Site Visit Details") !== -1)
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getObservationGroupDetails.json", { "observation_group_id": convertSetToArray(groups) }, "ancillary_site_visit_data" + requestTimestamp.toString() + ".csv", "obs_group", false, true, sites, individuals, observers, groups))[0]);
                if (params.ancillary_data.indexOf("Protocols (7 files)") !== -1) {
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSpeciesProtocolDetails.json", {}, "ancillary_species_protocol_data" + requestTimestamp.toString() + ".csv", "species_protocol", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getProtocolDetails.json", {}, "ancillary_protocol_data" + requestTimestamp.toString() + ".csv", "protocol", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getPhenophaseDetails.json", {}, "ancillary_phenophase_data" + requestTimestamp.toString() + ".csv", "phenophase", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getSecondaryPhenophaseDetails.json", {}, "ancillary_species-specific_info_data" + requestTimestamp.toString() + ".csv", "sspi", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getAbundanceDetails.json", {}, "ancillary_intensity_data" + requestTimestamp.toString() + ".csv", "intensity", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("observations/getDatasetDetails.json", {}, "ancillary_dataset_data" + requestTimestamp.toString() + ".csv", "dataset", false, true, sites, individuals, observers, groups))[0]);
                    csvFileNames.push((yield csvBuilders_1.createCsv("phenophases/getPhenophaseDefinitionDetails.json", {}, "ancillary_phenophase_definition_data" + requestTimestamp.toString() + ".csv", "phenophase_definition", false, true, sites, individuals, observers, groups))[0]);
                }
            }
            let zipFileName = yield zipBuilder_1.createZip(params.downloadType, csvFileNames, requestTimestamp);
            // remove csv files that were just zipped
            for (let csvFile of csvFileNames) {
                fs.unlink(config.get(`save_path`) + csvFile, (err) => {
                    if (err)
                        throw err;
                });
            }
            // remove old zip files
            let filesInDownloadsDirectory = fs.readdirSync(config.get("save_path"));
            for (let i in filesInDownloadsDirectory) {
                let filePath = config.get("save_path") + filesInDownloadsDirectory[i];
                if (path.extname(filePath) === ".zip") {
                    // console.log('looking at: ' + filePath);
                    let stats = fs.statSync(filePath);
                    let mtime = new Date(util.inspect(stats.mtime));
                    // console.log('last modified time: ' + mtime);
                    let daysOld = moment(requestTimestamp).diff(moment(mtime), "days");
                    // console.log('file is ' + daysOld + ' days old');
                    if (daysOld > 1) {
                        // console.log('file is going to be deleted');
                        fs.unlink(filePath, (err) => {
                            if (err)
                                throw err;
                        });
                    }
                }
            }
            log.info("Sending " + zipFileName + " to the client");
            return { download_path: config.get("server_path") + zipFileName };
        }
        catch (error) {
            log.error(error, "Could not produce zip file.");
            console.error(error);
            return { download_path: "error" };
        }
    });
}
function getResource(url, prefix, extension, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let fileName = prefix + requestTimestamp + "." + extension;
        let filePath = config.get("save_path") + fileName;
        let file = fs.createWriteStream(filePath);
        url = url.replace('http', 'https');
        https.get(url, (metaResponse) => {
            metaResponse.pipe(file);
            metaResponse.on('end', () => {
                resolve(fileName);
            });
        });
    });
}
function resolveResourceExtension(mime) {
    let ext = "png";
    switch (mime) {
        case "image/png":
            ext = "png";
            break;
        case "application/pdf":
            ext = "pdf";
            break;
        case "application/atom+xml":
        case "application/rss+xml":
        case "application/gml+xml":
            ext = "xml";
            break;
        case "application/vnd.google-earth.kml+xml":
            ext = "kml";
            break;
        case "application/vnd.google-earth.kmz":
            ext = "kmz";
            break;
        case "image/geotiff":
        case "image/geotiff8":
        case "image/tiff":
        case "image/tiff8":
        case "geotiff":
        case "tiff":
            ext = "tif";
            break;
        case "image/gif":
            ext = "gif";
            break;
        case "image/jpeg":
            ext = "jpg";
            break;
        case "ArcGrid":
            ext = "asc";
            break;
        case "ArcGrid-GZIP":
            ext = "gz";
            break;
        case "application/x-netcdf":
            ext = "nc";
            break;
        case "text/plain":
            ext = "txt";
            break;
        default:
            ext = "png";
    }
    return ext;
}
function validateInput(req) {
    let regex = new RegExp("^https?:\/\/[a-zA-Z-]+\.usanpn\.org\/[a-zA-Z0-9\(\)\+\"-].+", 'i');
    console.log("Validation:");
    console.log(regex.test(req.body.resource_url));
    console.log(regex.test(req.body.citation_url));
    console.log(req.body.citation_url);
    return regex.test(req.body.resource_url) &&
        regex.test(req.body.citation_url) &&
        regex.test(req.body.metadata_url);
}
function getCitationData(req) {
    return __awaiter(this, void 0, void 0, function* () {
        let valid = validateInput(req);
        if (valid) {
            let requestTimestamp = Date.now();
            let citation = csvBuilders_1.createCitationURLCsv(req.body.citation_url, req.body.layer_title, req.body.doi, req.body.range, requestTimestamp);
            let ext = resolveResourceExtension(req.body.mime);
            let dataPromise = getResource(req.body.resource_url, "data", ext, requestTimestamp);
            let metadataPromise = getResource(req.body.metadata_url, "metadata", "xml", requestTimestamp);
            let zipFile;
            zipFile = yield Promise.all([dataPromise, metadataPromise, citation]).then(values => {
                return zipBuilder_1.zipGeoserverData(values, requestTimestamp);
            });
            return zipFile;
        }
        else {
            return null;
        }
    });
}
app.post("/grb/package", (req, res) => {
    let zipName = getCitationData(req).then((zip) => {
        res.setHeader("Content-Type", "application/json");
        zip = config.get("server_path") + zip;
        res.send(JSON.stringify({ download_path: zip }));
    });
});
app.post("/pop/download", (req, res) => {
    console.log("in /dot/download");
    getZippedData(req)
        .then(zipFile => {
        res.setHeader("Content-Type", "application/json");
        res.send(zipFile);
    })
        .catch(err => {
        console.error(err);
        res.send({ download_path: "error" });
    });
});
app.get("/pop/search", (req, res) => {
    console.log("get /dot/search");
    let hashedJson = req.query.searchId;
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            res.send(null);
        }
        else {
            connection.query("SELECT JSON from Pop_Search WHERE Hash = ?", hashedJson, (err, result) => {
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
app.post("/pop/search", (req, res) => {
    console.log("post /dot/search");
    // CREATE TABLE usanpn2.Pop_Search (Search_ID INT(11) NOT NULL AUTO_INCREMENT, Hash TEXT, Json TEXT, Save_Count INT(11), PRIMARY KEY(Search_ID));
    let foundHash = false;
    let saveCount = 1;
    let saveJson = JSON.stringify(req.body.searchJson);
    let hashedJson = crypto.createHash("md5").update(saveJson).digest("hex");
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            res.send(null);
            connection.release();
        }
        else {
            connection.query("SELECT * from Pop_Search WHERE Hash = ?", hashedJson, (err, result) => {
                if (err)
                    throw err;
                if (result[0]) {
                    foundHash = true;
                    saveCount = result[0].Save_Count;
                }
                if (!foundHash) {
                    let popSearch = { Hash: hashedJson, Json: saveJson, Save_Count: saveCount };
                    connection.query("INSERT INTO Pop_Search SET ?", popSearch, (err, result) => {
                        if (err)
                            throw err;
                        console.log("Last insert:", result);
                        res.send({ saved_search_hash: hashedJson });
                    });
                }
                else {
                    connection.query("Update Pop_Search SET Save_count = ? WHERE Hash = ?", [saveCount + 1, hashedJson], (err, result) => {
                        if (err)
                            throw err;
                        console.log("Last insert:", result);
                        res.send({ saved_search_hash: hashedJson });
                    });
                }
                connection.release();
            });
        }
    });
});
app.get("/pop/fgdc", (req, res) => {
    console.log("get /dot/fgdc");
    let filePath = config.get("metadata_path") + "USA-NPN_Phenology_observation_data.xml";
    let file = fs.createWriteStream(filePath);
    let gitUrl = "https://raw.githubusercontent.com/usa-npn/metadata/master/USA-NPN_Phenology_observation_data.xml";
    https.get(gitUrl, (gitResponse) => {
        gitResponse.pipe(file);
        file.on("finish", () => {
            res.download(filePath, "USA-NPN_Phenology_observation_data.xml"); // Set disposition and send it.
        });
    });
});
function getServer() {
    if (config.get("protocol") === "https") {
        let certificate = fs.readFileSync(config.get("ssl_cert"));
        let privateKey = fs.readFileSync(config.get("ssl_key"));
        console.log("creating https server");
        let server = https.createServer({ key: privateKey, cert: certificate }, app);
        server.setTimeout(0);
        return server;
    }
    else {
        console.log("creating http server");
        let server = http.createServer(app);
        server.setTimeout(0);
        return server;
    }
}
let server = getServer();
server.listen(config.get("port"), () => {
    console.log("Server listening on port " + config.get("port"));
});
//# sourceMappingURL=server.js.map