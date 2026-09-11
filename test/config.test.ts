import assert from "node:assert/strict";
import test from "node:test";

test("accepts an empty optional guild id", async () => {
  process.env.DISCORD_TOKEN = "test-token";
  process.env.DISCORD_GUILD_ID = "";
  const { botConfig } = await import("../src/config.js");
  assert.equal(botConfig().DISCORD_GUILD_ID, undefined);
});
