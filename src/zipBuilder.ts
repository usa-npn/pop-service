import * as archiver from 'archiver';
import * as config from 'config';
import * as fs from 'graceful-fs';


export function createZip(downloadType: string, filesToZip: string[], requestTimestamp: number) {
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
        if(downloadType === 'Status and Intensity' && fs.existsSync(config.get('metadata_path') + 'status_intensity_datafield_descriptions.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'status_intensity_datafield_descriptions.xlsx'), { name: 'status_intensity_datafield_descriptions.xlsx' });
        }
        else if(downloadType === 'Site Phenometrics' && fs.existsSync(config.get('metadata_path') + 'site_phenometrics_datafield_descriptions.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'site_phenometrics_datafield_descriptions.xlsx'), { name: 'site_phenometrics_datafield_descriptions.xlsx' });
        }
        else if(downloadType === 'Individual Phenometrics' && fs.existsSync(config.get('metadata_path') + 'individual_phenometrics_datafield_descriptions.xlsx')) {
            archive.append(fs.createReadStream(config.get('metadata_path') + 'individual_phenometrics_datafield_descriptions.xlsx'), { name: 'individual_phenometrics_datafield_descriptions.xlsx' });
        }
        
        if (filesToZip.length > 2 && fs.existsSync(config.get('metadata_path') + 'ancillary_datafield_descriptions.xlsx')){
            archive.append(fs.createReadStream(config.get('metadata_path') + 'ancillary_datafield_descriptions.xlsx'), { name: 'ancillary_datafield_descriptions.xlsx' });
        }
        
        archive.finalize();
    });
}