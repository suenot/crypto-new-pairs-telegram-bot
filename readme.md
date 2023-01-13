# Telegram bot for finding new pairs on Crypto Exchanges

This project is a Telegram bot that allows you to enable and disable different crypto exchanges. The bot uses the ccxt library to find new pairs on the enabled exchanges and sends a message to a Telegram chat.

### Features

- Enable and disable different crypto exchanges
- List of enabled exchanges
- Help command for available commands
- Only admin can enable and disable the exchanges

### Requirements

- Node.js
- Telegram bot token and chat id
- Telegram bot admin id
- Api Key and Secret for Binance exchange
- environment variables

### Installation

- Clone the repository
- Run `npm install` to install the dependencies
- Create a .env file in the root of the project and set the following environment variables:
```
TELEGRAM_BOT_ADMIN_IDS=1111,2222 # Prioritize this over TELEGRAM_BOT_ADMIN_NAMES
TELEGRAM_BOT_ADMIN_NAMES=john,doe # Not recommended
TELEGRAM_BOT_TOKEN=...
TELEGEAM_CHAT_NAME=my_chat
BINANCE_API_KEY=.. # Optional
BINANCE_API_SECRET=... # Optional
```
- Run `npm start` to start the bot

### Usage

- Use the command `/enable [exchange]` to enable an exchange.
- Use the command `/disable [exchange]` to disable an exchange.
- Use the command `/enabled_exchanges` to list all enabled exchanges.
- Use the command `/help` to list all available commands.

### Note

- The bot uses the ccxt library to access different crypto exchanges so, make sure the exchange you want to enable or disable is supported by ccxt.
- The bot uses the telegraf library to handle the Telegram bot, so make sure to use the telegraf commands and filters.
- This is an example, you may need to adjust the details to fit your specific implementation, but it should give you a good starting point.

### License

This project is licensed under the MIT License - see the LICENSE
