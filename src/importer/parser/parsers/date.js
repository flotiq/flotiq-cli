/**
 * Parse date function
 * Transformations examples:
 * {{date}} => now => 2022-01-01
 * {{date:+5d}} => now + 5 days => 2022-01-06
 * {{date:-5m}} => now - 5 months => 2021-06-01
 * {{date:+5y}} => now + 5 years => 2027-01-01
 *
 * @param val
 * @returns {string|*}
 */

const parse = (val) => {
    if(typeof val !== "string") {
        return val;
    }
    const condition = /{{(date)(:(?<param>(?<count>[+-]?\d+)(?<type>[ymd])))?}}/gm
    return val.replace(condition, (...attrs) => {
        const dt = new Date();
        const params = attrs[8]; // e.g. +5d
        if(params.param) {
            switch(params.type) {
                case 'd':
                    dt.setDate(dt.getDate() + parseInt(params.count));
                    break;
                case 'm':
                    dt.setMonth(dt.getMonth() + parseInt(params.count));
                    break;
                case 'y':
                    dt.setFullYear(dt.getFullYear() + parseInt(params.count));
                    break;
            }
        }
        return dt.toISOString().split('T')[0];
    });
}

module.exports = parse;
