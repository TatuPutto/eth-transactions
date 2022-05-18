const fs = require('fs');
const path = require('path');
const Units = require('ethereumjs-units');
const moment = require('moment');
const Web3Eth = require('web3-eth');
const _ = require('lodash');

const walletAddress = process.argv[3].toLowerCase();
const year = process.argv[4] && process.argv[4].toLowerCase() || '20';
const transactions = JSON.parse(fs.readFileSync(`./${walletAddress}.json`, 'utf-8')); 
const whitelistedtransactions = JSON.parse(fs.readFileSync('./whitelist.json', 'utf-8'));
const ethPrices2020 = JSON.parse(fs.readFileSync('./parsed-ethereum-prices-2020.json', 'utf-8'));
const ethPrices2021 = JSON.parse(fs.readFileSync('./parsed-ethereum-prices-2021.json', 'utf-8'));
const eurExchangeRates = JSON.parse(fs.readFileSync('./eur-usd-rate.json', 'utf-8'));

function createWeb3EthConnection() {
    const web3EthConnection = new Web3Eth('wss://mainnet.infura.io/ws/v3/1f8b67eb53ca423e827309a6bcc80351'); 
    return web3EthConnection.net.isListening()
        .then(() => web3EthConnection);
}

function toGwei(value) {
    return Units.convert(value, 'wei', 'gwei');
}

function toEth(value) {
    return Units.convert(value, 'gwei', 'eth');
}

function epochToDate(epoch) {
    return moment.unix(epoch);
}

function filterTransactionsByYear(tx) {
    const date = epochToDate(tx.timeStamp);
    const targetYear = 20 + year;
    return date.year() === parseInt(targetYear);
}

function filterTransactionsByMonth(tx, month) {
    const date = epochToDate(tx.timeStamp);
    return date.month() + 1 === month;
}

function getTransactionDate(tx) {
    return epochToDate(tx.timeStamp);
}

function getEthPriceAtTimeOfExecution(tx, toEur) {
    const date = getTransactionDate(tx);
    const month = date.month() + 1;
    const day = date.date();
    const hour = date.hour();
    const usdPrice = ethPrices[month][day][hour];
    
    if (toEur) {
        return usdPrice / eurExchangeRates[month];
    }

    return usdPrice;
}


////////////////////////////////////////////////////
//////////////// BUY METHODS ///////////////////////
////////////////////////////////////////////////////

// swapExactTokensForETH
function isEthBuy(tx) {
    return tx.input.substring(2, 10) === '18cbafe5';
}

// swapTokensForExactETH
function isExactEthBuy(tx) {
    return tx.input.substring(2, 10) === '4a25d94a';
}

// swapExactTokensForETHSupportingFeeOnTransferTokens
function isEthBuyWithBurnFees(tx) {
    return tx.input.substring(2, 10) === '791ac947';
}

////////////////////////////////////////////////////
//////////////// SELL METHODS //////////////////////
////////////////////////////////////////////////////

// swapETHForExactTokens
function isEthSell(tx) {
    return tx.input.substring(2, 10) === 'fb3bdb41';
}

// swapExactETHForTokens
function isExactEthSell(tx) {
    return tx.input.substring(2, 10) === '7ff36ab5';
}


////////////////////////////////////////////////////
////////////////// LP METHODS //////////////////////
////////////////////////////////////////////////////

// addLiquidity
function isLpDeposit(tx) {
    return tx.input.substring(2, 10) === 'e8e33700';
}

// addLiquidityETH
function isLpDepositEth(tx) {
    return tx.input.substring(2, 10) === 'f305d719';
}

// removeLiquidityWithPermit
function isLpWithdrawalWithPermit(tx) {
    return tx.input.substring(2, 10) === '2195995c';
}

// removeLiquidityETHWithPermit
function isLpWithdrawalEthWithPermit(tx) {
    return tx.input.substring(2, 10) === 'ded9382a';
}

// removeLiquidityETHSupportingFeeOnTransferTokens
function isLpWithdrawalEthWithBurnFees(tx) {
    return tx.input.substring(2, 10) === 'af2979eb';
}

// removeLiquidityETHWithPermitSupportingFeeOnTransferTokens
function isLpWithdrawalEthWithPermitAndBurnFees(tx) {
    return tx.input.substring(2, 10) === '5b0d5984';
}


