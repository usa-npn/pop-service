import {NpnPortalParams, paramNamesBeautified} from "./npnPortalParams";
import {renameHeaders} from "./headerMappings";
import * as request from "request";
import * as config from "config";
import * as fs from "graceful-fs";
import * as csvStringify from "csv-stringify";
let JSONStream = require("JSONStream");
let stream = require("stream");

export function createSearchParametersCsv(params: NpnPortalParams, requestTimestamp: number) {
  return new Promise<string>((resolve, reject) => {
    // filter out unused params, beautify param keys, and convert array values to comma separated strings
    let paramsArray: any[][] = [["Parameter", "Setting"]];
    for (let key in params) {
      if (key === "species_id" || key === "additional_field" || key === "request_src" || key === "bottom_left_x1" || key === "bottom_left_y1" || key === "upper_right_x2" || key === "upper_right_y2" || key === "ancillary_data" || key === "dataset_ids")
        continue;
      if (params.hasOwnProperty(key) && params[key] && params[key] !== [] && params[key] !== "") {
        if (params[key] instanceof Array)
          paramsArray.push([paramNamesBeautified[key], (<string[]>params[key]).join(", ")]);
        else
          paramsArray.push([paramNamesBeautified[key], params[key]]);
      }
    }
    // write the csv file and resolve promise with the created csv's filename
    let searchParametersCsvFileName = "search_parameters" + requestTimestamp.toString() + ".csv";
    let searchParametersCsvPath = config.get("save_path") + searchParametersCsvFileName;
    csvStringify(paramsArray, (err: any, output: any) => {
      fs.appendFile(searchParametersCsvPath, output, function(err: any) {
        if (err) {
          reject(err);
        } else {
          resolve(searchParametersCsvFileName);
        }
      });
    });
  });
}

export function createCitationURLCsv(url : string, title: string, doi : string, range: string, requestTimestamp: number){
    return new Promise<string>((resolve, reject) => {
        let citationCsvFileName = "citation" + requestTimestamp.toString() + ".csv";
        let fullPath = config.get("save_path") + citationCsvFileName;
        
        let currentDate = new Date(requestTimestamp);
        
        let citationString = "USA National Phenology Network. ";
        citationString += "2017. ";
        citationString += title + ". ";
        citationString += "Region: " + range + ". ";
        citationString += url + " . ";
        citationString += "USA-NPN, Tucson, Arizona, USA. ";
        citationString += "Data set accessed " + currentDate.getFullYear() + "-" + (currentDate.getMonth()+1) + "-" + currentDate.getDate() + ". ";
        citationString += doi;
        
        
        let inputArray: string[][] = [[citationString, ""]];
        
        csvStringify(inputArray, (err: any, output: any) => {
            fs.appendFile(fullPath, output, function(err: any) {
                if(err){
                    reject(err);
                }else{
                    resolve(citationCsvFileName);
                }
            })
        })
    });
}


export function createCsv(serviceCall: string, params: any, csvFileName: string, sheetName: string, observationsCsv: boolean, writeHeader: boolean,
                          sites: Set<number>, individuals: Set<number>, observers: Set<number>, groups: Set<number>) {

  return new Promise<[string, boolean]>((resolve, reject) => {
    try {
      console.log("Building csv: " + csvFileName);
      let csvPath = config.get("save_path") + csvFileName;
      fs.writeFileSync(csvPath, "",  {"flag": "a"});

      // used to know when to write csv header row
      let firstRow = writeHeader;
      let headerWrote = false;

      // don't want npnportal to change things like < to &amp;&lt;
      params.noHtmlEncoding = true;

      // used for debugging
      let lastRetrievedChunk = "";
      let chunkCount = 0;
      let jsonObjectCount = 0;

      // converts incoming chunked json string into json objects
      let jsonParser = JSONStream.parse("*");
      // buffers incoming data from npn_portal, need this because pausing the response stream causes data loss
      let bufferStream = new stream.Transform();
      bufferStream._transform = function (chunk: any, encoding: string, callback: Function) {
        this.push(chunk);
        callback();
      };
      // converts json objects to csv rows
      let csvStream = new stream.Transform({objectMode: true});
      csvStream._transform = function (chunk: any, encoding: string, callback: Function) {
        // saves sites, individuals, observers, groups, etc from incoming objects into arrays for use in other reports
        jsonObjectCount += 1;
        if (observationsCsv) {
          // save some info to help produce (filter results) in other generated csv files
          sites.add(chunk.site_id);
          individuals.add(chunk.individual_id);
          let observedByPersonIds = chunk.observedby_person_id;
          if (observedByPersonIds) {
            if (observedByPersonIds.split) {
              for (let observerId of observedByPersonIds.split(",")) {
                observers.add(<number> observerId.replace(/'/g, ""));
              }
            }
            else
              observers.add(observedByPersonIds);
          }
          groups.add(chunk.observation_group_id);
        }
        csvStringify([chunk], {header: firstRow}, (err: any, data: any) => {
          if (err) {
            console.log("csvStringify Error" + err);
            reject(err);
          }
          if (firstRow) {
            data = renameHeaders(sheetName, data);
            headerWrote = true;
            firstRow = false;
          }
          this.push(data);
          callback();
        });
      };
      // writes the csv rows to disk
      let writeStream = fs.createWriteStream(csvPath, {flags: "a"});
      // all the stream events we listen for
      bufferStream.on("error", (err: any) => {
        console.log("bufferStream error: " + err);
        reject(err);
      });
      jsonParser.on("error", (err: any) => {
        console.log("jsonParser error: " + err.stack);
        reject(err.stack + " lastchunk = " + lastRetrievedChunk);
      });
      writeStream.on("error", (err: any) => {
        console.log("objectStream error: " + err);
        reject(err);
      });
      writeStream.on("finish", () => {
        console.log("jsonObjectCount: " + jsonObjectCount);
        console.log("finish event called: resolving");
        resolve([csvFileName, headerWrote]);
      });
      // compose all the streams together
      bufferStream.pipe(jsonParser).pipe(csvStream).pipe(writeStream);
      // make the npn_portal request
      let postUrl = config.get("npn_portal_path") + serviceCall;
      console.log("Making request to: " + postUrl);
      console.log("post params: " + JSON.stringify(params));
      request.post({
        headers: {"Content-Type": "application/json"},
        url: postUrl,
        form: params
      }).on("error", function(err) {
        reject(err);
      }).on("response", function (res) {
        console.log("beginning to receive data from npn_portal");
        res.on("close", () => {
          console.log("The connection was closed before the response was sent!");
          reject("The connection was closed before the response was sent!");
        });
        res.on("end", () => {
          console.log("finished receiving data from npn_portal");
          console.log("chunks received: " + chunkCount);
          console.log("last chunk received: ");
          console.log(lastRetrievedChunk);
          // signals that no more data will be written to the bufferStream
          bufferStream.end();
        });
        // by listening to on data, we start a push stream (like a water tap: once you open it, it keeps gushing water.)
        res.on("data", function (chunk: any) {
          chunkCount += 1;
          // here we push the data onto the bufferStream as it comes in
          // from there we can use piping to pull the data through each stream as needed
          bufferStream.write(chunk);
        });
      });
    } catch (error) {
      console.log("caught an error: " + error);
      reject(error);
    }
  });
}