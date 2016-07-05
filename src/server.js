"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var csvBuilders_1 = require("./csvBuilders");
var zipBuilder_1 = require("./zipBuilder");
var npnPortalParams_1 = require("./npnPortalParams");
var express = require("express");
var bodyParser = require('body-parser');
var config = require('config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var app = express();
// allows us to consume json from post requests
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
function getZippedData(req) {
    return __awaiter(this, void 0, void 0, function* () {
        var requestTimestamp = Date.now();
        console.log("requestTimestamp: " + requestTimestamp);
        var params = npnPortalParams_1.getNpnPortalParams(req);
        console.log("built params");
        var searchParametersCsv = yield csvBuilders_1.createSearchParametersCsv(params, requestTimestamp);
        console.log("built search params csv");
        var observationsCsv = yield csvBuilders_1.createObservationsCsv(params, requestTimestamp);
        console.log("built obervations csv");
        var zipFileName = yield zipBuilder_1.createZip([observationsCsv, searchParametersCsv], requestTimestamp);
        console.log("zipped the csvs");
        return { download_path: config.get('server_path') + zipFileName };
    });
}
app.post("/dot/download", function (req, res) {
    console.log("in /dot/download");
    getZippedData(req)
        .then(function (zipFile) {
        res.setHeader("Content-Type", "application/json");
        res.send(zipFile);
    })
        .catch(function (err) { return console.error(err); });
});
if (config.get('protocol') === 'https') {
    var certificate = fs.readFileSync('/etc/apache2/ssl/usanpn.crt');
    var privateKey = fs.readFileSync('/etc/apache2/ssl/usanpn.key');
    console.log("creating https server");
    var server = https.createServer({ key: privateKey, cert: certificate }, app);
}
else {
    console.log("creating http server");
    var server = http.createServer(app);
}
server = app.listen(3002, function () {
    console.log("Server listening on port 3002");
    console.log("protocol is: " + config.get("protocol"));
    console.log("npn_portal_path: " + config.get("npn_portal_path"));
});
