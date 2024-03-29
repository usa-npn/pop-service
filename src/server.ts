import { createSearchParametersCsv, createCsv, createCitationURLCsv } from "./csvBuilders";
import { createZip, zipGeoserverData } from "./zipBuilder";
import { getNpnPortalParams } from "./npnPortalParams";
import * as express from "express";
import * as moment from "moment";
import * as bunyan from "bunyan";
import * as morgan from "morgan";
import * as fs from "graceful-fs";
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
const mysql = require('mysql2');
import * as config from "config";
import * as util from "util";
import * as path from "path";
// import request = require("request");
// import * as http from 'http';  //not using because won't allow server.setTimeout(0);
// import * as https from 'https';
let http = require("http");
let https = require("https");
var cors = require('cors');


let pool      =    mysql.createPool({
    connectionLimit : 20,
    host     : config.get("mysql_host") as string,
    user     : config.get("mysql_user") as string,
    password : config.get("mysql_password") as string,
    database : config.get("mysql_database") as string,
    ssl  : {
        ca : fs.readFileSync(config.get("cert_path")),
	rejectUnauthorized: false
    },
    debug    :  false
});

let app = express();
app.use(cors());
app.options('*', cors());

// allows us to consume json from post requests
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));

// create a write stream (in append mode) and set up a log to record requests
let accessLogStream = fs.createWriteStream(path.join(config.get("logs_path").toString(), "access.log"), {flags: "a"});
app.use(morgan("combined", {stream: accessLogStream}));

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

process.on("uncaughtException", (err: any) => {
    log.error(err, "Something Broke!.");
    console.error(err.stack);
});

// app.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Connection, Keep-Alive");
//     next();
// });

// note: don't remove unused parameter next... things will break
app.use((err: any, req: any, res: any, next: any) => {
    log.error(err, "Something broke!.");
    console.error(err);
    res.send({download_path: "error"});

    // console.error(err.stack);
    // res.status(500).send('Something broke!');
});

function convertSetToArray(set: Set<any>) {
    let array: any[] = [];
    set.forEach((item) => array.push(item));
    return array;
}


function getObservationsServiceCall(reportType: string): string {
    if (reportType === "Status and Intensity"){
        return "observations/getObservations.json";
    }
    
    if (reportType === "Individual Phenometrics"){
        return "observations/getSummarizedData.json";
    }
    
    if (reportType === "Site Phenometrics"){
        return "observations/getSiteLevelData.json";
    }
    
    if(reportType === "Magnitude Phenometrics"){
        return "observations/getMagnitudeData.json";
    }
}

