/* Snap4city fabdev contract
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

'use strict';

const {Contract} = require('fabric-contract-api');
const {Shim} = require('fabric-shim');

//const {returns} = require("sinon/lib/sinon/default-behaviors");

class FabDev extends Contract {
    //*********************************************************************************************
    //******************************FUNCTION FOR DATA CERTIFICATION*********************************
    //*********************************************************************************************
    async createData(ctx, devName, devType, timeStamp, devOrg, hashDev, varDev) {

        /*  const exists = await this.AssetExists(ctx, timeStamp);
         if (exists) {
             throw new Error(`The asset ${timeStamp} already exists`);
         } */
        //console.log('============= START : Insert Data ===========');
        // ==== Create asset object and marshal to JSON ====
        let asset = {
            docType: 'data',
            devName: devName,
            devType: devType,
            timeStamp: timeStamp,
            devOrg: devOrg,
            hashDev: hashDev,
            varDev: varDev
        };

        let couchKey = devName + devType + timeStamp + devOrg;
        // === Save asset to state ===

        try {
            await ctx.stub.putState(couchKey, Buffer.from(JSON.stringify(asset)));
            return Shim.success();
        } catch (error) {
            console.error(`Error saving asset: ${error}`);
            return Shim.error(error);
        }
    }


    //*********************************************************************************************
    //******************************FUNCTION FOR MODEL CERTIFICATION*********************************
    //*********************************************************************************************
    async createModel(ctx, modelData) {


        console.log('============= START : Create Model ===========');
        // ==== Create asset object and marshal to JSON ====
        modelData = JSON.parse(modelData);
        let asset = {
            name: modelData[0].name,
            IoTType: 'model',
            type: modelData[0].type,
            frequency: modelData[0].frequency,
            kind: modelData[0].kind,
            protocol: modelData[0].protocol,
            format: modelData[0].format,
            producer: modelData[0].producer,
            subnature: modelData[0].subnature,
            static_attributes: modelData[0].static_attributes,
            service: modelData[0].service,
            servicePath: modelData[0].servicePath,
            strDev: modelData[0].strDev,
            organization: modelData[0].organization
        };


        let couchKey = asset.name + asset.IoTType + asset.type + asset.organization;


        // === Save asset to state ===
        await ctx.stub.putState(couchKey, Buffer.from(JSON.stringify(asset)));


        console.log('============= END : Create Model ===========');
    }


    //*********************************************************************************************
    //******************************FUNCTION FOR DEVICE CERTIFICATION******************************
    //*********************************************************************************************
    async createDevice(ctx, deviceData) {
        // ==== Create asset object and marshal to JSON ====
        deviceData = JSON.parse(deviceData);
        let asset = {
            name: deviceData[0].name,
            IoTType: 'device',
            type: deviceData[0].type,
            contextbroker: deviceData[0].contextbroker,
            frequency: deviceData[0].frequency,
            kind: deviceData[0].kind,
            protocol: deviceData[0].protocol,
            format: deviceData[0].format,
            producer: deviceData[0].producer,
            subnature: deviceData[0].subnature,
            static_attributes: deviceData[0].static_attributes,
            service: deviceData[0].service,
            servicePath: deviceData[0].servicePath,
            strDev: deviceData[0].strDev,
            organization: deviceData[0].organization
        };


        let couchKey = asset.name + asset.IoTType + asset.contextbroker + asset.type + asset.organization;


        // === Save asset to state ===
        await ctx.stub.putState(couchKey, Buffer.from(JSON.stringify(asset)));


    }


    //*********************************************************************************************
    //******************************FUNCTION FOR SINGLE DATA QUERY*********************************
    //*********************************************************************************************

    async certificationCheck(ctx, couchKey) {
        return await ctx.stub.getState(couchKey);
    }


    //*********************************************************************************************
    //**********************Query on time interval for a certain devicename***********************
    //*********************************************************************************************
    async getMeasurementsByDateAndDevice(ctx, startDate, endDate, devName) {

        const query = {
            selector: {
                docType: 'data',
                devName: devName,
                timeStamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            },
            sort: [{timeStamp: 'desc'}]
        };
        console.log(query);
        const queryResult = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        while (true) {
            const data = await queryResult.next();
            if (data.value && data.value.value.toString()) {
                const record = JSON.parse(data.value.value.toString('utf8'));
                results.push(record);
            }
            if (data.done) {
                await queryResult.close();

                return results;
            }
        }
    }
}

module.exports = FabDev;
