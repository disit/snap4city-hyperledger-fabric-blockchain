/* Snap4city BlockChain API
   Copyright (C) 2024 DISIT Lab http://www.disit.org - University of Florence

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, either version 3 of the
   License, or (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. */

const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
var rp = require('request-promise');
var CryptoJS = require("crypto-js");
const { performance } = require("perf_hooks"); 
var CryptoJS = require("crypto-js");
const fs = require("fs");

//*********************************************************************************************
//*************************GET PUBLIC KEY FROM OPENID URL *************************************
//*********************************************************************************************

var jwk = '';

function getJWK() {
  jwkURL = envOrDefault('S4C_JWK', URLS["jwk"])
  console.log("getting JWK from "+jwkURL)
  return rp(jwkURL)
    .then(function (response) {
      return JSON.parse(response)["keys"][0];
    });
}

//*********************************************************************************************
//*************************GET USER, CHANNEL & PORT from inputData.json************************
//*********************************************************************************************
let jwtValURLs = fs.readFileSync('jwtValidationURLs.json');

let URLS = JSON.parse(jwtValURLs);
(async function () {
  jwk = await getJWK();
  console.log(jwk)
})();

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

//*********************************************************************************************
//**********************************SETTING FABRIC CHAINCODE PATH******************************
//*********************************************************************************************

const grpc = require('@grpc/grpc-js');
const fabricGateway = require('@hyperledger/fabric-gateway');
const connect = fabricGateway.connect;
const contract = fabricGateway.Contract;
const Identity = fabricGateway.Identity;
const Signer = fabricGateway.Signer;
const signers = fabricGateway.signers;
const crypto = require('crypto');
const fs_promises = require('fs').promises;
const path = require('path');
const { TextDecoder } = require('util');

function envOrDefault(key, defaultValue) {
  return process.env[key] || defaultValue;
}
async function newGrpcConnection() {
  const tlsRootCert = await fs_promises.readFile(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': peerHostAlias,
  });
}
async function newIdentity() {
  const credentials = await fs_promises.readFile(certPath);
  return { mspId, credentials };
}
async function newSigner() {
  const files = await fs_promises.readdir(keyDirectoryPath);
  const keyPath = path.resolve(keyDirectoryPath, files[0]);
  const privateKeyPem = await fs_promises.readFile(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'fabdev');
const mspId = envOrDefault('MSP_ID', 'Org2MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', 'prova', 'crypto-config', 'peerOrganizations', 'org2.example.com'));

// Path to user private key directory.
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'keystore'));

// Path to user certificate.
const certPath = envOrDefault('CERT_PATH', path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'signcerts', 'cert.pem'));

// Path to peer tls certificate.
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org2.example.com', 'tls', 'ca.crt'));

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', '192.168.1.139:9051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org2.example.com');

const utf8Decoder = new TextDecoder();
const assetId = `asset${Date.now()}`;

var network;
var contract1;

async function connect_to() {
  console.log("connecting to fabric channel "+channelName+" chaincode "+chaincodeName)
  // The gRPC client connection should be shared by all Gateway connections to this endpoint.
  const client = await newGrpcConnection();

  const gateway = connect({
    client,
    identity: await newIdentity(),
    signer: await newSigner(),
    // Default timeouts for different gRPC calls
    evaluateOptions: () => {
      return { deadline: Date.now() + 5000 }; // 5 seconds
    },
    endorseOptions: () => {
      return { deadline: Date.now() + 15000 }; // 15 seconds
    },
    submitOptions: () => {
      return { deadline: Date.now() + 5000 }; // 5 seconds
    },
    commitStatusOptions: () => {
      return { deadline: Date.now() + 60000 }; // 1 minute
    },
  });


  // Get a network instance representing the channel where the smart contract is deployed.
  network = gateway.getNetwork(channelName);
  // Get the smart contract from the network.
  contract1 = network.getContract(chaincodeName);

  return network;
}


