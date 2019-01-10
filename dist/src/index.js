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
exports.JsonProperty = (options) => {
    return (target, property) => {
        var classConstructor = target.constructor;
        const metadata = Reflect.getMetadata(property, classConstructor) || {};
        metadata[JSON_META_DATA_KEY] = options;
        Reflect.defineMetadata(property, metadata, classConstructor);
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
    return Reflect.getOwnMetadata(propertyKey, target);
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
        let decoratorMetaData = getJsonProperty(Clazz, key);
        /**
         * pass value to instance
         */
        if (decoratorMetaData && decoratorMetaData.customConverter) {
            instance[key] = decoratorMetaData.customConverter.fromJson(json[decoratorMetaData[JSON_META_DATA_KEY] || key]);
        }
        else {
            instance[key] = decoratorMetaData ? json[decoratorMetaData[JSON_META_DATA_KEY]] :
                mapFromJson(decoratorMetaData, instance, json, decoratorMetaData[JSON_META_DATA_KEY]);
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
    if (!utils_1.isTargetType(instance, 'object') || utils_1.isArrayOrArrayClass(instance)) {
        return instance;
    }
    const obj = {};
    Object.keys(instance).forEach((key) => {
        const metadata = getJsonProperty(model, key);
        if (metadata && metadata[JSON_META_DATA_KEY]) {
            obj[metadata[JSON_META_DATA_KEY]] = serializeProperty(metadata, instance[key], model);
        }
    });
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
function serializeProperty(metadata, prop, model) {
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
        return prop.map((propItem) => serialize(propItem, model));
    }
    return serialize(prop);
}
//# sourceMappingURL=index.js.map