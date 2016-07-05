"use strict";
var archiver = require('archiver');
var fs = require("fs");
var config = require("config");
function createZip(filesToZip, requestTimestamp) {
    return new Promise(function (resolve, reject) {
        var zipFileName = 'observations_' + requestTimestamp.toString() + '.zip';
        var zipFilePath = config.get('save_path') + zipFileName;
        var zipStream = fs.createWriteStream(zipFilePath);
        var archive = archiver.create('zip', {});
        zipStream.on('close', function () {
            console.log('All files are zipped!');
            resolve(zipFileName);
        });
        archive.on('error', function (err) {
            reject(err);
        });
        archive.pipe(zipStream);
        for (var _i = 0, filesToZip_1 = filesToZip; _i < filesToZip_1.length; _i++) {
            var fileName = filesToZip_1[_i];
            archive.append(fs.createReadStream(config.get('save_path') + fileName), { name: fileName });
        }
        archive.finalize();
    });
}
exports.createZip = createZip;
