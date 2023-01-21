import Binance from 'binance-api-node';
import { Telegraf } from 'telegraf';
import { Ticker } from 'binance-api-node'
import * as dotenv from 'dotenv'
import * as ccxt from 'ccxt';
import debug from 'debug';
const log = debug('main');

dotenv.config()

const main = async () => {
  const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN as string
  const bot = new Telegraf(TELEGRAM_BOT_TOKEN as string);

  //add array to store admin ids
  let botAdmins: number[] = [];
  if (process.env?.TELEGRAM_BOT_ADMIN_IDS) {
    botAdmins = (process.env.TELEGRAM_BOT_ADMIN_IDS as string).split(',').map((item) => Number(item));
    log({botAdmins})
  } else {
    const botAdminNames = (process.env.TELEGRAM_BOT_ADMIN_NAMES as string).split(',');
    log({botAdminNames})
    botAdminNames.forEach(async (username) => {
        const adminId = await findChannelIdByName(bot, '@'+username);
        botAdmins.push(adminId);
    });
    log({botAdmins})
  }

  const TELEGRAM_CHAT_NAME: string = '@'+(process.env.TELEGRAM_CHAT_NAME as string)
  log({TELEGRAM_CHAT_NAME})

  const TELEGRAM_CHAT_ID: string = String(await findChannelIdByName(bot, TELEGRAM_CHAT_NAME))
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
      engineInstance?: any,
      pairs: string[],
      enabled: boolean,
    }
  }

  const ccxtExchanges = [
    'alpaca',
    'ascendex',
    'bequant',
    'bigone',
    // 'binance',
    // 'binancecoinm',
    // 'binanceus',
    // 'binanceusdm',
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
    log('fn findChannelIdByName');
    log({channelName});
    const chat = await bot.telegram.getChat(channelName);
    log({chat, chatId: chat.id})
    return chat.id;
  }

  // use ccxtExchanges list to add others exchanges to the store with default values: ccxt engine, empty pairs array and disabled
  ccxtExchanges.forEach(exchange => {
    if (store[exchange]) return;
    try {
      store[exchange] = {
        engine: 'ccxt',
        pairs: [],
        enabled: true,
        engineInstance: new ccxt[exchange](),
      }
    } catch (e) {
      log(`Error creating ccxt instance for ${exchange}`);
    }
  })

  const fetchCCXTPairs = async (ctx, exchangeName: string) => {
    try {
      const exchange = store[exchangeName].engineInstance;
      const markets = await exchange.loadMarkets();
      const pairs = Object.keys(markets);
      const newPairs = pairs.filter(p => !store[exchangeName].pairs.includes(p));
      store[exchangeName].pairs = pairs;
      if (newPairs.length > 0) {
        const message = `New pairs on ${exchangeName}: ${newPairs.join(', ')}`;
        if (message.length > 100) {
          ctx.telegram.sendMessage(botAdmins?.[0], `Start comparing pairs on ${exchangeName}`);
        } else {
          ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
        }
      }
    } catch (e) {
      log(`Error fetching pairs from ${exchangeName}`);
    }
  }

  const checkForNewPairs = async (ctx) => {
    try {
      // check spot pairs
      binance.allBookTickers().then((tickers: { [key: string]: Ticker }) => {
        const pairs = Object.values(tickers).map(t => t.symbol);
        // Compare the current pairs to the cached pairs
        const newPairs = pairs.filter(p => !cachedPairs.includes(p));
        cachedPairs = pairs;
        // If there are new pairs, post a message to Telegram
        if (newPairs.length > 0) {
          const message = `New SPOT pairs on Binance: ${newPairs.join(', ')}`;
          if (message.length > 100) {
            ctx.telegram.sendMessage(botAdmins?.[0], 'Start comparing pairs on Binance Spot');
          } else {
            ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
          }
        }
      });
    } catch (e) {
      log('Error fetching pairs from Binance');
    }

    try {
      // check futures pairs
      binance.futuresExchangeInfo().then((exchangeInfo) => {
        const pairs = exchangeInfo.symbols.map((symbol: any) => symbol.symbol);
        const newPairs = pairs.filter(p => !cachedFuturesPairs.includes(p));
        cachedFuturesPairs = pairs;
        if (newPairs.length > 0) {
          const message = `New FUTURES pairs on Binance: ${newPairs.join(', ')}`;
          if (message.length > 100) {
            ctx.telegram.sendMessage(botAdmins?.[0], 'Start comparing pairs on Binance Futures');
          } else {
            ctx.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
          }
        }
      });
    } catch (e) {
      log('Error fetching pairs from Binance Futures');
    }


    // for cycle for all exchanges with ccxt engine and enabled: run fetchCCXTPairs
    for (const exchangeName in store) {
      if (store[exchangeName].engine === 'ccxt' && store[exchangeName].enabled) {
        fetchCCXTPairs(ctx, exchangeName);
      }
    }
  }

  bot.start((ctx) => ctx.reply('Welcome'));

  // adding the middleware to check if user is admin
  bot.use((ctx, next) => {
    const userId = ctx?.message?.from?.id || -1;
    if (!botAdmins.includes(userId)) {
        ctx.reply("Sorry, you do not have permission to perform this action.");
        console.log("Sorry, you do not have permission to perform this action." + userId + " " + typeof(userId));
        return
    }
    return next();
  });

  // adding command to enable exchange
  bot.command("enable", (ctx) => {
      const exchange = ctx.message.text.split(" ")[1];
      if (!store[exchange]) {
          ctx.reply(`${exchange} is not a valid exchange.`);
          return;
      }
      if (store[exchange].enabled) {
          ctx.reply(`${exchange} is already enabled.`);
          return;
      }
      store[exchange].enabled = true;
      ctx.reply(`${exchange} has been enabled.`);
  });

  // adding command to disable exchange
  bot.command("disable", (ctx) => {
      const exchange = ctx.message.text.split(" ")[1];
      if (!store[exchange]) {
          ctx.reply(`${exchange} is not a valid exchange.`);
          return;
      }
      if (!store[exchange].enabled) {
          ctx.reply(`${exchange} is already disabled.`);
          return;
      }
      store[exchange].enabled = false;
      ctx.reply(`${exchange} has been disabled.`);
  });

  bot.command('newpairs', (ctx) => {
    // Fetch the current list of trading pairs from Binance
    checkForNewPairs(ctx);
  });

  bot.command("enabled_exchanges", (ctx) => {
    let enabledExchanges = "Enabled Exchanges: ";
    for (const exchange in store) {
        if (store[exchange].enabled) {
            enabledExchanges += `${exchange} `;
        }
    }
    ctx.reply(enabledExchanges);
  });

  bot.command("help", (ctx) => {
    let helpText = "Available commands:\n";
    helpText += "/enable [exchange] - Enable an exchange\n";
    helpText += "/disable [exchange] - Disable an exchange\n";
    helpText += "/enabled_exchanges - Show all enabled exchanges\n";
    helpText += "/help - Show all available commands\n"
    ctx.reply(helpText);
  });

  bot.launch();

  setInterval(() => {
    checkForNewPairs(bot);
  }, 60000);

}
main();