function isWhitelisted(tx, isBuy = true) {
    // console.log('Checking', tx.hash);
    const action = isBuy ? 'buy' : 'sell';
    if (_.has(whitelistedtransactions, [walletAddress, action])) {
        // console.log('is included', whitelistedtransactions[walletAddress][action].some(hash => hash === tx.hash));
        return whitelistedtransactions[walletAddress][action].some(hash => hash === tx.hash);
    }
    return false;
}

function isCancelledEthSell(tx) {
    if (!isEthSell(tx)) return false;

    return tx.isError === '1';
}

function filterByStatus(tx) {
    return tx.isError === '0';
}

function getCombinedWeiUsed(acc, tx) {
    return acc += parseInt(tx.value);
}

function getCombinedPrice(acc, tx, inEur = false) {
    const usdPrice = getEthPriceAtTimeOfExecution(tx, inEur);
    const ethAmount = Units.convert(tx.value, 'wei', 'eth');
    const totalPriceInUsd = ethAmount * usdPrice;
    return acc += totalPriceInUsd;
}

function calculateGasCost() {
    const transactionsIn2020 = transactions.filter(filterTransactionsByYear).filter(filterByStatus);
    const totalGasFeesInGwei = transactionsIn2020.reduce((totalGas, tx) => {
        return totalGas += toGwei(tx.gasPrice) * tx.gasUsed;
    }, 0);
    
    const totalGasFeesInUsd = transactionsIn2020.reduce((totalGasInUsd, tx) => {
        const txGasInEth = Units.convert(tx.gasPrice * tx.gasUsed, 'wei', 'eth');
        return totalGasInUsd += txGasInEth * getEthPriceAtTimeOfExecution(tx);
    }, 0);

    const totalGasFeesInEur = transactionsIn2020.reduce((totalGasInUsd, tx) => {
        const txGasInEth = Units.convert(tx.gasPrice * tx.gasUsed, 'wei', 'eth');
        return totalGasInUsd += txGasInEth * getEthPriceAtTimeOfExecution(tx, true);
    }, 0);

    console.log(transactionsIn2020.length, 'transactions in 2020, which cost:', toEth(totalGasFeesInGwei), 'ETH and', '$' + totalGasFeesInUsd, '(€' + totalGasFeesInEur + ')' + ', with average of', '$' + totalGasFeesInUsd / transactionsIn2020.length, 'per transaction.');
    
    return toEth(totalGasFeesInGwei);
}

function calculateBuys(web3EthConnection) {
    const transactionsIn2020 = transactions.filter(filterTransactionsByYear).filter(filterByStatus);
    const swapTokensForEth = transactionsIn2020.filter(isEthBuy);
    const swapTokensForExactEth = transactionsIn2020.filter(isExactEthBuy);
    const swapTokensForEthWithBurn = transactionsIn2020.filter(isEthBuyWithBurnFees);
    const nonUniswapEthBuys = transactionsIn2020.filter(tx => isWhitelisted(tx, true));
    const allBuyTransactions = [
        ...swapTokensForEth,
        ...swapTokensForExactEth,
        ...swapTokensForEthWithBurn,
        ...nonUniswapEthBuys,
    ];

    console.log('Buy transactions', allBuyTransactions.length, 'of which', nonUniswapEthBuys.length, 'are non uniswap swaps');

    let buysInUsd = 0;
    let buysInEur = 0;
    let buysInEth = 0;

    allBuyTransactions.reduce((previousPromise, tx, i, arr) => {     
        return previousPromise.then(() => {
            console.log('\nGetting receipt of tx', tx.hash);
            return web3EthConnection.getTransactionReceipt(tx.hash).then(receipt => {
                const logs = receipt.logs;
                const withdrawLog = logs[logs.length - 1];
                const receivedWei = parseInt(withdrawLog.data, 16); 
                const receivedEth = parseFloat(Units.convert(receivedWei, 'wei', 'eth'));
                console.log('received wei', receivedWei);
                console.log('received Eth', receivedEth);
                buysInUsd += (receivedEth * getEthPriceAtTimeOfExecution(tx));
                buysInEur += (receivedEth * getEthPriceAtTimeOfExecution(tx, true));
                buysInEth += receivedEth;

                if (i === arr.length - 1) {
                    console.log('\nTotal buys in usd', buysInUsd);
                    console.log('Total buys in eur', buysInEur);
                    console.log('Total buys in eth', buysInEth);
                }
            })
        });
    }, Promise.resolve());
}

