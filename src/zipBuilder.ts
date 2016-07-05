var archiver = require('archiver');
var config = require("config");
var fs = require('graceful-fs');


export function createZip(filesToZip: string[], requestTimestamp: number) {
    return new Promise<string>((resolve, reject) => {
        let zipFileName = 'datasheet_' + requestTimestamp.toString() + '.zip';
        let zipFilePath = config.get('save_path') + zipFileName;
        let zipStream = fs.createWriteStream(zipFilePath);
        let archive = archiver.create('zip', {});

        zipStream.on('close', function() {
            console.log('All files are zipped!');
            resolve(zipFileName);
        });

        archive.on('error', (err: any) => {
            reject(err);
        });

        archive.pipe(zipStream);

        for(var fileName of filesToZip) {
            let fileNameWithoutTimestamp = fileName.replace(/[0-9]/g, "");
            archive.append(fs.createReadStream(config.get('save_path') + fileName), { name: fileNameWithoutTimestamp });
        }
        archive.finalize();
    });
}