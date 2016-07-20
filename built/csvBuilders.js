"use strict";
const request = require("request");
var config = require("config");
var stream = require("stream");
var csv = require("csv");
var JSONStream = require("JSONStream");
const npnPortalParams_1 = require('./npnPortalParams');
const headerMappings_1 = require('./headerMappings');
var fs = require('graceful-fs');
exports.sites = new Set();
exports.individuals = new Set();
exports.observers = new Set();
exports.groups = new Set();
exports.phenophases = new Set();
exports.datasets = new Set();
function createSearchParametersCsv(params, requestTimestamp) {
    return new Promise((resolve, reject) => {
        // filter out unused params, beautify param keys, and convert array values to comma separated strings
        let paramsArray = [["Parameter", "Setting"]];
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
        let searchParametersCsvFileName = 'search_parameters_' + requestTimestamp.toString() + '.csv';
        let searchParametersCsvPath = config.get('save_path') + searchParametersCsvFileName;
        csv.stringify(paramsArray, (err, output) => {
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
function createCsv(serviceCall, params, csvFileName, observationsCsv, writeHeader) {
    return new Promise((resolve, reject) => {
        try {
            console.log("Building csv: " + csvFileName);
            let csvPath = config.get('save_path') + csvFileName;
            fs.writeFile(csvPath, '', { 'flag': 'a' });
            // used to know when to write csv header row
            let firstRow = writeHeader;
            let headerWrote = false;
            let postUrl = config.get('npn_portal_path') + serviceCall;
            console.log("Making request to: " + postUrl);
            console.log("post params: " + JSON.stringify(params));
            request.post({
                headers: { 'Content-Type': 'application/json' },
                url: postUrl,
                form: params
            }).on('error', function (err) {
                reject(err);
            }).on('response', (data) => {
                // Incoming chunks are json objects, we pipe them through a json parser then to objectStream
                // Object stream converts the json to csv and writes the result to a csv file
                // TODO: highWaterMark specifies how many objects to get at a time. Tweak this later to improve speed?
                let objectStream = new stream.Writable({ highWaterMark: 1, objectMode: true });
                objectStream._write = (chunk, encoding, callback) => {
                    if (observationsCsv) {
                        // save some info to produce other csv files
                        exports.sites.add(chunk.site_id);
                        exports.individuals.add(chunk.individual_id);
                        let observedByPersonIds = chunk.observedby_person_id;
                        if (observedByPersonIds) {
                            if (observedByPersonIds.split) {
                                for (var observerId of observedByPersonIds.split(',')) {
                                    exports.observers.add(observerId.replace(/'/g, ""));
                                }
                            }
                            else
                                exports.observers.add(observedByPersonIds);
                        }
                        exports.groups.add(chunk.observation_group_id);
                        exports.phenophases.add(chunk.phenophase_id);
                        exports.datasets.add(chunk.dataset_id);
                    }
                    csv.stringify([chunk], { header: firstRow }, (err, data) => {
                        if (firstRow) {
                            if (observationsCsv)
                                data = headerMappings_1.renameHeaders(data);
                            headerWrote = true;
                            firstRow = false;
                        }
                        fs.appendFileSync(csvPath, data);
                        callback();
                    });
                };
                data.pipe(JSONStream.parse('*')).pipe(objectStream);
                data.on('close', () => {
                    reject("The connection was closed before the response was sent!");
                });
                data.on('end', () => {
                    console.log("Finished getting data from npn_portal");
                });
                objectStream.on('finish', () => {
                    resolve([csvFileName, headerWrote]);
                });
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.createCsv = createCsv;
//# sourceMappingURL=csvBuilders.js.map