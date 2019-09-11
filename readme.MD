# WardenBot

WardenBot is a bot for interacting with the Gitlab Issues API from Discord.

## To run:

### Config
Change the name of defaultConfig.json to config.json and set these values:
bot_token: your bot's secret token (from https://discordapp.com/developers)
botUserID: the discord user ID of your bot
apiToken: generate a gitlab api token with high enough perms (from an account with high enough perms - this is also the account that everything will be completed through)
apiURL: your gitlab api url (i.e. https://gitlab.someDomain.com/api/v4/projects/groupName%2F) - the %2F represents a slash
standardURL: your standard gitlab url (i.e. https://gitlab.someDomain.com/groupName/)

### User and Project Data
todo