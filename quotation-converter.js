const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');

(function writeToFile() {
    const {
        inputPath = './ethereum-prices.json',
        outputPath = './parsed-ethereum-prices.json',
        format = 'utf8',
    } = process.argv;

    const ethPrices = JSON.parse(fs.readFileSync(inputPath, format));
    const compatiblePriceData= JSON.stringify(convert(ethPrices), null, 4);

    return fs.writeFileSync(outputPath, compatiblePriceData, { encoding: format });
})();

function convert() {
    const ethPrices = JSON.parse(fs.readFileSync('./ethereum-prices.json', 'utf8'));
    const groupedPricesByMonth = Object.entries(ethPrices).reduce((groupedPricesByMonth, [date, price]) => {
        const dateAsMomentObj = moment.utc(date);
        const month = dateAsMomentObj.month() + 1;
        const dayOfMonth = dateAsMomentObj.date();
        const hour = dateAsMomentObj.hour();
        const { USD: usdValues } = price;
        const usd = usdValues[0];
    
        if (_.has(groupedPricesByMonth, month)) {
            if (_.has(groupedPricesByMonth, [month, dayOfMonth])) {
                _.set(groupedPricesByMonth, [month, dayOfMonth], {
                    ...groupedPricesByMonth[month][dayOfMonth],
                    [hour]: usd,
                });
                /*groupedPricesByMonth[month][dayOfMonth] = {
                    ...groupedPricesByMonth[month][dayOfMonth],
                    [hour]: usd
                }

                groupedPricesByMonth[month][dayOfMonth] =
                    groupedPricesByMonth[month][dayOfMonth].concat([usd]);*/
            } else {
                _.set(groupedPricesByMonth, [month, dayOfMonth], {});
                _.set(groupedPricesByMonth, [month, dayOfMonth, hour], usd)
                // _.set(groupedPricesByMonth, [month, dayOfMonth, hour], usd);
            }
        } else {
            _.set(groupedPricesByMonth, month, {});
            _.set(groupedPricesByMonth, [month, dayOfMonth], {});
            _.set(groupedPricesByMonth, [month, dayOfMonth, hour], usd)
        }

        return groupedPricesByMonth;
    }, {});

    console.log('groupedPricesByMonth', groupedPricesByMonth);
    return groupedPricesByMonth;
}