export function removeFollowingIndicator(token) {
  for (const child of [...token.children]) {
    if (child.isFollowingIndicator && child.token === token) {
      token.removeChild(child);
    }
  }
}

export function createFollowingIndicator(token, leader) {
  const g = new PIXI.Graphics();
  g.isFollowingIndicator = true;
  g.token = token;
  g.leader = leader;

  const tokenSize = token.document.getSize();
  const corner = game.settings.get('token-formations', 'indicatorCorner');
  const offset =
    corner === 'top-right' ? { x: tokenSize.width, y: 0 } :
    corner === 'bottom-left' ? { x: 0, y: tokenSize.height } :
    corner === 'bottom-right' ? { x: tokenSize.width, y: tokenSize.height } :
    { x: 0, y: 0 }; // top-left

  
  const visible = game.settings.get('token-formations', 'showFollowingIndicator');
  const indicatorAlpha = visible ? 1 : 0;
  const borderAlpha = visible && game.settings.get('token-formations', 'showIndicatorBorder') ? 1 : 0;

  g.moveTo(offset.x, offset.y);
  g.lineStyle(
    game.settings.get('token-formations', 'indicatorBorderThickness'),
    game.settings.get('token-formations', 'indicatorColor'),
    borderAlpha
  );
  g.drawCircle(0, 0, game.settings.get('token-formations', 'indicatorSize'));

  const leaderImg = leader.document?.texture?.src || leader.data?.img;
  if (leaderImg) {
    const texture = PIXI.Texture.from(leaderImg);
    const sprite = new PIXI.Sprite(texture);
    sprite.isFollowingIndicator = true;
    sprite.token = token;
    sprite.leader = leader;
    sprite.alpha = indicatorAlpha;
    const size = game.settings.get('token-formations', 'indicatorSize');
    sprite.width = size * 2;
    sprite.height = size * 2;
    sprite.anchor.set(0.5);
    sprite.x = offset.x;
    sprite.y = offset.y;
    token.addChild(sprite);
  }

  token.addChild(g);
}

function updateAllFollowingIndicators() {
  canvas.tokens.placeables.forEach(token => {
    // Aggiorna alpha di tutti i child indicatori
    const visible = game.settings.get('token-formations', 'showFollowingIndicator');
    const indicatorAlpha = visible ? 1 : 0;
    const borderAlpha = visible && game.settings.get('token-formations', 'showIndicatorBorder') ? 1 : 0;

    for (const child of token.children) {
      if (child.isFollowingIndicator && child.token === token) {
        // Aggiorna trasparenza per sprite
        if (child instanceof PIXI.Sprite) {
          child.alpha = indicatorAlpha;
        }
        // Aggiorna trasparenza per graphics
        if (child instanceof PIXI.Graphics) {
          child.clear();
          const tokenSize = token.document.getSize();
          const corner = game.settings.get('token-formations', 'indicatorCorner');
          const offset =
            corner === 'top-right' ? { x: tokenSize.width, y: 0 } :
            corner === 'bottom-left' ? { x: 0, y: tokenSize.height } :
            corner === 'bottom-right' ? { x: tokenSize.width, y: tokenSize.height } :
            { x: 0, y: 0 }; // top-left

          child.moveTo(offset.x, offset.y);
          child.lineStyle(
            game.settings.get('token-formations', 'indicatorBorderThickness'),
            game.settings.get('token-formations', 'indicatorColor'),
            borderAlpha
          );
          child.drawCircle(0, 0, game.settings.get('token-formations', 'indicatorSize'));
        }
      }
    }
  });
}

Hooks.once('init', function() {
  game.settings.register('token-formations', 'showFollowingIndicator', {
    name: "Mostra indicatore di following",
    hint: "Attiva o disattiva l'indicatore di following.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorSize', {
    name: "Dimensione indicatore",
    hint: "Scegli la dimensione dell'indicatore di following.",
    scope: "client",
    config: settings => settings['token-formations.showFollowingIndicator'] === true,
    type: Number,
    range: {
      min: 16,
      max: 128,
      step: 2
    },
    default: 24,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorCorner', {
    name: "Angolo segnalino",
    hint: "Scegli l'angolo in cui visualizzare il segnalino sul token.",
    scope: "client",
    config: settings => settings['token-formations.showFollowingIndicator'] === true,
    type: String,
    choices: {
      "top-left": "Alto Sinistra",
      "top-right": "Alto Destra",
      "bottom-left": "Basso Sinistra",
      "bottom-right": "Basso Destra"
    },
    default: "top-left",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'showIndicatorBorder', {
    name: "Mostra bordo indicatore",
    hint: "Attiva o disattiva il bordo dell'indicatore di following.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorColor', {
    name: "Colore bordo indicatore",
    hint: "Scegli il colore del bordo dell'indicatore di following.",
    scope: "client",
    config: settings => settings['token-formations.showIndicatorBorder'] === true && settings['token-formations.showFollowingIndicator'] === true,
    type: String,
    default: "#6a1010ff",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorBorderThickness', {
    name: "Spessore bordo indicatore",
    hint: "Scegli lo spessore del bordo dell'indicatore di following.",
    scope: "client",
    config: settings => settings['token-formations.showIndicatorBorder'] === true && settings['token-formations.showFollowingIndicator'] === true,
    type: Number,
    default: 5,
    range: {
      min: 1,
      max: 10,
      step: 1
    },
    onChange: () => updateAllFollowingIndicators()
  });

});
