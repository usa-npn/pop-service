import {NpnPortalParams, paramNamesBeautified} from "./npnPortalParams";
import {renameHeaders} from "./headerMappings";
import * as request from "request";
import * as config from "config";
import * as fs from "graceful-fs";
import * as csvStringify from "csv-stringify";
let JSONStream = require("JSONStream");
// import * as JSONStream from 'jsonstream';
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


export function createCsv(serviceCall: string, params: any, csvFileName: string, sheetName: string, observationsCsv: boolean, writeHeader: boolean,
                          sites: Set<number>, individuals: Set<number>, observers: Set<number>, groups: Set<number>) {

  return new Promise<[string, boolean]>((resolve, reject) => {
    try {
      console.log("Building csv: " + csvFileName);
      let csvPath = config.get("save_path") + csvFileName;
      let rawPath = csvPath + "_json";
      fs.writeFileSync(csvPath, "",  {"flag": "a"});
      fs.writeFileSync(rawPath, "",  {"flag": "a"});

      // used to know when to write csv header row
      let firstRow = writeHeader;
      let headerWrote = false;

      // don't want npnportal to change things like < to &amp;&lt;
      params.noHtmlEncoding = true;

      let chunkCount = 0;
      let jsonObjectCount = 0;

      let jsonParser = JSONStream.parse("*");
      // let objectStream = new stream.Writable({highWaterMark: 1, objectMode: true});
      let transformStream = new stream.Transform({highWaterMark: 1, objectMode: true});
      let csvStream = new stream.Transform({highWaterMark: 1, objectMode: true});
      let syncStream = fs.createWriteStream(rawPath);
      let writeStream = fs.createWriteStream(csvPath);
      transformStream._transform = function (chunk: any, encoding: string, callback: Function) {
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
        this.push(chunk);
        callback();
      };
      csvStream._transform = function (chunk: any, encoding: string, callback: Function) {
        let that = this;
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
          that.push(data);
          callback();
        });
      };
      let postUrl = config.get("npn_portal_path") + serviceCall;
      console.log("Making request to: " + postUrl);
      console.log("post params: " + JSON.stringify(params));
      request.post({
        headers: {"Content-Type": "application/json", "Connection": "Keep-alive"},
        timeout: 9000000,
        forever: true,
        url: postUrl,
        form: params
      }).on("error", function(err) {
        reject(err);
      }).on("response", function (res) {
        console.log("creating raw output file");
        // let fd = fs.openSync("/home/jswitzer/raw_data.txt", "a");
        // save the last chunk so that we can log it in case of parsing error
        let lastRetrievedChunk = "";
        // res.on("data", function (chunk: any) {
        //   chunkCount += 1;
        //   fs.writeSync(fd, chunk.toString());
        //   lastRetrievedChunk = chunk.toString();
        //   // console.log('hello' + chunk);
        // });
        jsonParser.on("error", (err: any) => {
          console.log("jsonParser error: " + err.stack);
          reject(err.stack + " lastchunk = " + lastRetrievedChunk);
        });
        res.on("close", () => {
          console.log("The connection was closed before the response was sent!");
          reject("The connection was closed before the response was sent!");
        });
        res.on("end", () => {
          console.log("chunkCount: " + chunkCount);
          console.log(lastRetrievedChunk);
          console.log("Finished getting data from npn_portal");
        });
        syncStream.on("finish", () => {
          console.log("finished retrieving npn_portal results");
          let readStream = fs.createReadStream(rawPath);
          readStream.pipe(jsonParser).pipe(transformStream).pipe(csvStream).pipe(writeStream);
          resolve([csvFileName, headerWrote]);
        });
        writeStream.on("error", (err: any) => {
          console.log("objectStream error: " + err);
        });
        writeStream.on("finish", () => {
          console.log("jsonObjectCount: " + jsonObjectCount);
          console.log("finish event called: resolving");
          resolve([csvFileName, headerWrote]);
        });
        res.pipe(syncStream);
      });
    } catch (error) {
      console.log("caught an error: " + error);
      reject(error);
    }
  });
}