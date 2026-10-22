'use strict';
// Direct arena/level controls remain supported by the server. Add test-only
// choices for legacy integration scenarios without exposing them in the lobby.
exports.selectAdventure = async (page, value) => {
  await page.locator('#lobbyAdventure').evaluate((select, value) => {
    if (![...select.options].some(o => o.value === value)) select.add(new Option(value, value));
  }, value);
  await page.locator('#lobbyAdventure').selectOption(value);
};