//*********************************************************************************************
//***********************************JWT VALIDATION FUNCTION***********************************
//*********************************************************************************************
async function token_validation(jwk, req, res, next) {
  var Token = req.headers['authorization'];
  var TokenArray = Token.split(" ");
  const incomingToken = TokenArray[1]
  if (!incomingToken) {
    return response.status(401).end();
  }

  const mockedResponse = {
    data: {
      keys: [jwk]
    }
  }

  const trustedIssuers = [
    envOrDefault('S4C_TRUSTED_ISSUER', URLS["trustedIss"])
  ];

  const verifiedToken = verify(incomingToken);

  function getJwkByKid(url, kid) {
    let issResponse;

    issResponse = mockedResponse;

    for (let index = 0; index < issResponse.data.keys.length; index++) {
      const key = issResponse.data.keys[index];
      if (key.kid === kid) {
        return key;
      }
    }
    res.status(401).json({ staus: "KO", log: "TokenValidation", error: "Failed to find JWK by token KID" });
    return
  }

  /**
  * This method verifies the token and returns the user id. If token is invalid, it throws an error.
  * If token is valid, it returns the decoded token.
  * @param {*} token 
  */
  function verify(token) {
    const decodedToken = jwt.decode(token, { complete: true });

    if (!decodedToken) {
      res.status(401).json({ staus: "KO", log: "TokenValidation", error: "Token decode failed, syntax error" });
      return
    }

    //Verify if token issuer is trusted
    if (!trustedIssuers.includes(decodedToken.payload.iss)) {
      res.status(401).json({ staus: "KO", log: "TokenValidation", error: "The token issuer is not trusted" });
      return
    }

    const url = decodedToken.payload.iss + "/protocol/openid-connect/certs";

    //Verify if token is not expired and signature match
    jwt.verify(token, jwkToPem(getJwkByKid(url, decodedToken.header.kid)));

    return decodedToken;
  }

}


