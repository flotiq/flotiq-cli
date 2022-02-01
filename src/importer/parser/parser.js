const dateParser = require('./parsers/date');

const parsers = [
    dateParser
];

const parser = (contentObject) => {
    return deepMap(contentObject, (val) => {
        parsers.forEach((parser) => {
            val = parser(val);
        });
        return val;
    });
}

const deepMap = (obj, fn) => {
    let newObj = {};
    Object.keys(obj).forEach(function(key) {
        let value = obj[key];
        if (value !== null && typeof value === 'object') {
            newObj[key] = deepMap(value, fn);
        } else {
            newObj[key] = fn(value);
        }
    });
    return newObj;
};

module.exports = parser;
