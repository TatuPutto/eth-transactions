const Web3Eth = require('web3-eth');
const Web3 = require('web3');
const fs = require('fs');

const erc20Abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

const tx = {
    "blockNumber": "11426087",
    "timeStamp": "1607615558",
    "hash": "0x96a0754b59c8f4e356560f04ccc8960e3dc1f6d4b45956b85bb7003200f49f55",
    "nonce": "970",
    "blockHash": "0xfe467eb6ebc4c50f800e78cfaf2b7d8f8882c1f5040c5c24b78c6b05b01e3652",
    "transactionIndex": "56",
    "from": "0x40214ebdf45262c9ea4abdf1be822e6af67b6f64",
    "to": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "value": "0",
    "gas": "190025",
    "gasPrice": "40000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x8803dbee000000000000000000000000000000000000000000000002b5e3af16b1880000000000000000000000000000000000000000000000000000000000001f667cd000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000040214ebdf45262c9ea4abdf1be822e6af67b6f64000000000000000000000000000000000000000000000000000000005fd2465c0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000875773784af8135ea0ef43b5a374aad105c5d39e",
    "contractAddress": "",
    "cumulativeGasUsed": "5088348",
    "gasUsed": "174430",
    "confirmations": "1654441"
};

function createWeb3EthConnection() {
    const web3EthConnection = new Web3Eth('wss://mainnet.infura.io/ws/v3/1f8b67eb53ca423e827309a6bcc80351'); 
    return web3EthConnection.net.isListening()
        .then(() => web3EthConnection);
}

createWeb3EthConnection()
    .then(web3EthConnection => {
        /*return web3EthConnection.getTransactionReceipt(tx.hash).then(receipt => {
            const logs = receipt.logs;
            console.log('typeof', typeof logs);
            console.log('logs', logs);
            fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));
        });*/
    });