//*********************************************************************************************
//******************************API FOR DATA CERTIFICATION*****************************
//*********************************************************************************************
app.post('/api/adddata/', async (req, res) => {
  try {
    await token_validation(jwk, req, res);
    //timestamp recovery
    const parsedStrDev = JSON.parse(req.body.strDev);
    var timeStamp = 0;
    if (parsedStrDev.hasOwnProperty('dateObserved')) {
      timeStamp = parsedStrDev.dateObserved.value;
    } else {
      timeStamp = new Date(0).toISOString();
    }
    var orderedDev = Object.fromEntries(Object.entries(JSON.parse(req.body.strDev)).sort());


    for (let i = 0; i < Object.keys(orderedDev).length; i++) {
      delete orderedDev[Object.keys(orderedDev)[i]]['type']
    }
    for (const key in orderedDev) {
      if (orderedDev[key].hasOwnProperty('value') && typeof orderedDev[key].value === 'number') {
        // Truncate the value property to 7 decimal places
        orderedDev[key].value = parseFloat(orderedDev[key].value.toFixed(7));
      }
    }
    //hashing
    var hash = JSON.stringify(orderedDev);
    hash = hash.toString();
    hash = hash.replace(/"|'/g, '');
    hash = JSON.stringify(hash)
    console.log(hash)
    hash = CryptoJS.SHA1(hash).toString();

    const varKeys = Object.keys(orderedDev);
    try {
      const result = await contract1.submitTransaction('createData', req.body.devName, req.body.devType, timeStamp, req.body.organization, hash.toString(), varKeys.toString());
      console.log('Transaction submitted successfully. Result:', result);
    } catch (error) {
      console.log(error)
      res.status(500).json({ staus: "KO", log: "addDev", error: error }).end();
    }

    res.status(200).json({ status: "OK", log: "addDev", msg: "Transaction has been submitted" }).end();
  } catch (error) {
    console.error(error)
    res.status(500).json({ staus: "KO", log: "addDev", error: error }).end();
  }
}
)


//*********************************************************************************************
//******************************API FOR MODEL CERTIFICATION*********************************
//*********************************************************************************************
app.post('/api/addmodel/', async function (req, res) {
  try {
    await token_validation(jwk, req, res);

    parsedstaticAttributes = JSON.parse(req.body.static_attributes)

    var modeljson = [];
    var keysModel = {};

    modeljson.push({
      "name": req.body.name,
      "type": req.body.type,
      "frequency": req.body.frequency,
      "kind": req.body.kind,
      "protocol": req.body.protocol,
      "format": req.body.format,
      "producer": req.body.producer,
      "subnature": req.body.subnature,
      "static_attributes": parsedstaticAttributes.toString(),
      "service": req.body.service,
      "servicePath": req.body.servicePath,
      "strDev": req.body.strDev,
      "organization": req.body.organization
    });


    keysModel.modeljson = modeljson;

    let modelData = JSON.stringify(keysModel.modeljson)

    await contract1.submitTransaction('createModel', modelData);

    res.status(200).json({ status: "OK", log: "addModel", msg: "Model has been submitted" });
  } catch (error) {
    console.error(error)
    res.status(500).json({ staus: "KO", log: "addModel", error: error });
  }
}
)


//*********************************************************************************************
//******************************API FOR DEVICE CERTIFICATION*********************************
//*********************************************************************************************
app.post('/api/adddevice/', async function (req, res) {
  console.log("add device chiamato")
  try {
    await token_validation(jwk, req, res);

    parsedstaticAttributes = JSON.parse(req.body.static_attributes)

    var devicejson = [];
    var keysDevice = {};

    devicejson.push({
      "name": req.body.name,
      "type": req.body.type,
      "contextbroker": req.body.contextbroker,
      "frequency": req.body.frequency,
      "kind": req.body.kind,
      "protocol": req.body.protocol,
      "format": req.body.format,
      "producer": req.body.producer,
      "subnature": req.body.subnature,
      "static_attributes": parsedstaticAttributes.toString(),
      "service": req.body.service,
      "servicePath": req.body.servicePath,
      "strDev": req.body.strDev,
      "organization": req.body.organization
    });

    keysDevice.devicejson = devicejson;

    let deviceData = JSON.stringify(keysDevice.devicejson)

    await contract1.submitTransaction('createDevice', deviceData);
    //console.log('Transaction has been submitted');
    res.status(200).json({ status: "OK", log: "addDevice", msg: "Device has been submitted" });


  } catch (error) {
    res.status(500).json({ staus: "KO", log: "addDevice", error: error });
  }
})


//*********************************************************************************************
//******************************API FOR DATA CHECK****************************
//*********************************************************************************************

app.post('/api/dataCertificationCheck', async function queryHash(req, res) {
  try {
    await token_validation(jwk, req, res);

  } catch (error) {
    console.log("Access token not valid, please try again.");
    return res.status(403).json({ staus: "KO", log: "checkDevice", error: "Access token not valid." });
  }
  // Create a new file system based wallet for managing identities.
  try {
    var devname = lookup(req.body, 'name')[1];

    var organization = lookup(req.body, 'organization')[1];

    var dateObserved = lookup(lookup(req.body, 'bindings')[1], 'dateObserved');

    if (dateObserved === null) {
      dateObserved = new Date(0).toISOString();
    } else {
      dateObserved = JSON.stringify(dateObserved[1]);
      dateObserved = Object.values(JSON.parse(dateObserved))[0];
    }
    var bindings = lookup(req.body, 'bindings');

    var values = bindings[1];

    if (values[0].hasOwnProperty('measuredTime')) {
      delete values[0]['measuredTime'];
    }

    let devType = 'ServiceURI';

    let couchKey = devname + devType + dateObserved + organization;

    var valuesOrdered = Object.fromEntries(Object.entries(values[0]).sort());

    //hashing
    var hash = JSON.stringify(valuesOrdered);
    hash = hash.toString();
    hash = hash.replace(/"|'/g, '');
    hash = CryptoJS.SHA1(JSON.stringify(hash));
    const varKeys = Object.keys(valuesOrdered);

    const response = await contract.evaluateTransaction('certificationCheck', couchKey);

    let parsedResponse = JSON.parse(response.toString('utf-8'))
    let bcHash = String.fromCharCode(...parsedResponse['data'])
    try {
      bcHash = JSON.parse(bcHash);
    } catch (error) {
      console.log('Data from device: "' + devname + '" is not certified.')
      return res.status(500).json({ status: "KO", log: "checkData", error: "data is not certified." });
    }
    console.log(bcHash)

    if (hash == bcHash['hashDev']) {
      console.log("Il dato è certificato\n")
      return res.status(200).json({ status: "Certified", log: "Certification check succeded", msg: "Il dato è certificato" }).send();
    } else {
      console.log("Il dato NON è certificato\n")
      return res.status(404).json({ status: "NotCertified", log: "Certification check failed", msg: "Il dato NON è certificato" }).send();
    }

  } catch (error) {
    return res.status(500).json({ staus: "KO", log: "Error connecting to fabric", error: error }).send();
  }

})


//*********************************************************************************************
//******************************API FOR DEVICE CHECK*********************************
//*********************************************************************************************
app.post('/api/deviceVerificationCheck/', async function (req, res) {
  try {
    try {
      await token_validation(jwk, req, res);
    } catch (error) {
      console.log("Access token not valid, please try again.");
      return res.status(403).json({ staus: "KO", log: "checkDevice", error: "Access token not valid." });
    }

    const userExists = await wallet.exists(user);
    if (!userExists) {
      console.log('An identity for the specified user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    let couchKey = req.body.name + 'device' + req.body.contextbroker + req.body.type + req.body.organization
    let deviceResult = await contract1.evaluateTransaction('certificationCheck', couchKey);
    let parsedResponse = JSON.parse(Buffer.from(deviceResult).toString('utf8'))
    let bcHash = String.fromCharCode(...parsedResponse['data'])

    try {
      bcHash = JSON.parse(bcHash)
    } catch (error) {
      console.log('Device "' + req.body.name + '" is not certified.')
      return res.status(500).json({ staus: "KO", log: "checkDevice", error: "Device is not certified." });
    }
    console.log('Device "' + req.body.name + '" is certified.');
    return res.status(200).json({ status: "OK", log: "checkDevice", msg: "Device has been submitted" });
  } catch (error) {
    return res.status(500).json({ staus: "KO", log: "checkDevice", error: error });
  }
})

//*********************************************************************************************
//******************************API FOR MODEL CHECK*********************************
//*********************************************************************************************
app.post('/api/modelVerificationCheck/', async function (req, res) {
  try {
    try {
      await token_validation(jwk, req, res);
    } catch (error) {
      console.log("Access token not valid, please try again.");
      return res.status(403).json({ staus: "KO", log: "checkModel", error: "Access token not valid." });
    }
    let couchKey = req.body.name + 'model' + req.body.type + req.body.organization
    let deviceResult = await contract1.evaluateTransaction('certificationCheck', couchKey);
    let parsedResponse = JSON.parse(Buffer.from(deviceResult).toString('utf8'))
    let bcHash = String.fromCharCode(...parsedResponse['data'])

    try {
      bcHash = JSON.parse(bcHash)

    } catch (error) {
      console.log('Model "' + req.body.name + '" is not certified.')
      return res.status(500).json({ staus: "KO", log: "checkModel", error: "Model is not certified." });
    }

    console.log('Model "' + req.body.name + '" is certified.');
    return res.status(200).json({ status: "OK", log: "checkModel", msg: "Model is certified" });

  } catch (error) {
    console.log(error)
    return res.status(500).json({ staus: "KO", log: "checkModel", error: error });
  }
})


//*********************************************************************************************
//******************************UTILITY FUNCTIONS**********************************************
//*********************************************************************************************
//LOOKUP OF A JSON OBJECT
function lookup(obj, k) {
  for (var key in obj) {
    var value = obj[key];

    if (k == key) {
      return [k, value];
    }

    if (typeof (value) === "object" && !Array.isArray(value)) {
      var y = lookup(value, k);
      if (y && y[0] == k) return y;
    }
    if (Array.isArray(value)) {
      // for..in doesn't work the way you want on arrays in some browsers
      //
      for (var i = 0; i < value.length; ++i) {
        var x = lookup(value[i], k);
        if (x && x[0] == k) return x;
      }
    }
  }

  return null;
}

app.post('/api/dataCertificationCheckTimeSeries', async function queryHash(req, res) {

  try {
    await token_validation(jwk, req, res);

  } catch (error) {
    console.log("Access token not valid, please try again.");
    return res.status(403).json({ staus: "KO", log: "checkDevice", error: "Access token not valid." });
  }
  // Create a new file system based wallet for managing identities.
  try {
    var endDate = req.query.endDate

    if (endDate === undefined) {
      endDate = new Date().toISOString();
    }

    const response = await contract1.submitTransaction('getMeasurementsByDateAndDevice', req.query.startDate, endDate, req.query.deviceId,);
    res.setHeader('Content-Type', 'application/json');
    res.end(response);

  } catch (error) {
    console.log(error)
    return res.status(500).json({ staus: "KO", log: "Error connecting to fabric", error: error }).send();
  }

})

connect_to().then(() => {
  console.log("connected to fabric")
  console.log("server listening on 9999")
  app.listen('9999')
});
