export function removeFollowingIndicator(token) {
  for (const child of [...token.children]) {
    if (child.isFollowingIndicator && child.token === token) {
      token.removeChild(child);
      child.destroy()
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
    { x: 0, y: 0 };

  g.position.set(offset.x, offset.y);

  const visible = game.settings.get('token-formations', 'showFollowingIndicator');
  const indicatorAlpha = visible ? 1 : 0;
  const borderAlpha = visible && game.settings.get('token-formations', 'showIndicatorBorder') ? 1 : 0;

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
    let leader = null;
    for (const child of token.children) {
      if (child.isFollowingIndicator && child.token === token) {
        leader = child.leader;
        break;
      }
    }
    removeFollowingIndicator(token);
    if (leader) createFollowingIndicator(token, leader);
  });
}

Hooks.once('init', function() {
  game.settings.register('token-formations', 'showFollowingIndicator', {
    name: game.i18n.localize("token-formations.settings.showFollowingIndicator.name"),
    hint: game.i18n.localize("token-formations.settings.showFollowingIndicator.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorSize', {
    name: game.i18n.localize("token-formations.settings.indicatorSize.name"),
    hint: game.i18n.localize("token-formations.settings.indicatorSize.hint"),
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
    name: game.i18n.localize("token-formations.settings.indicatorCorner.name"),
    hint: game.i18n.localize("token-formations.settings.indicatorCorner.hint"),
    scope: "client",
    config: settings => settings['token-formations.showFollowingIndicator'] === true,
    type: String,
    choices: {
      "top-left": game.i18n.localize("token-formations.settings.indicatorCorner.topLeft"),
      "top-right": game.i18n.localize("token-formations.settings.indicatorCorner.topRight"),
      "bottom-left": game.i18n.localize("token-formations.settings.indicatorCorner.bottomLeft"),
      "bottom-right": game.i18n.localize("token-formations.settings.indicatorCorner.bottomRight")
    },
    default: "top-left",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'showIndicatorBorder', {
    name: game.i18n.localize("token-formations.settings.showIndicatorBorder.name"),
    hint: game.i18n.localize("token-formations.settings.showIndicatorBorder.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorColor', {
    name: game.i18n.localize("token-formations.settings.indicatorColor.name"),
    hint: game.i18n.localize("token-formations.settings.indicatorColor.hint"),
    scope: "client",
    config: settings => settings['token-formations.showIndicatorBorder'] === true && settings['token-formations.showFollowingIndicator'] === true,
    type: String,
    default: "#6a1010ff",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('token-formations', 'indicatorBorderThickness', {
    name: game.i18n.localize("token-formations.settings.indicatorBorderThickness.name"),
    hint: game.i18n.localize("token-formations.settings.indicatorBorderThickness.hint"),
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

Hooks.on("getSceneControlButtons", controls => {

  controls.tokens.tools.tutorial = {
    name: "tokenFormationsInfo",
    title: game.i18n.localize("token-formations.buttons.info"),
    order: 5,
    icon: "fa-solid fa-info-circle",
    button: false,
    visible: true
  }
  console.log("Controls:", controls)
  controls.tokens.tools.clearFormations = {
    name: "clearFormations",
    title: game.i18n.localize("token-formations.buttons.clearFormations"),
    icon: "fa-solid fa-users-slash",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: async () => {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content: game.i18n.localize("token-formations.messages.confirmClearAll"),
        rejectClose: false,
        modal: true
      });
      if (proceed) {
          ui.notifications.info(game.i18n.localize("token-formations.messages.clearedAll"));
          window.TokenFormations.clearAllFormations()
      } else {
        console.log("Do not proceed.");
      }
    }
  }
  
  controls.tokens.tools.disbandFormation = {
    name: "disbandFormation",
    title: game.i18n.localize("token-formations.buttons.disbandFormation"),
    icon: "fa-solid fa-users-slash",
    order: Object.keys(controls.tokens.tools).length + 1,
    button: true,
    visible: !game.user.isGM,
    onChange: async () => {
      if (!canvas.tokens.controlled.length) {
        ui.notifications.warn(game.i18n.localize("token-formations.messages.noTokenSelected"));
        return;
      }
      if (canvas.tokens.controlled.length !== 1 || !window.TokenFormations.isLeader(canvas.tokens.controlled[0])) {
        ui.notifications.warn("seleziona il leader"); // TODO: localize
      } else {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          content: game.i18n.localize("token-formations.messages.confirmDisbandFormation"),
          rejectClose: false,
          modal: true
        });
        if (proceed) {
          ui.notifications.info(game.i18n.localize("token-formations.messages.disbandedFormation"));
          window.TokenFormations.removeToken(canvas.tokens.controlled[0])
        } else {
          console.log("Do not proceed.");
        }
      }
    }

  }
  });

