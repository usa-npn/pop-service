"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const archiver = require("archiver");
const config = require("config");
const fs = require("graceful-fs");
function createZip(downloadType, filesToZip, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let zipFileName = "datasheet_" + requestTimestamp.toString() + ".zip";
        let zipFilePath = config.get("save_path") + zipFileName;
        let zipStream = fs.createWriteStream(zipFilePath);
        let archive = archiver.create("zip", {});
        zipStream.on("close", function () {
            console.log("All files are zipped!");
            resolve(zipFileName);
        });
        archive.on("error", (err) => {
            reject(err);
        });
        archive.pipe(zipStream);
        for (let fileName of filesToZip) {
            let fileNameWithoutTimestamp = fileName.replace(/[0-9]/g, "");
            archive.append(fs.createReadStream(config.get("save_path") + fileName), { name: fileNameWithoutTimestamp });
        }
        if (downloadType === "Status and Intensity" && fs.existsSync(config.get("metadata_path") + "status_intensity_datafield_descriptions.xlsx")) {
            archive.append(fs.createReadStream(config.get("metadata_path") + "status_intensity_datafield_descriptions.xlsx"), { name: "status_intensity_datafield_descriptions.xlsx" });
        }
        else if (downloadType === "Site Phenometrics" && fs.existsSync(config.get("metadata_path") + "site_phenometrics_datafield_descriptions.xlsx")) {
            archive.append(fs.createReadStream(config.get("metadata_path") + "site_phenometrics_datafield_descriptions.xlsx"), { name: "site_phenometrics_datafield_descriptions.xlsx" });
        }
        else if (downloadType === "Individual Phenometrics" && fs.existsSync(config.get("metadata_path") + "individual_phenometrics_datafield_descriptions.xlsx")) {
            archive.append(fs.createReadStream(config.get("metadata_path") + "individual_phenometrics_datafield_descriptions.xlsx"), { name: "individual_phenometrics_datafield_descriptions.xlsx" });
        }
        if (filesToZip.length > 2 && fs.existsSync(config.get("metadata_path") + "ancillary_datafield_descriptions.xlsx")) {
            archive.append(fs.createReadStream(config.get("metadata_path") + "ancillary_datafield_descriptions.xlsx"), { name: "ancillary_datafield_descriptions.xlsx" });
        }
        archive.finalize();
    });
}
exports.createZip = createZip;
function zipGeoserverData(filesToZip, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let zipFileName = "geoserver_" + requestTimestamp.toString() + ".zip";
        let zipFilePath = config.get("save_path") + zipFileName;
        let zipStream = fs.createWriteStream(zipFilePath);
        let archive = archiver.create("zip", {});
        zipStream.on("close", function () {
            resolve(zipFileName);
        });
        archive.on("error", (err) => {
            reject(err);
        });
        archive.pipe(zipStream);
        for (let fileName of filesToZip) {
            let fileNameWithoutTimestamp = fileName.replace(/[0-9]/g, "");
            let fn = config.get("save_path") + fileName;
            archive.append(fs.createReadStream(fn), { name: fileNameWithoutTimestamp });
            fs.unlink(fn, (err) => {
                if (err)
                    throw err;
            });
        }
        archive.finalize();
    });
}
exports.zipGeoserverData = zipGeoserverData;
//# sourceMappingURL=zipBuilder.js.map