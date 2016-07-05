"use strict";
const fs = require("fs");
const request = require("request");
var config = require("config");
var stream = require("stream");
var csv = require("csv");
var JSONStream = require("JSONStream");
const npnPortalParams_1 = require('./npnPortalParams');
const headerMappings_1 = require('./headerMappings');
var archiver = require('archiver');
function createSearchParametersCsv(params, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let paramsArray = [["Parameter", "Setting"]];
        for (var key in params) {
            if (key === 'species_id' || key === 'request_src' || key === 'bottom_left_x1' || key === 'bottom_left_y1' || key === 'upper_right_x2' || key === 'upper_right_y2')
                continue;
            if (params.hasOwnProperty(key) && params[key] && params[key] != [] && params[key] != '') {
                if (params[key] instanceof Array)
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key].join(', ')]);
                else
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key]]);
            }
        }
        let searchParametersCsvFileName = 'search_parameters_' + requestTimestamp.toString() + '.csv';
        let searchParametersCsvPath = config.get('save_path') + searchParametersCsvFileName;
        csv.stringify(paramsArray, (err, output) => {
            fs.appendFile(searchParametersCsvPath, output, function (err) {
                if (err) {
                    console.error("Error writing search parameters csv:  " + err.message);
                    reject(err);
                }
                else {
                    console.log("Finished writing: " + searchParametersCsvPath);
                    resolve(searchParametersCsvFileName);
                }
            });
        });
    });
}
exports.createSearchParametersCsv = createSearchParametersCsv;
function createObservationsCsv(params, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let observationsCsvFileName = 'observations_' + requestTimestamp.toString() + '.csv';
        let observationsCsvPath = config.get('save_path') + observationsCsvFileName;
        fs.writeFile(observationsCsvPath, '');
        let service_call = "";
        if (params.downloadType == 'Raw')
            service_call = 'observations/getObservations.json';
        if (params.downloadType == 'Summarized')
            service_call = 'observations/getSummarizedData.json';
        if (params.downloadType == 'Site Level Summarized')
            service_call = 'observations/getSiteLevelData.json';
        let post_url = config.get('npn_portal_path') + service_call;
        let firstRow = true;
        // make request to npn_portal
        request.post({
            headers: { 'Content-Type': 'application/json' },
            url: post_url,
            form: params
        }).on('response', (data) => {
            // incoming chunks are json objects, highWaterMark specifies how many objects to get at a time
            let objectStream = new stream.Writable({ highWaterMark: 1, objectMode: true });
            objectStream._write = (chunk, encoding, callback) => {
                // convert to csv and append to file
                csv.stringify([chunk], { header: firstRow }, (err, data) => {
                    if (firstRow) {
                        data = headerMappings_1.renameHeaders(data);
                        firstRow = false;
                    }
                    fs.appendFile(observationsCsvPath, data, (err) => {
                        if (err)
                            reject("Error writing observations CSV:  " + err.message);
                    });
                    callback();
                });
            };
            // as data comes in convert it into json objects and send it to objectStream for processing
            data.pipe(JSONStream.parse('*')).pipe(objectStream);
            data.on('close', () => {
                console.log("The connection was closed before the response was sent!");
                reject("The connection was closed before the response was sent!");
            });
            data.on('end', () => {
                console.log("Finished getting data from npn_portal");
            });
            objectStream.on('finish', () => {
                console.log("Observations CSV File is Ready");
                resolve(observationsCsvFileName);
            });
        });
    });
}
exports.createObservationsCsv = createObservationsCsv;
function createZip(filesToZip, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let zipFileName = 'observations_' + requestTimestamp.toString() + '.zip';
        let zipFilePath = config.get('save_path') + zipFileName;
        let zipStream = fs.createWriteStream(zipFilePath);
        let archive = archiver.create('zip', {});
        zipStream.on('close', function () {
            console.log('Files are zipped, notifying browser path of zipfile.');
            resolve(zipFileName);
        });
        archive.on('error', (err) => {
            throw err;
        });
        archive.pipe(zipStream);
        for (var fileName of filesToZip) {
            archive.append(fs.createReadStream(config.get('save_path') + fileName), { name: fileName });
        }
        archive.finalize();
    });
}
exports.createZip = createZip;
//# sourceMappingURL=promisified-io.js.map