import Binance from 'binance-api-node';
import { Telegraf } from 'telegraf';
import { Ticker } from 'binance-api-node'
import * as dotenv from 'dotenv'
import { message } from 'telegraf/filters'
import * as ccxt from 'ccxt';
import debug from 'debug';
const log = debug('main');

dotenv.config()

const main = async () => {

	const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN as string
	const TELEGRAM_CHAT_NAME: string = process.env.TELEGRAM_CHAT_NAME as string
	log({TELEGRAM_CHAT_NAME})

	const bot = new Telegraf(TELEGRAM_BOT_TOKEN as string);

	const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID as string || String(await findChannelIdByName(bot, process.env.TELEGRAM_CHAT_NAME as string))
	log({TELEGRAM_CHAT_ID})

	const BINANCE_API_KEY: string = process.env.BINANCE_API_KEY as string
	const BINANCE_API_SECRET: string = process.env.BINANCE_API_SECRET as string

	const binance = Binance({
		apiKey: BINANCE_API_KEY,
		apiSecret: BINANCE_API_SECRET
	});



	let cachedPairs: string[] = []
	let cachedFuturesPairs: string[] = []

	interface Store {
		[key: string]: {
			engine: string,
			pairs: string[],
			enabled: boolean,
		}
	}

	const ccxtExchanges = [
		'alpaca',
		'ascendex',
		'bequant',
		'bigone',
		'binance',
		'binancecoinm',
		'binanceus',
		'binanceusdm',
		'bit2c',
		'bitbank',
		'bitbay',
		'bitbns',
		'bitcoincom',
		'bitfinex',
		'bitfinex2',
		'bitflyer',
		'bitforex',
		'bitget',
		'bithumb',
		'bitmart',
		'bitmex',
		'bitopro',
		'bitpanda',
		'bitrue',
		'bitso',
		'bitstamp',
		'bitstamp1',
		'bittrex',
		'bitvavo',
		'bkex',
		'bl3p',
		'blockchaincom',
		'btcalpha',
		'btcbox',
		'btcex',
		'btcmarkets',
		'btctradeua',
		'btcturk',
		'buda',
		'bybit',
		'cex',
		'coinbase',
		'coinbaseprime',
		'coinbasepro',
		'coincheck',
		'coinex',
		'coinfalcon',
		'coinmate',
		'coinone',
		'coinspot',
		'cryptocom',
		'currencycom',
		'delta',
		'deribit',
		'digifinex',
		'exmo',
		'flowbtc',
		'fmfwio',
		'gate',
		'gateio',
		'gemini',
		'hitbtc',
		'hitbtc3',
		'hollaex',
		'huobi',
		'huobijp',
		'huobipro',
		'idex',
		'independentreserve',
		'indodax',
		'itbit',
		'kraken',
		'kucoin',
		'kucoinfutures',
		'kuna',
		'latoken',
		'lbank',
		'lbank2',
		'luno',
		'lykke',
		'mercado',
		'mexc',
		'mexc3',
		'ndax',
		'novadax',
		'oceanex',
		'okcoin',
		'okex',
		'okex5',
		'okx',
		'paymium',
		'phemex',
		'poloniex',
		'poloniexfutures',
		'probit',
		'ripio',
		'stex',
		'therock',
		'tidex',
		'timex',
		'tokocrypto',
		'upbit',
		'wavesexchange',
		'wazirx',
		'whitebit',
		'woo',
		'yobit',
		'zaif',
		'zb',
		'zipmex',
		'zonda'
		]

	let store: Store = {
		bitfinex: {
			engine: 'ccxt',
			pairs: [],
			enabled: true,
		},
		bigone: {
			engine: 'ccxt',
			pairs: [],
			enabled: true,
		},
		bybit: {
			engine: 'ccxt',
			pairs: [],
			enabled: true,
		},
		binance: {
			engine: 'binance',
			pairs: [],
			enabled: true,
		},
		binancefutures: {
			engine: 'binance',
			pairs: [],
			enabled: true,
		},
	}

	async function findChannelIdByName(ctx, channelName) {
		const result = await bot.telegram.getChat(channelName);
		return result.id;
	}

	// use ccxtExchanges list to add others exchanges to the store with default values: ccxt engine, empty pairs array and disabled
	ccxtExchanges.forEach(exchange => {
		if (store[exchange]) return;
		store[exchange] = {
			engine: 'ccxt',
			pairs: [],
			enabled: false,
		}
	})

	const fetchCCXTPairs = async (ctx, exchangeName: string) => {
		const exchange = new ccxt[exchangeName]();
		const markets = await exchange.loadMarkets();
		const pairs = Object.keys(markets);
		const newPairs = pairs.filter(p => !store[exchangeName].pairs.includes(p));
		store[exchangeName].pairs = pairs;
		if (newPairs.length > 0) {
			ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New pairs on ${exchangeName}: ${newPairs.join(', ')}`.slice(0, 100));
		}
	}

	const checkForNewPairs = async (ctx) => {
		// check spot pairs
		binance.allBookTickers().then((tickers: { [key: string]: Ticker }) => {
				const pairs = Object.values(tickers).map(t => t.symbol);
				// Compare the current pairs to the cached pairs
				const newPairs = pairs.filter(p => !cachedPairs.includes(p));
				cachedPairs = pairs;
				// If there are new pairs, post a message to Telegram
				if (newPairs.length > 0) {
						ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New SPOT pairs on Binance: ${newPairs.join(', ')}`.slice(0, 100));
				}
		});

		// check futures pairs
		binance.futuresExchangeInfo().then((exchangeInfo) => {
			const pairs = exchangeInfo.symbols.map((symbol: any) => symbol.symbol);
			const newPairs = pairs.filter(p => !cachedFuturesPairs.includes(p));
			cachedFuturesPairs = pairs;
			if (newPairs.length > 0) {
				ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New FUTURES pairs on Binance: ${newPairs.join(', ')}`.slice(0, 100));
			}
		});

		// for cycle for all exchanges with ccxt engine and enabled: run fetchCCXTPairs
		for (const exchangeName in store) {
			if (store[exchangeName].engine === 'ccxt' && store[exchangeName].enabled) {
				fetchCCXTPairs(ctx, exchangeName);
			}
		}
	}

	bot.start((ctx) => ctx.reply('Welcome'));

	bot.command('newpairs', (ctx) => {
		// Fetch the current list of trading pairs from Binance
		checkForNewPairs(ctx);
	});

	bot.on(message('text'), async (ctx) => {
		ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `hi`);
	});

	bot.launch();

	setInterval(() => {
		checkForNewPairs(bot);
	}, 60000);

}
main();
