const cliTable = require("cli-table3");

const resultNotify = (response, context) => {
    if (!response || response === []) {
        console.log("No data to upload");
        return;
    }
    switch (context) {
        case "content_type":
            notifyCtd(response);
            break;
        case "content_object":
            notifyCo(response);
            break;
        case "media":
            notifyMedia(response);
            break;
        default:
            console.log("Invalid context! ", context);
    }
}

async function notifyCtd(response) {
    let ctd = {};
    let totalSuccess = 0;
    let totalError = 0;
    let warnings = [];

    for (let record in response) {
        ctd[record] = await response[record].json();
        if (response[record]?.status < 200 || response[record]?.status >= 300) {
            totalError++;
            warnings.push({
                label: response[record].label,
                warning: typeOutWarnings(ctd[record], "Status: " + response[record]?.status)
            });
        } else totalSuccess++;
    }

    const notifyTable = new cliTable({});
    notifyTable.push([{
        colSpan: 2,
        content: "Imported content types"
    }], [
        "TOTAL", totalSuccess + totalError
    ], [
        "Success count", totalSuccess
    ], [
        "Error count", totalError
    ]);

    if (totalError > 0) {
        notifyTable.push([{
            colSpan: 2,
            content: "WARNINGS"
        }]);

        for (let record in warnings) {
            notifyTable.push([
                warnings[record].label, warnings[record].warning
            ])
        }
    }

    console.log(notifyTable.toString());
}

function notifyMedia(response) {
    const notifyTable = new cliTable();
    let totalSuccess = 0;
    let totalError = 0;
    for (let record in response) {
        if (!response[record].code) {
            totalSuccess++;
        } else {
            totalError++;
        }
    }
    notifyTable.push([{
        colSpan: 2,
        content: "Imported media"
    }], [
        "TOTAL", totalSuccess + totalError
    ], [
        "Success count", totalSuccess
    ], [
        "Error count", totalError
    ]);
    if (totalError > 0) {
        notifyTable.push([{
            colSpan: 2,
            content: "WARNINGS",
        }], [
            "Contentful asset ID", "Warning"
        ]);
        for (let record in response) {
            if (!!response[record].code) {
                notifyTable.push([
                    record, response[record].code + ": " + response[record].reason + "\n" + response[record].message
                ]);
            }
        }
    }
    console.log(notifyTable.toString());
}

async function notifyCo(response) {
    const notifyTable = new cliTable();
    notifyTable.push([{
        colSpan: 3,
        content: "Imported content objects",
    }], [
        "Content Type", "Success count", "Error count"
    ]);
    let co = {};
    let totalSuccess = 0;
    let totalError = 0;
    let warnings = [];
    for (let contentType in response) {
        co.contentType = await response[contentType].json();
        if (co.contentType.batch_total_count) {
            totalSuccess += co.contentType.batch_success_count;
            totalError += co.contentType.batch_error_count;
            notifyTable.push([contentType, co.contentType.batch_success_count, co.contentType.batch_error_count]);
            if (co.contentType.batch_error_count > 0) {
                warnings.push([contentType, co.contentType.errors])
            }
        } else {
            notifyTable.push([contentType, 0]);
            warnings.push([contentType, co.contentType, "batchError"])
        }
    }
    notifyTable.push(["TOTAL", totalSuccess, totalError]);

    if (warnings.length !== 0) {
        notifyTable.push([{
            colSpan: 3,
            content: "WARNINGS",
        }], [
            "Content Type", "Content object ID", "Warning"
        ]);
        for (let element in warnings) {
            if (warnings[element][2] === "batchError") {
                notifyTable.push([
                    warnings[element][0],
                    {
                        colSpan: 2,
                        content: typeOutWarnings(warnings[element][1], "General batch error:")
                    }
                ]);
            } else {
                for (let object in warnings[element][1]) {
                    notifyTable.push([
                        warnings[element][0],
                        warnings[element][1][object].id,
                        typeOutWarnings(warnings[element][1][object].errors)
                    ]);
                }
            }
        }
    }
    console.log(notifyTable.toString());
}
function typeOutWarnings(data, starting_line = "") {
    let text = "";
    text += starting_line;
    for (let field in data) {
        if (field === "") text += data[field];
    }
    for (let field in data) {
        if (field === "") continue;
        text += "\n\n" + field + ": " + data[field];
    }
    return text;
}

module.exports = { resultNotify };
