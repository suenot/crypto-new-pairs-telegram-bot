import Binance from 'binance-api-node';
import { Telegraf } from 'telegraf';
import { Ticker } from 'binance-api-node'
import * as dotenv from 'dotenv'
import { message } from 'telegraf/filters'

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

let cachedPairs: any[] = []
let cachedFuturesPairs: any[] = []

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
