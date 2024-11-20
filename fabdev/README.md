# Fabdev chaincode installation

# Installing fabdev Chaincode on Hyperledger Fabric Network

## Prerequisites
* Hyperledger Fabric network is up and running
* Docker is installed and running
* Network configuration includes two organizations (Org1 and Org2)
* Chaincode is written in Node.js and available in the specified path
* An hyperledger channel created

## Installation Steps example
The chaincode will be referred to as "fabdev" and the channel as "mychannel".
In this example the chaicode must be mounted inside the 'cli' container when starting the network.
And all this command have to be executed from peer0.Org1 machine.


### 1. Package the Chaincode
Create the chaincode package from the chaincode folder inside the 'cli' container:
```
docker exec cli peer lifecycle chaincode package fabdev.tar.gz --path ../../../chaincode --label fabdev_1 --lang node
```

### 2. Install on Org1 Peers

Install on peer0.org1:
```
docker exec cli peer lifecycle chaincode install fabdev.tar.gz
```

Install on peer1.org1:
```
docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt cli peer lifecycle chaincode install fabdev.tar.gz
```

### 3. Install on Org2 Peers

Install on peer0.org2:
```
docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer lifecycle chaincode install fabdev.tar.gz
```

Install on peer1.org2:
```
docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer1.org2.example.com:10051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt cli peer lifecycle chaincode install fabdev.tar.gz
```

### 3b. Find the chaincode package ID
This will return the package id of the installed chaincode needed to run the commands at point 4.
```
docker exec cli peer lifecycle chaincode queryinstalled
```

### 4. Approve for Organizations
Substitute the package id.

Approve for Org1:
```
docker exec cli peer lifecycle chaincode approveformyorg --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name fabdev --version 1 --sequence 1 --waitForEvent --package-id <<Package id from point 3b>>
```

Approve for Org2:
```
docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer lifecycle chaincode approveformyorg --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name fabdev --version 1 --sequence 1 --waitForEvent --package-id <<Package id from point 3b>>
```

### 5. Check Commit Readiness
```
docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name fabdev --version 1 --sequence 1
```

### 6. Commit the Chaincode
```
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --channelID mychannel --name fabdev --version 1 --sequence 1
```

### 7. Query Committed Chaincode
```
docker exec cli peer lifecycle chaincode querycommitted --channelID mychannel --name fabdev
```
If everything went well the output should be:
```
Org1:{true}
Org2:{true}
```

### Notes
* Package ID in approval commands must match actual package ID generated during installation
* TLS certificate paths must match your network configuration
* Execute all commands from the correct directory