// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var myConfig = require('../conf/config');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;

var http = require('http');

console.log (myConfig);
var aa={};
aa.a=9;
aa.b=7;
console.log (aa)

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = 'HostName=eubmabeTestHub.azure-devices.net;DeviceId=MyFirstDevice;SharedAccessKey=IIplPmmAjNFRBsLFtU8ZfMhWK0A3Lmk4uoNNgmO+nE4=';
var deviceId = ConnectionString.parse(connectionString).DeviceId;

// Sensors data
var temperature = 50;
var humidity = 50;
var externalTemperature = 55;

// Create IoT Hub client
var client = Client.fromConnectionString(connectionString, Protocol);

// Helper function to print results for an operation
function printErrorFor(op) {
  return function printError(err) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
function generateRandomIncrement() {
  return ((Math.random() * 2) - 1);
}


var options = {
  hostname: '192.168.10.11',
  port: 80,
  // path: '/Elvaco-Rest/rest/deviceType/deviceTypeId/',
  path: '/Elvaco-Rest/rest/device/all',
  //path: '/Elvaco-Rest/rest/mdmdata/all',
  method: 'GET',
  auth: 'admin:IoT4ever'
};




// Send device meta data
var deviceMetaData = {
  'ObjectType': 'DeviceInfo',
  'IsSimulatedDevice': 0,
  'Version': '1.0',
  'DeviceProperties': {
    'DeviceID': deviceId,
    'HubEnabledState': 1,
    'CreatedTime': '2015-09-21T20:28:55.5448990Z',
    'DeviceState': 'normal',
    'UpdatedTime': null,
    'Manufacturer': 'Contoso Inc.',
    'ModelNumber': 'MD-909',
    'SerialNumber': 'SER9090',
    'FirmwareVersion': '1.10',
    'Platform': 'node.js',
    'Processor': 'ARM',
    'InstalledRAM': '64 MB',
    'Latitude': 47.617025,
    'Longitude': -122.191285
  },
  'Commands': [{
    'Name': 'SetTemperature',
    'Parameters': [{
      'Name': 'Temperature',
      'Type': 'double'
    }]
  },
    {
      'Name': 'SetHumidity',
      'Parameters': [{
        'Name': 'Humidity',
        'Type': 'double'
      }]
    }]
};

client.open(function (err) {
  if (err) {
    printErrorFor('open')(err);
  } else {
    console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
    client.sendEvent(new Message(JSON.stringify(deviceMetaData)), printErrorFor('send metadata'));

    client.on('message', function (msg) {
      console.log('receive data: ' + msg.getData());

      try {
        var command = JSON.parse(msg.getData());
        if (command.Name === 'SetTemperature') {
          temperature = command.Parameters.Temperature;
          console.log('New temperature set to :' + temperature + 'F');
        }

        client.complete(msg, printErrorFor('complete'));
      }
      catch (err) {
        printErrorFor('parse received message')(err);
      }
    });

    // start event data send routing
    var sendInterval = setInterval(function () {
      temperature += generateRandomIncrement();
      externalTemperature += generateRandomIncrement();
      humidity += generateRandomIncrement();

      var data = JSON.stringify({
        'DeviceID': deviceId,
        'Temperature': temperature,
        'Humidity': humidity,
        'ExternalTemperature': externalTemperature
      });

      console.log('Sending device event data:\n' + data);
      client.sendEvent(new Message(data), printErrorFor('send event'));
    }, 60000);


    var req = http.request(options, function(res) {
      console.log('STATUS: ' +  res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: '+e.message);
    });


    req.end();


    client.on('error', function (err) {
      printErrorFor('client')(err);
      if (sendInterval) clearInterval(sendInterval);
      client.close(printErrorFor('client.close'));
    });
  }
});
