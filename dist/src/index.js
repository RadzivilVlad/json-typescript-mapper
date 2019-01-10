"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./lib/utils");
require("reflect-metadata");
/**
 * Decorator variable name
 *
 * @const
 */
const JSON_META_DATA_KEY = "JsonProperty";
/**
 * DecoratorMetaData
 * Model used for decoration parameters
 *
 * @class
 * @property {string} name, indicate which json property needed to map
 * @property {string} clazz, if the target is not primitive type, map it to corresponding class
 */
class DecoratorMetaData {
    constructor(name, clazz) {
        this.name = name;
        this.clazz = clazz;
    }
}
/**
 * JsonProperty
 *
 * @function
 * @property {IDecoratorMetaData<T>|string} metadata, encapsulate it to DecoratorMetaData for standard use
 * @return {(target:Object, targetKey:string | symbol)=> void} decorator function
 */
// export function JsonProperty2<T>(target?: any, metadata?: IDecoratorMetaData<T>|string, value?: any): (target: Object, targetKey: string | symbol) => void {
//     let decoratorMetaData: IDecoratorMetaData<T>;
//     if (isTargetType(metadata, 'string')) {
//         decoratorMetaData = new DecoratorMetaData<T>(metadata as string);
//     }
//     else if (isTargetType(metadata, 'object')) {
//         decoratorMetaData = metadata as IDecoratorMetaData<T>;
//     }
//     else {
//         throw new Error('index.ts: meta data in Json property is undefined. meta data: ' + metadata)
//     }
//     return Reflect.defineMetadata(decoratorMetaData, value, target, JSON_META_DATA_KEY);
// }
// export function JsonProperty(options: any): PropertyDecorator {
//     console.log('entered new JsonProperty')
//     return (target: object, propertyKey: string) => {
//         let columns: string[] = Reflect.getMetadata(options, target.constructor) || [];
//         columns.push(propertyKey);
//         Reflect.defineMetadata(options, columns, target.constructor);
//     }
// }
exports.JsonProperty = (options) => {
    return (target, property) => {
        var classConstructor = target.constructor;
        const metadata = Reflect.getMetadata(JSON_META_DATA_KEY, classConstructor) || {};
        metadata[property] = options;
        Reflect.defineMetadata(JSON_META_DATA_KEY, metadata, classConstructor);
    };
};
/**
 * getClazz
 *
 * @function
 * @property {any} target object
 * @property {string} propertyKey, used as target property
 * @return {Function} Function/Class indicate the target property type
 * @description Used for type checking, if it is not primitive type, loop inside recursively
 */
function getClazz(target, propertyKey) {
    return Reflect.getMetadata('design:type', target, propertyKey);
}
/**
 * getJsonProperty
 *
 * @function
 * @property {any} target object
 * @property {string} propertyKey, used as target property
 * @return {IDecoratorMetaData<T>} Obtain target property decorator meta data
 */
function getJsonProperty(target, propertyKey) {
    return Reflect.getMetadata(JSON_META_DATA_KEY, target, propertyKey);
}
function getJsonProperty2(target, propertyKey) {
    let data = Reflect.getOwnMetadata(JSON_META_DATA_KEY, target);
    return data[propertyKey];
}
/**
 * hasAnyNullOrUndefined
 *
 * @function
 * @property {...args:any[]} any arguments
 * @return {IDecoratorMetaData<T>} check if any arguments is null or undefined
 */
function hasAnyNullOrUndefined(...args) {
    return args.some((arg) => arg === null || arg === undefined);
}
function mapFromJson(decoratorMetadata, instance, json, key) {
    /**
     * if decorator name is not found, use target property key as decorator name. It means mapping it directly
     */
    let decoratorName = decoratorMetadata.name || key;
    let innerJson = json ? json[decoratorName] : undefined;
    let clazz = getClazz(instance, key);
    if (utils_1.isArrayOrArrayClass(clazz)) {
        let metadata = getJsonProperty(instance, key);
        if (metadata && metadata.clazz || utils_1.isPrimitiveOrPrimitiveClass(clazz)) {
            if (innerJson && utils_1.isArrayOrArrayClass(innerJson)) {
                return innerJson.map((item) => deserialize(metadata.clazz, item));
            }
            return;
        }
        else {
            return innerJson;
        }
    }
    if (!utils_1.isPrimitiveOrPrimitiveClass(clazz)) {
        return deserialize(clazz, innerJson);
    }
    return json ? json[decoratorName] : undefined;
}
/**
 * deserialize
 *
 * @function
 * @param {{new():T}} clazz, class type which is going to initialize and hold a mapping json
 * @param {Object} json, input json object which to be mapped
 *
 * @return {T} return mapped object
 */
function deserialize(Clazz, json) {
    /**
     * As it is a recursive function, ignore any arguments that are unset
     */
    if (hasAnyNullOrUndefined(Clazz, json)) {
        return void 0;
    }
    /**
     * Prevent non-json continue
     */
    if (!utils_1.isTargetType(json, 'object')) {
        return void 0;
    }
    /**
     * init root class to contain json
     */
    let instance = new Clazz();
    Object.keys(instance).forEach((key) => {
        /**
         * get decoratorMetaData, structure: { name?:string, clazz?:{ new():T } }
         */
        let decoratorMetaData = getJsonProperty(instance, key);
        /**
         * pass value to instance
         */
        if (decoratorMetaData && decoratorMetaData.customConverter) {
            instance[key] = decoratorMetaData.customConverter.fromJson(json[decoratorMetaData.name || key]);
        }
        else {
            instance[key] = decoratorMetaData ? mapFromJson(decoratorMetaData, instance, json, key) : json[key];
        }
    });
    return instance;
}
exports.deserialize = deserialize;
/**
 * Serialize: Creates a ready-for-json-serialization object from the provided model instance.
 * Only @JsonProperty decorated properties in the model instance are processed.
 *
 * @param model an instance of a model class
 * @param instance an instance of a model class
 * @returns {any} an object ready to be serialized to JSON
 */
function serialize(instance, model) {
    console.log('enter serialize shit____adcvsdvadfvadf__');
    if (!utils_1.isTargetType(instance, 'object') || utils_1.isArrayOrArrayClass(instance)) {
        return instance;
    }
    const obj = {};
    Object.keys(instance).forEach((key) => {
        const metadata = model ? getJsonProperty2(model, key) : getJsonProperty(instance, key);
        // console.log(metadata)
        obj[metadata] = instance[key];
    });
    // console.log(obj)
    return obj;
}
exports.serialize = serialize;
/**
 * Prepare a single property to be serialized to JSON.
 *
 * @param metadata
 * @param prop
 * @returns {any}
 */
function serializeProperty(metadata, prop) {
    if (!metadata || metadata.excludeToJson === true) {
        return;
    }
    if (metadata.customConverter) {
        return metadata.customConverter.toJson(prop);
    }
    if (!metadata.clazz) {
        return prop;
    }
    if (utils_1.isArrayOrArrayClass(prop)) {
        return prop.map((propItem) => serialize(propItem));
    }
    return serialize(prop);
}
//# sourceMappingURL=index.js.map