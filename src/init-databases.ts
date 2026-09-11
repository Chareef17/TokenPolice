import { botSettingsDatabasePath, ge6DatabasePath, historicalDatabasePath } from "./config.js";
import { VoteRepository } from "./db.js";
import { Ge6Repository } from "./ge6-db.js";
import { BotSettingsRepository } from "./bot-settings-db.js";

new VoteRepository(historicalDatabasePath);
new Ge6Repository(ge6DatabasePath);
new BotSettingsRepository(botSettingsDatabasePath);
console.log(`Historical database: ${historicalDatabasePath}`);
console.log(`GE6 analysis database: ${ge6DatabasePath}`);
console.log(`Bot settings database: ${botSettingsDatabasePath}`);
