import * as request from "request";
var config = require("config");
var stream = require("stream");
var csv = require("csv");
var JSONStream = require("JSONStream");
import {NpnPortalParams, paramNamesBeautified} from './npnPortalParams';
import {renameHeaders} from './headerMappings';
var fs = require('graceful-fs');

export var sites:Set<number> = new Set();
export var individuals:Set<number> = new Set();
export var observers:Set<number> = new Set();
export var groups:Set<number> = new Set();
export var phenophases:Set<number> = new Set();
export var datasets:Set<number> = new Set();

export function createSearchParametersCsv(params: NpnPortalParams, requestTimestamp: number) {
  return new Promise<string>((resolve, reject) => {
    // filter out unused params, beautify param keys, and convert array values to comma separated strings
    let paramsArray: any[][] = [["Parameter", "Setting"]];
    for (var key in params) {
      if(key === 'species_id' || key === 'additional_field' || key === 'request_src' || key === 'bottom_left_x1' || key === 'bottom_left_y1' || key === 'upper_right_x2' || key === 'upper_right_y2' || key === 'ancillary_data' || key === 'dataset_ids')
        continue;
      if (params.hasOwnProperty(key) && params[key] && params[key] != [] && params[key] != '') {
        if (params[key] instanceof Array)
          paramsArray.push([paramNamesBeautified[key], (<string[]>params[key]).join(', ')]);
        else
          paramsArray.push([paramNamesBeautified[key], params[key]]);
      }
    }
    // write the csv file and resolve promise with the created csv's filename
    let searchParametersCsvFileName = 'search_parameters_' + requestTimestamp.toString() + '.csv';
    let searchParametersCsvPath = config.get('save_path') + searchParametersCsvFileName;
    csv.stringify(paramsArray, (err: any, output: any) => {
      fs.appendFile(searchParametersCsvPath, output, function(err: any) {
        if (err) {
          reject(err);
        } else {
          resolve(searchParametersCsvFileName);
        }
      })
    });
  });
}

export function createCsv(serviceCall: string, params: any, csvFileName: string, observationsCsv: boolean, writeHeader: boolean) {
  return new Promise<[string, boolean]>((resolve, reject) => {
    try {
      console.log("Building csv: " + csvFileName);
      let csvPath = config.get('save_path') + csvFileName;
      fs.writeFile(csvPath, '',  {'flag':'a'});

      // used to know when to write csv header row
      let firstRow = writeHeader;
      let headerWrote = false;

      let postUrl = config.get('npn_portal_path') + serviceCall;
      console.log("Making request to: " + postUrl);
      console.log("post params: " + JSON.stringify(params));
      request.post({
        headers: {'Content-Type': 'application/json'},
        url: postUrl,
        form: params
      }).on('error', function(err) {
        reject(err);
      }).on('response', (data) => {
        // Incoming chunks are json objects, we pipe them through a json parser then to objectStream
        // Object stream converts the json to csv and writes the result to a csv file
        // TODO: highWaterMark specifies how many objects to get at a time. Tweak this later to improve speed?

        let objectStream = new stream.Writable({highWaterMark: 1, objectMode: true});
        objectStream._write = (chunk:any, encoding:string, callback:Function) => {

          if (observationsCsv) {
            // save some info to produce other csv files
            sites.add(chunk.site_id);
            individuals.add(chunk.individual_id);
            let observedByPersonIds = chunk.observedby_person_id;
            if (observedByPersonIds) {
              if (observedByPersonIds.split) {
                for(var observerId of observedByPersonIds.split(',')) {
                  observers.add(<number> observerId.replace(/'/g, ""));
                }
              }
              else
                observers.add(observedByPersonIds);
            }
            groups.add(chunk.observation_group_id);
            phenophases.add(chunk.phenophase_id);
            datasets.add(chunk.dataset_id);
          }

          csv.stringify([chunk], {header: firstRow}, (err:any, data:any) => {
            if (firstRow) {
              if(observationsCsv)
                data = renameHeaders(data);
              headerWrote = true;
              firstRow = false;
            }
            fs.appendFileSync(csvPath, data);
            callback();
          });
        };
        // data.on('data', (dd: any) => console.log('hello' + dd));
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
    } catch(error) {
      reject(error);
    }
  });
}