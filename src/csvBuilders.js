"use strict";
var npnPortalParams_1 = require('./npnPortalParams');
var headerMappings_1 = require('./headerMappings');
var request = require("request");
var config = require('config');
var fs = require('graceful-fs');
var csvStringify = require('csv-stringify');
var JSONStream = require('JSONStream');
//import * as JSONStream from 'JSONstream';
var stream = require("stream");
function createSearchParametersCsv(params, requestTimestamp) {
    return new Promise(function (resolve, reject) {
        // filter out unused params, beautify param keys, and convert array values to comma separated strings
        var paramsArray = [["Parameter", "Setting"]];
        for (var key in params) {
            if (key === 'species_id' || key === 'additional_field' || key === 'request_src' || key === 'bottom_left_x1' || key === 'bottom_left_y1' || key === 'upper_right_x2' || key === 'upper_right_y2' || key === 'ancillary_data' || key === 'dataset_ids')
                continue;
            if (params.hasOwnProperty(key) && params[key] && params[key] != [] && params[key] != '') {
                if (params[key] instanceof Array)
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key].join(', ')]);
                else
                    paramsArray.push([npnPortalParams_1.paramNamesBeautified[key], params[key]]);
            }
        }
        // write the csv file and resolve promise with the created csv's filename
        var searchParametersCsvFileName = 'search_parameters' + requestTimestamp.toString() + '.csv';
        var searchParametersCsvPath = config.get('save_path') + searchParametersCsvFileName;
        csvStringify(paramsArray, function (err, output) {
            fs.appendFile(searchParametersCsvPath, output, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(searchParametersCsvFileName);
                }
            });
        });
    });
}
exports.createSearchParametersCsv = createSearchParametersCsv;
function createCsv(serviceCall, params, csvFileName, sheetName, observationsCsv, writeHeader, sites, individuals, observers, groups) {
    return new Promise(function (resolve, reject) {
        try {
            console.log("Building csv: " + csvFileName);
            var csvPath_1 = config.get('save_path') + csvFileName;
            fs.writeFile(csvPath_1, '', { 'flag': 'a' });
            // used to know when to write csv header row
            var firstRow_1 = writeHeader;
            var headerWrote_1 = false;
            // don't want npnportal to change things like < to &amp;&lt;
            params.noHtmlEncoding = true;
            var postUrl = config.get('npn_portal_path') + serviceCall;
            console.log("Making request to: " + postUrl);
            console.log("post params: " + JSON.stringify(params));
            request.post({
                headers: { 'Content-Type': 'application/json' },
                url: postUrl,
                form: params
            }).on('error', function (err) {
                reject(err);
            }).on('response', function (data) {
                // Incoming chunks are json objects, we pipe them through a json parser then to objectStream
                // Object stream converts the json to csv and writes the result to a csv file
                // TODO: highWaterMark specifies how many objects to get at a time. Tweak this later to improve speed?
                var objectStream = new stream.Writable({ highWaterMark: 1, objectMode: true });
                objectStream._write = function (chunk, encoding, callback) {
                    if (observationsCsv) {
                        // save some info to help produce (filter results) in other generated csv files
                        sites.add(chunk.site_id);
                        individuals.add(chunk.individual_id);
                        var observedByPersonIds = chunk.observedby_person_id;
                        if (observedByPersonIds) {
                            if (observedByPersonIds.split) {
                                for (var _i = 0, _a = observedByPersonIds.split(','); _i < _a.length; _i++) {
                                    var observerId = _a[_i];
                                    observers.add(observerId.replace(/'/g, ""));
                                }
                            }
                            else
                                observers.add(observedByPersonIds);
                        }
                        groups.add(chunk.observation_group_id);
                    }
                    csvStringify([chunk], { header: firstRow_1 }, function (err, data) {
                        if (firstRow_1) {
                            data = headerMappings_1.renameHeaders(sheetName, data);
                            headerWrote_1 = true;
                            firstRow_1 = false;
                        }
                        fs.appendFileSync(csvPath_1, data);
                        callback();
                    });
                };
                //save the last chunk so that we can log it in case of parsing error
                var lastRetrievedChunk = '';
                data.on('data', function (dd) {
                    lastRetrievedChunk += dd.toString();
                    console.log('hello' + dd);
                });
                var jsonParser = JSONStream.parse('*');
                jsonParser.on('error', function (err) {
                    reject(err.stack + ' lastchunk = ' + lastRetrievedChunk);
                });
                data.pipe(jsonParser).pipe(objectStream);
                data.on('close', function () {
                    reject("The connection was closed before the response was sent!");
                });
                data.on('end', function () {
                    console.log("Finished getting data from npn_portal");
                });
                objectStream.on('finish', function () {
                    resolve([csvFileName, headerWrote_1]);
                });
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.createCsv = createCsv;
