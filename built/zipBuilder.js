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
        if (downloadType === 'Raw' && fs.existsSync(config.get('metadata_path') + 'raw_status_observation_metadata.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'raw_status_observation_metadata.xlsx'), { name: 'raw_status_observation_metadata.xlsx' });
        }
        else if (downloadType === 'Site-Level Summarized' && fs.existsSync(config.get('metadata_path') + 'site-level_summarized_observation_metadata.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'site-level_summarized_observation_metadata.xlsx'), { name: 'site-level_summarized_observation_metadata.xlsx' });
        }
        else if (downloadType === 'Individual-Level Summarized' && fs.existsSync(config.get('metadata_path') + 'individual-level_summarized_observation_metadata.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'individual-level_summarized_observation_metadata.xlsx'), { name: 'individual-level_summarized_observation_metadata.xlsx' });
        }
        archive.finalize();
    });
}
exports.createZip = createZip;
//# sourceMappingURL=zipBuilder.js.map