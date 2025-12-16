# Lead The Way

**Lead The Way** is a Foundry VTT module that enables coordinated movement for tokens on the map.

This module was made to facilitate dungeon crawling by allowing tokens to follow each other.

The module is currently localized in English and Italian. Feel free to make a PR with your translation in another language if you want.

## Usage

The Basic commands are:

- **Add a Follower:** Select a token, hover over the desired leader, and press `F`.
- **Remove a Follower:** Move the token manually or delete the leader.
- **Clear All Formations:** Use the "Clear Formations" button in the scene controls (Available only for the DM).

Your token will move automatically when the leader moves.

https://github.com/user-attachments/assets/6d29f8e1-b7ea-4ff0-b0ff-f1664634990c

If you follow a token that already has a leader, you'll follow that leader as well. If some tokens are already following you, they'll follow the new leader too.

https://github.com/user-attachments/assets/eb8a6e9b-e892-467f-a47e-11f872eee2f4

Tokens who are following someone will show their leader in an overlayed icon. Its position and size is configurable from the settings.

The width of the following tokens formation is also configurable from the settings.

Token following will be disabled during combat and re-enabled when it ends.

## Planned features

- Support for Hex grid and gridless mode
- Better handling of larger tokens
