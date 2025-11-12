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

*We could put a short video or image here*

If you follow a token that already has a leader, you'll follow that leader as well. If some tokens are already following you, they'll follow the new leader too.

*We could put a short video or image here*

Tokens who are following someone will show their leader in an overlayed icon. Its position and size is configurable from the settings.

*Insert another image or video*

The width of the following tokens formation is also configurable from the settings.

*insert another image or video*

Token following will be disabled during combat and re-enabled when it ends.

*insert another image or video*

## TODO (eventually)

- Support for Hex grid and gridless mode
- Better handling of larger tokens

