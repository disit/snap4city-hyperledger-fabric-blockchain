# Snap4city BlockChain API: Hyperledger Fabric Integration

## Overview
This Node.js application provides a RESTful API for data, device, and model certification using Hyperledger Fabric blockchain technology.



## Requirements
 - Node 18.12.1

## Dependencies
- Express.js
- Hyperledger Fabric Gateway
- jsonwebtoken
- CryptoJS

## Key Feature

### Blockchain Connection
- Establishes connection to Hyperledger Fabric network
- Configures gRPC client with custom timeouts
- Supports dynamic channel and chaincode configuration

### Authentication
- JWT token validation
- Checks token issuer against trusted issuers
- Validates token signature using JWK (JSON Web Key)


## POST examples and usage

### Headers

An authorization token is required in the headers:
    
   
    Authorization: Bearer <access-token>
    Content-Type: application/json


#### Token Validation Process

- Token must be a valid JWT
- Issued by a trusted issuer (configured in S4C_ISSUER)
- Signature verified using JWK from S4C_JWK endpoint
- Contains required claims (issuer, expiration)

#### Common Error Responses

- 401 Unauthorized: Invalid or missing token
- 403 Forbidden: Token from untrusted issuer

### POST Endpoints


1. `POST /api/addmodel/`
   - Certifies model configurations
   - Stores model metadata on blockchain
   #### Payload example
   ```json
    {
        "name": "TemperaturePredictionModel",
        "type": "MachineLearning",
        "frequency": "hourly",
        "kind": "Regression",
        "protocol": "MQTT",
        "format": "JSON",
        "producer": "DataScience_Team",
        "subnature": "ClimatePrediction",
        "static_attributes": "{\"accuracy\": 0.92, \"version\": \"1.0\"}",
        "service": "ClimateMonitoring",
        "servicePath": "/smartcity/environment",
        "strDev":{
                    "temperature": {"type": "Number"},
                    "humidity": {"type": "Number"},
                    "dateObserved": {"type": "DateTime"} 
                },
        "organization": "SmartCity"
    }
   ```

2. `POST /api/adddevice/`
   - Certifies device information
   - Stores device details on blockchain
   
   #### Payload example
    ```json
    {
        "name": "AirQualitySensor_Downtown",
        "type": "AirQualitySensor",
        "contextbroker": "OrionContextBroker",
        "frequency": "15min",
        "kind": "Sensor",
        "protocol": "NGSI",
        "format": "JSON",
        "producer": "CityInstruments",
        "subnature": "AirMonitoring",
        "static_attributes": "{\"location\": \"Downtown\", \"altitude\": 150}",
        "service": "EnvironmentalMonitoring",
        "servicePath": "/sensors/air",
        "strDev":{
                    "temperature": {"type": "Number"},
                    "humidity": {"type": "Number"},
                    "dateObserved": {"type": "DateTime"} 
                },
        "organization": "SmartCity"
    }
    ```

3. `POST /api/adddata/`
   - Certifies data records
   - Generates SHA1 hash of data
   - Submits transaction to blockchain
   #### Payload example

   ```json  
   {
    "devName": "TemperatureSensor001",
    "devType": "EnvironmentalSensor",
    "organization": "SmartCity",
    "strDev": {
        "temperature": {"value": 22.5, "type": "Number"},
        "humidity": {"value": 45.3, "type": "Number"},
        "dateObserved": {"value": "2024-02-15T10:30:00.000Z", "type": "DateTime"}
     }
    }
    ```

4. `POST /api/dataCertificationCheck`
   - Verifies data integrity
   - Compares calculated hash with blockchain-stored hash
   #### Payload example
    ```json
    {
        "name": "TemperatureSensor001",
        "organization": "SmartCity",
        "bindings": {
            "dateObserved": {"value": "2024-02-15T10:30:00.000Z"},
            "temperature": 22.5,
            "humidity": 45.3
        }
    }
    ```

5. `POST /api/deviceVerificationCheck/`
   - Checks device certification status
   - Validates device against blockchain record
   - Return a positive response if the device is present in the blockchain records
   #### Payload example
    ```json
    {
        "name": "AirQualitySensor_Downtown",
        "contextbroker": "OrionContextBroker",
        "type": "AirQualitySensor",
        "organization": "SmartCity"
    }
    ```

6. `/api/modelVerificationCheck/`
   - Validates model certification
   - Confirms model's blockchain registration
    - Return a positive response if the model is present in the blockchain records
   #### Payload example
    ```json
    {
        "name": "TemperaturePredictionModel",
        "type": "MachineLearning",
        "organization": "SmartCity"
    }
    ```
7. `GET /api/dataCertificationCheckTimeSeries/`


    #### Payload example
    ```json
    ?startDate=2024-02-01T00:00:00Z&endDate=2024-02-15T23:59:59Z&deviceId=TemperatureSensor001
    ```

    #### Response example
    This will respond with the device measures present on the blockchain in the interval provided, the response will be in the following format:
    ```json
    [
        {
        "_id": "TemperatureSensor001ServiceURI2024-02-15T10:30:00.000ZSmartCity",
        "_rev": "8-c949cd35671556d31aa0908c8561bcc3",
        "devName": "TemperatureSensor001",
        "devOrg": "SmartCity",
        "devType": "ServiceURI",
        "docType": "data",
        "hashDev": "fad6ee805cd0020269b7b73d9c0a3b22faa7fe66",
        "timeStamp": "2024-02-15T10:30:00.000Z",
        "varDev": "dateObserved,humidity,temperature"
        }, 
    ...]
    ```

### Responses

- `200` : The request was executed successfully.
- `500` : The request has encountered a problem.



## Configuration docker-compose.yaml

### Environment Variables Configuration

#### Authentication Variables
- `S4C_ISSUER`: OpenID Connect issuer URL for JWT token validation
- `S4C_JWK`: URL to retrieve JSON Web Keys for token signature verification

#### Hyperledger Fabric Network Configuration (This must be setted for each fabric peer:)

- `CHANNEL_NAME`: Fabric channel name (default: 'mychannel')
- `CHAINCODE_NAME`: Name of the deployed chaincode (default: 'fabdev')
- `MSP_ID`: Membership Service Provider ID (default: 'Org2MSP')

#### Crypto Material Paths (This must be setted for each fabric peer:)
- `KEY_DIRECTORY_PATH`: Path to user's private key for blockchain connection
- `CERT_PATH`: Path to user's certificate for authentication
- `TLS_CERT_PATH`: Path to TLS certificate for secure gRPC connection

#### Peer Connection Details (This must be setted for each fabric peer:)
- `PEER_ENDPOINT`: Network address and port of the Fabric peer
- `PEER_HOST_ALIAS`: Hostname used for SSL certificate validation

#### Volume Mapping
- Maps local `./crypto-config` directory to `/snap4city-blockchain-api/crypto-config` in the container, providing necessary cryptographic materials for blockchain interactions