function calculateSells() {
    const transactionsIn2020 = transactions.filter(filterTransactionsByYear).filter(filterByStatus);
    const swapEthForTokens = transactionsIn2020.filter(isEthSell);
    const swapExactEthForTokens = transactionsIn2020.filter(isExactEthSell);
    const nonUniswapEthSells = transactionsIn2020.filter(tx => isWhitelisted(tx, false));
    const allSells = [
        ...swapEthForTokens,
        ...swapExactEthForTokens,
        ...nonUniswapEthSells,
    ];

    const sellsInUsd = allSells.reduce((acc, tx) => getCombinedPrice(acc, tx, false), 0);
    const sellsInEur = allSells.reduce((acc, tx) => getCombinedPrice(acc, tx, true), 0);
    const totalWei = allSells.reduce(getCombinedWeiUsed, 0);
    const totalEth = toEth(toGwei(totalWei));

    console.log('Sell transactions', allSells.length, 'of which', nonUniswapEthSells.length, 'are non uniswap swaps');
    console.log('Total sells in usd', sellsInUsd);
    console.log('Total sells in eur', sellsInEur);
    console.log('Total sells in eth', totalEth);
    console.log('Total sells in wei', totalWei);
}

function calculateLiquidityDeposits() {
    const transactionsIn2020 = transactions.filter(filterTransactionsByYear).filter(filterByStatus);
    const depositEthLp = transactionsIn2020.filter(isLpDepositEth);
    const depositsInUsd = depositEthLp.reduce((acc, tx) => getCombinedPrice(acc, tx, false), 0);
    const depositsInEur = depositEthLp.reduce((acc, tx) => getCombinedPrice(acc, tx, true), 0);
    const totalWei = depositEthLp.reduce(getCombinedWeiUsed, 0);
    const totalEth = toEth(toGwei(totalWei));

    console.log('ETH lp deposits', depositEthLp.length);
    console.log('Total deposits in usd', depositsInUsd);
    console.log('Total deposits in eur', depositsInEur);
    console.log('Total deposits in eth', totalEth);
    console.log('Total deposits in wei', totalWei);
}

function calculateLiquidityWithdrawals(web3EthConnection) {
    const transactionsIn2020 = transactions.filter(filterTransactionsByYear).filter(filterByStatus);
    const withdrawEthLpWithPermit = transactionsIn2020.filter(isLpWithdrawalEthWithPermit);
    const withdrawEthLpWithBurnFees = transactionsIn2020.filter(isLpWithdrawalEthWithBurnFees);
    const withdrawEthLpWithPermitAndBurnFees = transactionsIn2020.filter(isLpWithdrawalEthWithPermitAndBurnFees);
    const allWithdrawals = [
        ...withdrawEthLpWithPermit,
        ...withdrawEthLpWithBurnFees,
        ...withdrawEthLpWithPermitAndBurnFees,
    ];

    console.log('LP withdrawal transactions', allWithdrawals.length);

    let withdrawalsInUsd = 0;
    let withdrawalsInEur = 0;
    let withdrawalsInEth = 0;

    allWithdrawals.reduce((previousPromise, tx, i, arr) => {     
        return previousPromise.then(() => {
            console.log('\nGetting receipt of tx', tx.hash);
            return web3EthConnection.getTransactionReceipt(tx.hash).then(receipt => {
                const logs = receipt.logs;
                const withdrawLog = logs[logs.length - 1];
                const receivedWei = parseInt(withdrawLog.data, 16); 
                const receivedEth = parseFloat(Units.convert(receivedWei, 'wei', 'eth'));
                console.log('received wei', receivedWei);
                console.log('received Eth', receivedEth);
                withdrawalsInUsd += (receivedEth * getEthPriceAtTimeOfExecution(tx));
                withdrawalsInEur += (receivedEth * getEthPriceAtTimeOfExecution(tx, true));
                withdrawalsInEth += receivedEth;

                if (i === arr.length - 1) {
                    console.log('\nTotal withdrawals in usd', withdrawalsInUsd);
                    console.log('Total withdrawals in eur', withdrawalsInEur);
                    console.log('Total withdrawals in eth', withdrawalsInEth);
                }
            })
        });
    }, Promise.resolve());
}


(function start() {
    const txType = process.argv[2];
    if (txType === 'buy') {
        createWeb3EthConnection().then(calculateBuys);
    } else if (txType === 'sell') {
        calculateSells();
    } else if (txType === 'gas') {
        calculateGasCost();
    } else if (txType === 'deposit') {
        calculateLiquidityDeposits();
    } else if (txType === 'withdraw') {
        createWeb3EthConnection().then(calculateLiquidityWithdrawals);
    }
})();

