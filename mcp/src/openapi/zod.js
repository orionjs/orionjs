import { z } from 'zod';
function dataSchemaArrayToZod(schemas) {
    const firstSchema = dataSchemaToZod(schemas[0]);
    if (!schemas[1]) {
        return firstSchema;
    }
    const secondSchema = dataSchemaToZod(schemas[1]);
    const zodSchemas = [firstSchema, secondSchema];
    for (const schema of schemas.slice(2)) {
        zodSchemas.push(dataSchemaToZod(schema));
    }
    return z.union(zodSchemas).array();
}
export function dataSchemaToZod(schema) {
    var _a;
    if (!('type' in schema) || Object.keys(schema).length === 0) {
        return z.any();
    }
    if (schema.type === 'null') {
        return z.null();
    }
    if (schema.type === 'boolean') {
        return z.boolean();
    }
    if (schema.type === 'enum<string>') {
        return z.enum(schema.enum);
    }
    if (schema.type === 'enum<number>' || schema.type === 'enum<integer>') {
        return z
            .enum(schema.enum.map((n) => n.toString()))
            .transform((arg) => Number(arg));
    }
    if (schema.type === 'file') {
        return z.instanceof(File);
    }
    if (schema.type === 'any') {
        return z.any();
    }
    if (schema.type === 'string') {
        if ('enum' in schema && Array.isArray(schema.enum)) {
            return z.enum(schema.enum);
        }
        if (schema.format === 'binary') {
            return z.instanceof(File);
        }
        let stringSchema = z.string();
        if (schema.minLength !== undefined) {
            stringSchema = stringSchema.min(schema.minLength);
        }
        if (schema.maxLength !== undefined) {
            stringSchema = stringSchema.max(schema.maxLength);
        }
        if (schema.pattern !== undefined) {
            stringSchema = stringSchema.regex(new RegExp(schema.pattern));
        }
        if (schema.format) {
            switch (schema.format) {
                case 'email':
                    stringSchema = stringSchema.email();
                    break;
                case 'uri':
                case 'url':
                    stringSchema = stringSchema.url();
                    break;
                case 'uuid':
                    stringSchema = stringSchema.uuid();
                    break;
                case 'date-time':
                    return z.coerce.date();
            }
        }
        return stringSchema;
    }
    if (schema.type === 'number' || schema.type === 'integer') {
        if ('enum' in schema && Array.isArray(schema.enum)) {
            return z.enum(schema.enum.map((n) => n.toString()));
        }
        let numberSchema = schema.type === 'integer' ? z.number().int() : z.number();
        if (schema.minimum !== undefined) {
            numberSchema = numberSchema.min(schema.minimum);
        }
        if (schema.maximum !== undefined) {
            numberSchema = numberSchema.max(schema.maximum);
        }
        if (schema.exclusiveMinimum !== undefined && schema.minimum !== undefined) {
            numberSchema = numberSchema.gt(schema.minimum);
        }
        if (schema.exclusiveMaximum !== undefined && schema.maximum !== undefined) {
            numberSchema = numberSchema.lt(schema.maximum);
        }
        return numberSchema;
    }
    if (schema.type === 'array') {
        let itemSchema;
        let arraySchema = z.any().array();
        if (Array.isArray(schema.items)) {
            itemSchema = dataSchemaArrayToZod(schema.items);
            if (schema.items.length > 1) {
                arraySchema = itemSchema;
            }
            else {
                arraySchema = itemSchema.array();
            }
        }
        else {
            itemSchema = dataSchemaToZod(schema.items);
            arraySchema = itemSchema.array();
        }
        if (schema.minItems !== undefined) {
            arraySchema = arraySchema.min(schema.minItems);
        }
        if (schema.maxItems !== undefined) {
            arraySchema = arraySchema.max(schema.maxItems);
        }
        return arraySchema;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (schema.type === 'object') {
        const shape = {};
        const requiredProperties = 'requiredProperties' in schema ? schema.requiredProperties : undefined;
        const requiredPropertiesSet = new Set(requiredProperties || []);
        for (const [key, propSchema] of Object.entries((_a = schema.properties) !== null && _a !== void 0 ? _a : {})) {
            const zodPropSchema = Array.isArray(propSchema)
                ? dataSchemaArrayToZod(propSchema)
                : dataSchemaToZod(propSchema);
            shape[key] = requiredPropertiesSet.has(key) ? zodPropSchema : zodPropSchema.optional();
        }
        return z.object(shape);
    }
    return z.any();
}
