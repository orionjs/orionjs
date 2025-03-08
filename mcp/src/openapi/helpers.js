import { OpenApiToEndpointConverter, } from '@mintlify/validation';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { dataSchemaToZod } from './zod.js';
export function getEndpointsFromOpenApi(specification) {
    const endpoints = [];
    const paths = specification.paths;
    for (const path in paths) {
        const operations = paths[path];
        for (const method in operations) {
            if (method === 'parameters' || method === 'trace') {
                continue;
            }
            const endpoint = OpenApiToEndpointConverter.convert(specification, path, method, true);
            endpoints.push(endpoint);
        }
    }
    return endpoints;
}
export function loadEnv() {
    try {
        const envPath = path.join(fileURLToPath(import.meta.url), '../../..', '.env');
        if (fs.existsSync(envPath)) {
            const vars = dotenv.parse(fs.readFileSync(envPath));
            return vars;
        }
    }
    catch (error) {
        // if there's no env, the user will be prompted
        // for their auth info at runtime if necessary
        // (shouldn't happen either way)
    }
    return {};
}
function convertParameterSection(parameters, paramSection) {
    Object.entries(parameters).forEach(([key, value]) => {
        const schema = value.schema;
        paramSection[key] = dataSchemaToZod(schema);
    });
}
function convertParametersAndAddToRelevantParamGroups(parameters, paths, queries, headers, cookies) {
    convertParameterSection(parameters.path, paths);
    convertParameterSection(parameters.query, queries);
    convertParameterSection(parameters.header, headers);
    convertParameterSection(parameters.cookie, cookies);
}
function convertSecurityParameterSection(securityParameters, securityParamSection, envVariables, location) {
    Object.entries(securityParameters).forEach(([key, value]) => {
        if (value.type === 'oauth2') {
            return;
        }
        let envKey;
        if (value.type === 'apiKey') {
            envKey = `${location}_${key}_APIKEY`;
        }
        else {
            envKey = `${location}_${key}_HTTP_${value.scheme}`;
        }
        if (envKey && !(envKey in envVariables)) {
            securityParamSection[key] = z.string();
        }
    });
}
function convertSecurityParametersAndAddToRelevantParamGroups(securityParameters, queries, headers, cookies, envVariables) {
    convertSecurityParameterSection(securityParameters.query, queries, envVariables, 'query');
    convertSecurityParameterSection(securityParameters.header, headers, envVariables, 'header');
    convertSecurityParameterSection(securityParameters.cookie, cookies, envVariables, 'cookie');
}
export function convertEndpointToCategorizedZod(endpoint) {
    var _a, _b, _c;
    const envVariables = loadEnv();
    const url = `${((_b = (_a = endpoint.servers) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) || ''}${endpoint.path}`;
    const method = endpoint.method;
    const paths = {};
    const queries = {};
    const headers = {};
    const cookies = {};
    let body = undefined;
    convertParametersAndAddToRelevantParamGroups(endpoint.request.parameters, paths, queries, headers, cookies);
    if ((_c = endpoint.request.security[0]) === null || _c === void 0 ? void 0 : _c.parameters) {
        convertSecurityParametersAndAddToRelevantParamGroups(endpoint.request.security[0].parameters, queries, headers, cookies, envVariables);
    }
    const jsonBodySchema = endpoint.request.body['application/json'];
    const bodySchemaArray = jsonBodySchema === null || jsonBodySchema === void 0 ? void 0 : jsonBodySchema.schemaArray;
    const bodySchema = bodySchemaArray === null || bodySchemaArray === void 0 ? void 0 : bodySchemaArray[0];
    if (bodySchema) {
        const zodBodySchema = dataSchemaToZod(bodySchema);
        body = { body: zodBodySchema };
    }
    return { url, method, paths, queries, body, headers, cookies };
}
