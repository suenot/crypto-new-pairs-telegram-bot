import Binance from 'binance-api-node';
import { Telegraf } from 'telegraf';
import { Ticker } from 'binance-api-node'
import * as dotenv from 'dotenv'
import { message } from 'telegraf/filters'
import * as ccxt from 'ccxt';

dotenv.config()

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN as string
const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID as string
const BINANCE_API_KEY: string = process.env.BINANCE_API_KEY as string
const BINANCE_API_SECRET: string = process.env.BINANCE_API_SECRET as string

const binance = Binance({
  apiKey: BINANCE_API_KEY,
  apiSecret: BINANCE_API_SECRET
});

const bot = new Telegraf(TELEGRAM_BOT_TOKEN as string);

let cachedPairs: string[] = []
let cachedFuturesPairs: string[] = []
let cachedBitfinexPairs: string[] = []
let cachedBigonePairs: string[] = []
let cachedBybitPairs: string[] = []

const fetchBitfinexPairs = async (ctx) => {
  const bitfinex = new ccxt.bitfinex();
  const markets = await bitfinex.loadMarkets();
  const pairs = Object.keys(markets);
  const newPairs = pairs.filter(p => !cachedBitfinexPairs.includes(p));
  cachedBitfinexPairs = pairs;
  if (newPairs.length > 0) {
      ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New pairs on Bitfinex: ${newPairs.join(', ')}`.slice(0, 100));
  }
}

const fetchBigonePairs = async (ctx) => {
  const bigone = new ccxt.bigone();
  const markets = await bigone.loadMarkets();
  const pairs = Object.keys(markets);
  const newPairs = pairs.filter(p => !cachedBigonePairs.includes(p));
  cachedBigonePairs = pairs;
  if (newPairs.length > 0) {
      ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New pairs on Bigone: ${newPairs.join(', ')}`.slice(0, 100));
  }
}

const fetchBybitPairs = async (ctx) => {
  const bybit = new ccxt.bybit();
  const markets = await bybit.loadMarkets();
  const pairs = Object.keys(markets);
  const newPairs = pairs.filter(p => !cachedBybitPairs.includes(p));
  cachedBybitPairs = pairs;
  if (newPairs.length > 0) {
      ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New pairs on Bybit: ${newPairs.join(', ')}`.slice(0, 100));
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
          ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New spot pairs on Binance: ${newPairs.join(', ')}`.slice(0, 100));
      }
  });

  // check futures pairs
  binance.futuresExchangeInfo().then((exchangeInfo) => {
    const pairs = exchangeInfo.symbols.map((symbol: any) => symbol.symbol);
    const newPairs = pairs.filter(p => !cachedFuturesPairs.includes(p));
    cachedFuturesPairs = pairs;
    if (newPairs.length > 0) {
      ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, `New futures pairs on Binance: ${newPairs.join(', ')}`.slice(0, 100));
    }
  });

  fetchBitfinexPairs(ctx);
	fetchBigonePairs(ctx);
	fetchBybitPairs(ctx);
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
