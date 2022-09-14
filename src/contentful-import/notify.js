const cliTable = require("cli-table3");

const resultNotify = (response, context) => {
    // console.log(data); return; //DEL
    
    if (response && response != []) { //(?)
        if (context === "content_type") {
            notifyCtd(response);
        } else if (context === "content_object") {
            notifyCo(response);
        } else if (context === "media") {
            notifyMedia(response);
        }
    } else {
        console.log("No data to upload");
    }

    function notifyCtd(response) {
        let successCount = 0;
        response.forEach((ctd) => {
            if (ctd.status === 200) {
                successCount++;
            } else {
                //error count and warnings
            }
        });
        const notifyTable = new cliTable();
        notifyTable.push([{
            colSpan: 2,
            content: "Imported content types"
        }], [
            "Success count", successCount    
        ], [
            "Error count"/*, count*/
        ], [{
            colSpan: 2,
            content: "Warnings",
        }]);

        console.log(notifyTable.toString());
    }

    function notifyMedia(response) {
        for (record in response) {
            // console.log("\nresponse:\n", response[record]); //DEL
        }
        const notifyTable = new cliTable();
        notifyTable.push([{
            colSpan: 2,
            content: "Imported media"
        }], [
            "Success count",/*, count*/    
        ], [
            "Error count"/*, count*/
        ]);

        console.log(notifyTable.toString());
    }
    
    async function notifyCo(response) { //(?) should i skip clarifying response in arguments
        const notifyTable = new cliTable();
        notifyTable.push([{
            colSpan: 3,
            content: "Imported content objects"
        }], [
            "Content Type", "Success count", "Error count"
        ]);
        let co = {};
        let totalSuccess = 0;
        let totalError = 0;
        let warnings = [];

        for (contentType in response) {
            co.contentType = await response[contentType].json();
            // console.log(contentType, ": ", JSON.stringify(co.contentType, null, 2)); //DEL
            totalSuccess += co.contentType.batch_success_count;
            totalError += co.contentType.batch_error_count;
            notifyTable.push([contentType, co.contentType.batch_success_count, co.contentType.batch_error_count]);
        }
        notifyTable.push(["Total", totalSuccess, totalError]);
        notifyTable.push([{
            colSpan: 3,
            content: "Warnings",
        }]);
        for (element in warnings) {
            notifyTable.push([{
                colSpan: 3,
                content: warnings.element,
            }]);
        }

        console.log(notifyTable.toString());
    }
}

module.exports = { resultNotify };
