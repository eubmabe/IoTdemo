// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var myConfig = require('../conf/config');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;

var http = require('http');


// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = 'HostName='+myConfig.HostName+';DeviceId='+myConfig.DeviceId+';SharedAccessKey='+myConfig.SharedAccessKey+';'
console.log('connect string: ' + connectionString);
var deviceId = ConnectionString.parse(connectionString).DeviceId;

// Sensors data
// One item per meter in the system
var sensorVec = [
{
  'meterName':'Huvudledning','measure':[
    {'name':'Volym','sampleTime':Date.now(),'value':0.0,'unit':'m3'},
    {'name':'Flow','sampleTime':Date.now(),'value':3.0,'unit':'m3/h'},
    {'name':'Temperature','sampleTime':Date.now(),'value':10.0,'unit':'C'},
    {'name':'Larm','sampleTime':Date.now(),'value':'','unit':'larm'}]
},{
  meterName:'HusA',measure:[
    {'name':'Volym','sampleTime':Date.now(),'value':0.0,'unit':'m3'},
    {'name':'Flow','sampleTime':Date.now(),'value':0.9,'unit':'m3/h'},
    {'name':'Temperature','sampleTime':Date.now(),'value':17.0,'unit':'C'},
    {'name':'Larm','sampleTime':Date.now(),'value':'','unit':'larm'}]
},{
  meterName:'HusB',measure:[
    {'name':'Volym','sampleTime':Date.now(),'value':0.0,'unit':'m3'},
    {'name':'Flow','sampleTime':Date.now(),'value':1.0,'unit':'m3/h'},
    {'name':'Temperature','sampleTime':Date.now(),'value':18.0,'unit':'C'},
    {'name':'Larm','sampleTime':Date.now(),'value':'','unit':'larm'}]
},{
  meterName:'HusC',measure:[
    {'name':'Volym','sampleTime':Date.now(),'value':0.0,'unit':'m3'},
    {'name':'Flow','sampleTime':Date.now(),'value':1.1,'unit':'m3/h'},
    {'name':'Temperature','sampleTime':Date.now(),'value':19.0,'unit':'C'},
    {'name':'Larm','sampleTime':Date.now(),'value':'','unit':'larm'}]
}]

// Create IoT Hub client
var client = Client.fromConnectionString(connectionString, Protocol);

// Helper function to print results for an operation
function printErrorFor(op) {
  return function printError(err) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
function generateRandomIncrement(range) {
  return ((Math.random() * range) - range/2);
}


// Send device meta data
var deviceMetaData = {
  'ObjectType': 'DeviceInfo',
  'IsSimulatedDevice': 0,
  'Version': '1.0',
  'DeviceProperties': {
    'DeviceID': deviceId,
    'HubEnabledState': 1,
    'CreatedTime': '2016-03-16T00:28:55.5448990Z',
    'DeviceState': 'normal',
    'UpdatedTime': null,
    'Manufacturer': 'Elvaco',
    'ModelNumber': 'Cme3100',
    'SerialNumber': 'NA',
    'FirmwareVersion': 'NA',
    'Platform': 'node.js',
    'Processor': 'NA',
    'InstalledRAM': '64 MB',
    'Latitude': 59.3677785,
    'Longitude': 17.9922184
  },
  'Commands': [{
    'Name': 'SetTemperature',
    'Parameters': [{
      'Name': 'Temperature',
      'Type': 'double'
    },{
      'Name': 'meterID',
      'Type': 'string'
    }]
  },{
    'Name': 'SetVolume',
    'Parameters': [{
      'Name': 'Volume',
      'Type': 'double'
    },{
      'Name': 'meterID',
      'Type': 'string'
    }]
  },{
    'Name': 'SetLarm',
    'Parameters': [{
      'Name': 'Larm',
      'Type': 'text'
    },{
      'Name': 'meterID',
      'Type': 'string'
    }]
  },{
    'Name': 'SetFlow',
    'Parameters': [{
      'Name': 'Flow',
      'Type': 'double'
    },{
      'Name': 'meterID',
      'Type': 'string'
    }]
 }]
};

client.open(function (err) {
  if (err) {
    printErrorFor('open')(err);
  } else {

    // Send meta data to IoT hub
    console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
    client.sendEvent(new Message(JSON.stringify(deviceMetaData)), printErrorFor('send metadata'));

    // Receive and parse incoming messages
    client.on('message', function (msg) {
      console.log('receive data: ' + msg.getData());

      try {
        var command = JSON.parse(msg.getData());
        // Add all commands above....
        if (command.Name === 'SetTemperature') {
          //temperature = command.Parameters.Temperature;
          console.log('New temperature set to :' + command.Parameters.Temperature + 'F');
        }

        client.complete(msg, printErrorFor('complete'));
      }
      catch (err) {
        printErrorFor('parse received message')(err);
      }
    });

    // start event data send routing
    var sendInterval = setInterval(function () {
      for (var meterIndex=0; meterIndex < sensorVec.length; meterIndex++) {
        for (var measureInd=0; measureInd < sensorVec[meterIndex].measure.length; measureInd++) {
          switch (sensorVec[meterIndex].measure[measureInd].name) {
            case 'Volume':
              sensorVec[meterIndex].measure[measureInd].value += Math.random()*0.007
              break;
            case 'Flow':
              sensorVec[meterIndex].measure[measureInd].value += generateRandomIncrement (0.1)
              break;
            case 'Temperature':
              sensorVec[meterIndex].measure[measureInd].value += generateRandomIncrement (0.1)
              break;
            case 'Larm':
              // Do nothing. Larm set and cleared through commands
              break;
            default:
              printErrorFor('Default in switch error')(sensorVec[meterIndex][measureInd]);
          }
          
          var data = JSON.stringify({
            'meterID':sensorVec[meterIndex].meterName,
            'measure':sensorVec[meterIndex].measure[measureInd].name,
            'sampletime':sensorVec[meterIndex].measure[measureInd].sampleTime,
            'value':sensorVec[meterIndex].measure[measureInd].value,
            'unit':sensorVec[meterIndex].measure[measureInd].unit
          });
          client.sendEvent(new Message(data), printErrorFor('send event'));

        }
      }


      console.log('Sending device event data:\n' + data);
    }, 12000);



    client.on('error', function (err) {
      printErrorFor('client')(err);
      if (sendInterval) clearInterval(sendInterval);
      client.close(printErrorFor('client.close'));
    });
  }
});


//var options = {
//  hostname: myConfig.MBUShostname,
//  port: myConfig.MBUSport,
//  path: '/Elvaco-Rest/rest/device/all', // Get???
//  method: 'GET',
//  auth: myConfig.MBUSauth
//};
