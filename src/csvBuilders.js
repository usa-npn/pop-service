"use strict";
var fs = require("fs");
var request = require("request");
var config = require("config");
var stream = require("stream");
var csv = require("csv");
var JSONStream = require("JSONStream");
var npnPortalParams_1 = require('./npnPortalParams');
var headerMappings_1 = require('./headerMappings');
function createSearchParametersCsv(params, requestTimestamp) {
    return new Promise(function (resolve, reject) {
        // filter out unused params, beautify param keys, and convert array values to comma separated strings
        var paramsArray = [["Parameter", "Setting"]];
        for (var key in params) {
            if (key === 'species_id' || key === 'additional_field' || key === 'request_src' || key === 'bottom_left_x1' || key === 'bottom_left_y1' || key === 'upper_right_x2' || key === 'upper_right_y2')
                continue;
            if (params.hasOwnProperty(key) && params[key] && params[key] != [] && params[key] != '') {
                if (params[key] instanceof Array)
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key].join(', ')]);
                else
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key]]);
            }
        }
        // write the csv file and resolve promise with the created csv's filename
        var searchParametersCsvFileName = 'search_parameters_' + requestTimestamp.toString() + '.csv';
        var searchParametersCsvPath = config.get('save_path') + searchParametersCsvFileName;
        csv.stringify(paramsArray, function (err, output) {
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
    return new Promise(function (resolve, reject) {
        var observationsCsvFileName = 'observations_' + requestTimestamp.toString() + '.csv';
        var observationsCsvPath = config.get('save_path') + observationsCsvFileName;
        fs.writeFile(observationsCsvPath, '');
        // used to know when to write csv header row
        var firstRow = true;
        // make appropriate npn portal request
        var service_call = "";
        if (params.downloadType == 'Raw')
            service_call = 'observations/getObservations.json';
        if (params.downloadType == 'Individual-Level Summarized')
            service_call = 'observations/getSummarizedData.json';
        if (params.downloadType == 'Site-Level Summarized')
            service_call = 'observations/getSiteLevelData.json';
        var post_url = config.get('npn_portal_path') + service_call;
        request.post({
            headers: { 'Content-Type': 'application/json' },
            url: post_url,
            form: params
        }).on('response', function (data) {
            // Incoming chunks are json objects, we pipe them through a json parser then to objectStream
            // Object stream converts the json to csv and writes the result to a csv file
            // TODO: highWaterMark specifies how many objects to get at a time. Tweak this later to improve speed?
            var objectStream = new stream.Writable({ highWaterMark: 1, objectMode: true });
            objectStream._write = function (chunk, encoding, callback) {
                csv.stringify([chunk], { header: firstRow }, function (err, data) {
                    if (firstRow) {
                        data = headerMappings_1.renameHeaders(data);
                        firstRow = false;
                    }
                    fs.appendFile(observationsCsvPath, data, function (err) {
                        if (err)
                            reject("Error writing observations CSV:  " + err.message);
                    });
                    callback();
                });
            };
            data.pipe(JSONStream.parse('*')).pipe(objectStream);
            data.on('close', function () {
                console.log("The connection was closed before the response was sent!");
                reject("The connection was closed before the response was sent!");
            });
            data.on('end', function () {
                console.log("Finished getting data from npn_portal");
            });
            objectStream.on('finish', function () {
                console.log("Finished writing bservations csv file");
                resolve(observationsCsvFileName);
            });
        });
    });
}
exports.createObservationsCsv = createObservationsCsv;