async function getZippedData(req: any, requestTimestamp: number) {
    try {
        let params = getNpnPortalParams(req);

        log.info(params, "Data Request made with these params");

        let sites: Set<number> = new Set();
        let individuals: Set<number> = new Set();
        let observers: Set<number> = new Set();
        let groups: Set<number> = new Set();

        let csvFileNames: string[] = [];
        csvFileNames.push(await createSearchParametersCsv(params, requestTimestamp));

        if (params.downloadType !== "Status and Intensity") {
            // for summarized data reports we need to chunk our requests in yearly intervals
            let startDate = moment(params.start_date, "YYYY-MM-DD");
            let endDate = moment(params.end_date, "YYYY-MM-DD");
            let tempStartDate = moment(startDate);
            let tempEndDate = moment(startDate).add(1, "years");
            let writeHeader: boolean = true;
            let headerWrote: boolean = false;
            let sheetName: string;
            
            if (params.downloadType === "Individual Phenometrics") {
                sheetName = "individual_phenometrics_data";
            }
            else if(params.downloadType === "Magnitude Phenometrics"){
                sheetName = "magnitude_phenometrics_data";
                tempEndDate.subtract(1, "days");
            }else{
                sheetName = "site_phenometrics_data";
            }

            while (tempEndDate.isBefore(endDate)) {
                params.start_date = tempStartDate.format("YYYY-MM-DD");
                params.end_date = tempEndDate.format("YYYY-MM-DD");

                headerWrote = (await createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + ".csv", "observation", true, writeHeader, sites, individuals, observers, groups))[1];

                tempStartDate.add(1, "years");
                tempEndDate.add(1, "years");
                if (headerWrote)
                    writeHeader = false;
            }
            params.start_date = tempStartDate.format("YYYY-MM-DD");
            params.end_date = endDate.format("YYYY-MM-DD");

            csvFileNames.push((await createCsv(getObservationsServiceCall(params.downloadType), params, sheetName + requestTimestamp.toString() + ".csv", "observation", true, writeHeader, sites, individuals, observers, groups))[0]);
            
        }else{
            csvFileNames.push((await createCsv(getObservationsServiceCall(params.downloadType), params, "status_intensity_observation_data" + requestTimestamp.toString() + ".csv", "observation", true, true, sites, individuals, observers, groups))[0]);
        }
        if (params.ancillary_data) {
            if (params.ancillary_data.indexOf("Sites") !== -1)
                csvFileNames.push((await createCsv("stations/getStationDetails.json", { "ids": convertSetToArray(sites).toString(), "no_live": true}, "ancillary_site_data" + requestTimestamp.toString() + ".csv", "station", false, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data.indexOf("Individual Plants") !== -1)
                csvFileNames.push((await createCsv("individuals/getPlantDetails.json", {"individual_id": convertSetToArray(individuals)}, "ancillary_individual_plant_data" + requestTimestamp.toString() + ".csv", "individual", false, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data.indexOf("Observers") !== -1)
                csvFileNames.push((await createCsv("person/getObserverDetails.json", {"person_id": convertSetToArray(observers)}, "ancillary_person_data" + requestTimestamp.toString() + ".csv", "observer", false, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data.indexOf("Site Visit Details") !== -1)
                csvFileNames.push((await createCsv("observations/getObservationGroupDetails.json", {"observation_group_id": convertSetToArray(groups)}, "ancillary_site_visit_data" + requestTimestamp.toString() + ".csv", "obs_group", false, true, sites, individuals, observers, groups))[0]);
            if (params.ancillary_data.indexOf("Protocols (7 files)") !== -1) {
                csvFileNames.push((await createCsv("phenophases/getSpeciesProtocolDetails.json", {}, "ancillary_species_protocol_data" + requestTimestamp.toString() + ".csv", "species_protocol", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("phenophases/getProtocolDetails.json", {}, "ancillary_protocol_data" + requestTimestamp.toString() + ".csv", "protocol", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("phenophases/getPhenophaseDetails.json", {}, "ancillary_phenophase_data" + requestTimestamp.toString() + ".csv", "phenophase", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("phenophases/getSecondaryPhenophaseDetails.json", {}, "ancillary_species-specific_info_data" + requestTimestamp.toString() + ".csv", "sspi", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("phenophases/getAbundanceDetails.json", {}, "ancillary_intensity_data" + requestTimestamp.toString() + ".csv", "intensity", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("observations/getDatasetDetails.json", {}, "ancillary_dataset_data" + requestTimestamp.toString() + ".csv", "dataset", false, true, sites, individuals, observers, groups))[0]);
                csvFileNames.push((await createCsv("phenophases/getPhenophaseDefinitionDetails.json", {}, "ancillary_phenophase_definition_data" + requestTimestamp.toString() + ".csv", "phenophase_definition", false, true, sites, individuals, observers, groups))[0]);
            }
        }
        
        let zipFileName = await createZip(params.downloadType, csvFileNames, requestTimestamp);
        // remove csv files that were just zipped
        for (let csvFile of csvFileNames) {
            fs.unlink(config.get(`save_path`) + csvFile, (err: any) => {
                if (err) throw err;
            });
        }
        // remove old zip files
        let filesInDownloadsDirectory = fs.readdirSync(config.get("save_path") as string);
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
                    fs.unlink(filePath, (err: any) => {
                        if (err) throw err;
                    });
                }
            }
        }

        log.info("Sending " + zipFileName + " to the client");
        return {download_path: config.get("server_path") + zipFileName};
    } catch (error) {
        log.error(error, "Could not produce zip file.");
        console.error(error);
        return {download_path: "error"};
    }
}


function getResource(url : string, prefix : string, extension: string, requestTimestamp : number){
    return new Promise<string>( (resolve, reject) => {
        let fileName = prefix + requestTimestamp + "." + extension;
        let filePath = config.get("save_path") + fileName;
        let file = fs.createWriteStream(filePath);


        https.get(url, (metaResponse: any) => {
            metaResponse.pipe(file);

            metaResponse.on('end', () => {
               resolve(fileName); 
            });
        });   
    });
}

function resolveResourceExtension(mime : string){
    let ext = "png"
    switch(mime){
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

function validateInput(req : any){

    let regex = new RegExp("^https?:\/\/[a-zA-Z-]+\.usanpn\.org\/[a-zA-Z0-9/\(\)\+\"-\?=\&:]+", 'i');
    return regex.test(req.body.resource_url) && 
    regex.test(req.body.citation_url) && 
    regex.test(req.body.metadata_url);

}


async function getCitationData(req: any) {
    
    //let valid = validateInput(req);
    let valid = true;
    if(valid){
    
        let requestTimestamp = Date.now();    
        let citation = createCitationURLCsv(req.body.citation_url, req.body.layer_title, req.body.doi, req.body.range, requestTimestamp);
        let ext = resolveResourceExtension(req.body.mime);    
        let dataPromise = getResource(req.body.resource_url, "data", ext, requestTimestamp);
        let metadataPromise = getResource(req.body.metadata_url, "metadata", "xml", requestTimestamp);
        let zipFile : string;
        zipFile = await Promise.all([dataPromise, metadataPromise, citation]).then(values => {
            return zipGeoserverData(values,requestTimestamp);
        });

        return zipFile;
    }else{
        return null;
    }
    

}



app.post("/grb/package", (req, res) => {
    
    let zipName = getCitationData(req).then( (zip) => {
        res.setHeader("Content-Type", "application/json");
        zip = config.get("server_path") + zip;
        res.send(JSON.stringify({download_path: zip}));
    });
    

});

let popRequestStatus = new Map();

app.post("/download", (req, res) => {
    console.log("in /dot/download");
    let requestTimestamp = Date.now();
    let zipName = "datasheet_" + requestTimestamp.toString() + ".zip";
    popRequestStatus.set(zipName, false);
    res.setHeader("Content-Type", "application/json");
    res.send({zip_file_name: zipName});
    getZippedData(req, requestTimestamp)
      .then(zipFile => {
        log.info(zipFile + " complete");
        popRequestStatus.set(zipName, true);
      })
      .catch(err => {
          log.error("error creating " + zipName);
          log.error(err);
      });
});

app.get("/downloadstatus", (req, res) => {
    console.log("in /dot/downloadstatus");
    try {
        let zipFileName = req.query.zipFileName;
        let completeStatus = false;
        if(popRequestStatus.get(zipFileName) 
            && fs.existsSync(String(config.get("save_path")) + zipFileName)) {
            completeStatus = true;
        }
        return res.send({
                file_complete: completeStatus,
                download_path: String(config.get("server_path")) + zipFileName
            });
    } catch (error) {
        log.error(error, "Could not check zip file status.");
        console.error(error);
        return res.send({file_complete: false});
    }
});

app.get("/search", (req, res) => {

    console.log("get /dot/search");
    let hashedJson = req.query.searchId;
    pool.getConnection((err: any, connection: any) => {
        if (err) {
            console.error(err);
            res.send(null);
        }
        else {
            connection.query("SELECT JSON from Pop_Search WHERE Hash = ?", hashedJson, (err: any, result: any) => {
                if (err) throw err;
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

app.post("/search", (req, res) => {
    console.log("post /dot/search");
    // CREATE TABLE usanpn2.Pop_Search (Search_ID INT(11) NOT NULL AUTO_INCREMENT, Hash TEXT, Json TEXT, Save_Count INT(11), PRIMARY KEY(Search_ID));
    let foundHash = false;
    let saveCount = 1;
    let saveJson = JSON.stringify(req.body.searchJson);
    let hashedJson = crypto.createHash("md5").update(saveJson).digest("hex");
    pool.getConnection((err: any, connection: any) => {
        if (err) {
            console.error(err);
            res.send(null);
            connection.release();
        }
        else {
            connection.query("SELECT * from Pop_Search WHERE Hash = ?", hashedJson, (err: any, result: any) => {
                if (err) throw err;
                if (result[0]) {
                    foundHash = true;
                    saveCount = result[0].Save_Count;
                }
                if (!foundHash) {
                    let popSearch = {Hash: hashedJson, Json: saveJson, Save_Count: saveCount};
                    connection.query("INSERT INTO Pop_Search SET ?", popSearch, (err: any, result: any) => {
                        if (err) throw err;
                        console.log("Last insert:", result);
                        res.send({saved_search_hash: hashedJson});
                    });
                }
                else {
                    connection.query("Update Pop_Search SET Save_count = ? WHERE Hash = ?", [saveCount + 1, hashedJson], (err: any, result: any) => {
                        if (err) throw err;
                        console.log("Last insert:", result);
                        res.send({saved_search_hash: hashedJson});
                    });
                }
                connection.release();
            });
        }
    });
});

app.get("/fgdc", (req, res) => {
    console.log("get /dot/fgdc");
    let filePath = config.get("metadata_path") + "USA-NPN_Phenology_observation_data.xml";
    let file = fs.createWriteStream(filePath);
    let gitUrl = "https://raw.githubusercontent.com/usa-npn/metadata/master/USA-NPN_Phenology_observation_data.xml";
    https.get(gitUrl, (gitResponse: any) => {
        gitResponse.pipe(file);
        file.on("finish", () => {
            res.download(filePath, "USA-NPN_Phenology_observation_data.xml"); // Set disposition and send it.
        });
    });
});

function getServer(): any {
    if (config.get("protocol") === "https" ) {
        let certificate = fs.readFileSync(config.get("ssl_cert") as string);
        let privateKey = fs.readFileSync(config.get("ssl_key") as string);
        let chain = fs.readFileSync(config.get("ssl_chain") as string);
        console.log("creating https server");
        let server = https.createServer({
            key: privateKey, 
            cert: certificate,
            ca: chain
        }, app);
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
