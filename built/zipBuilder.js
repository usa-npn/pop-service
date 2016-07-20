"use strict";
var archiver = require('archiver');
var config = require("config");
var fs = require('graceful-fs');
function createZip(downloadType, filesToZip, requestTimestamp) {
    return new Promise((resolve, reject) => {
        let zipFileName = 'datasheet_' + requestTimestamp.toString() + '.zip';
        let zipFilePath = config.get('save_path') + zipFileName;
        let zipStream = fs.createWriteStream(zipFilePath);
        let archive = archiver.create('zip', {});
        zipStream.on('close', function () {
            console.log('All files are zipped!');
            resolve(zipFileName);
        });
        archive.on('error', (err) => {
            reject(err);
        });
        archive.pipe(zipStream);
        for (var fileName of filesToZip) {
            let fileNameWithoutTimestamp = fileName.replace(/[0-9]/g, "");
            archive.append(fs.createReadStream(config.get('save_path') + fileName), { name: fileNameWithoutTimestamp });
        }
        if (downloadType === 'Raw') {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'raw_metadata.xlsx'), { name: 'raw_metadata.xlsx' });
        }
        else if (downloadType === 'Site-Level Summarized') {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'site-summarized_metadata.xlsx'), { name: 'site-summarized_metadata.xlsx' });
        }
        else if (downloadType === 'Individual-Level Summarized') {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'individual-summarized_metadata.xlsx'), { name: 'individual-summarized_metadata.xlsx' });
        }
        archive.finalize();
    });
}
exports.createZip = createZip;
//# sourceMappingURL=zipBuilder.js.map