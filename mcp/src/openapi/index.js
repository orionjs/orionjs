var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { validate } from '@mintlify/openapi-parser';
import axios from 'axios';
import dashify from 'dashify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertEndpointToCategorizedZod, getEndpointsFromOpenApi, loadEnv } from './helpers.js';
export function createToolsFromOpenApi(server) {
    return __awaiter(this, void 0, void 0, function* () {
        let openapi;
        try {
            openapi = fs.readFileSync(path.join(fileURLToPath(import.meta.url), '..', 'openapi.json'), 'utf8');
        }
        catch (error) {
            // No OpenAPI file found, skip
            return;
        }
        const { valid, errors, specification } = yield validate(openapi);
        if (!valid || !specification) {
            console.error('Invalid OpenAPI file:', errors);
            return;
        }
        const endpoints = getEndpointsFromOpenApi(specification);
        const envVars = loadEnv();
        endpoints.forEach((endpoint) => {
            const { url: urlSchema, method: methodSchema, paths: pathsSchema, queries: queriesSchema, body: bodySchema, headers: headersSchema, cookies: cookiesSchema, } = convertEndpointToCategorizedZod(endpoint);
            const serverArgumentsSchemas = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, pathsSchema), queriesSchema), bodySchema), headersSchema), cookiesSchema);
            if (endpoint.title == undefined) {
                return;
            }
            server.tool(dashify(endpoint.title), endpoint.description || endpoint.title, serverArgumentsSchemas, (inputArgs) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const inputParams = {};
                const inputHeaders = {};
                const inputCookies = {};
                let urlWithPathParams = urlSchema;
                let inputBody = undefined;
                if ('body' in inputArgs) {
                    inputBody = inputArgs.body;
                    delete inputArgs.body;
                }
                Object.entries(inputArgs).forEach(([key, value]) => {
                    if (key in pathsSchema) {
                        urlWithPathParams = urlWithPathParams.replace(`{${key}}`, value);
                    }
                    else if (key in queriesSchema) {
                        inputParams[key] = value;
                    }
                    else if (key in headersSchema) {
                        inputHeaders[key] = value;
                    }
                    else if (key in cookiesSchema) {
                        inputCookies[key] = value;
                    }
                });
                if (endpoint.request.security.length > 0) {
                    const securityParams = (_a = endpoint.request.security[0]) === null || _a === void 0 ? void 0 : _a.parameters;
                    if (securityParams) {
                        Object.entries(securityParams.query).forEach(([key, value]) => {
                            let envKey = '';
                            if (value.type === 'apiKey') {
                                envKey = `query_${key}_APIKEY`;
                            }
                            else if (value.type === 'http') {
                                envKey = `query_${key}_HTTP_${value.scheme}`;
                            }
                            if (envKey && envKey in envVars) {
                                inputParams[key] = envVars[envKey];
                            }
                        });
                        Object.entries(securityParams.header).forEach(([key, value]) => {
                            let envKey = '';
                            if (value.type === 'apiKey') {
                                envKey = `header_${key}_APIKEY`;
                            }
                            else if (value.type === 'http') {
                                envKey = `header_${key}_HTTP_${value.scheme}`;
                                if (value.scheme === 'bearer' && envKey in envVars) {
                                    inputHeaders['Authorization'] = `Bearer ${envVars[envKey]}`;
                                    return;
                                }
                            }
                            if (envKey && envKey in envVars) {
                                inputHeaders[key] = envVars[envKey];
                            }
                        });
                        Object.entries(securityParams.cookie).forEach(([key, value]) => {
                            let envKey = '';
                            if (value.type === 'apiKey') {
                                envKey = `cookie_${key}_APIKEY`;
                            }
                            else if (value.type === 'http') {
                                envKey = `cookie_${key}_HTTP_${value.scheme}`;
                            }
                            if (envKey && envKey in envVars) {
                                inputCookies[key] = envVars[envKey];
                            }
                        });
                    }
                }
                try {
                    const response = yield axios({
                        url: urlWithPathParams,
                        method: methodSchema,
                        params: inputParams,
                        data: inputBody,
                        headers: inputHeaders,
                    });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(response.data, undefined, 2),
                            },
                        ],
                    };
                }
                catch (error) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: 'text',
                                text: axios.isAxiosError(error)
                                    ? `${error.name}: ${error.message}\n\n${error.toJSON()}`
                                    : JSON.stringify(error, undefined, 2),
                            },
                        ],
                    };
                }
            }));
        });
    });
}
