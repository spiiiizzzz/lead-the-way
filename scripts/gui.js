export function removeFollowingIndicator(token) {
  if(!token?.children) return;
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
  const corner = game.settings.get('lead-the-way', 'indicatorCorner');
  const offset =
    corner === 'top-right' ? { x: tokenSize.width, y: 0 } :
    corner === 'bottom-left' ? { x: 0, y: tokenSize.height } :
    corner === 'bottom-right' ? { x: tokenSize.width, y: tokenSize.height } :
    { x: 0, y: 0 };

  g.position.set(offset.x, offset.y);

  const visible = game.settings.get('lead-the-way', 'showFollowingIndicator');
  const indicatorAlpha = visible ? 1 : 0;
  const borderAlpha = visible && game.settings.get('lead-the-way', 'showIndicatorBorder') ? 1 : 0;

  g.lineStyle(
    game.settings.get('lead-the-way', 'indicatorBorderThickness'),
    game.settings.get('lead-the-way', 'indicatorColor'),
    borderAlpha
  );
  g.drawCircle(0, 0, game.settings.get('lead-the-way', 'indicatorSize'));

  const leaderImg = leader.document?.texture?.src || leader.data?.img;
  if (leaderImg) {
    const texture = PIXI.Texture.from(leaderImg);
    const sprite = new PIXI.Sprite(texture);
    sprite.isFollowingIndicator = true;
    sprite.token = token;
    sprite.leader = leader;
    sprite.alpha = indicatorAlpha;
    const size = game.settings.get('lead-the-way', 'indicatorSize');
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
  game.settings.register('lead-the-way', 'showFollowingIndicator', {
    name: game.i18n.localize("lead-the-way.settings.showFollowingIndicator.name"),
    hint: game.i18n.localize("lead-the-way.settings.showFollowingIndicator.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('lead-the-way', 'indicatorSize', {
    name: game.i18n.localize("lead-the-way.settings.indicatorSize.name"),
    hint: game.i18n.localize("lead-the-way.settings.indicatorSize.hint"),
    scope: "client",
    config: settings => settings['lead-the-way.showFollowingIndicator'] === true,
    type: Number,
    range: {
      min: 16,
      max: 128,
      step: 2
    },
    default: 24,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('lead-the-way', 'indicatorCorner', {
    name: game.i18n.localize("lead-the-way.settings.indicatorCorner.name"),
    hint: game.i18n.localize("lead-the-way.settings.indicatorCorner.hint"),
    scope: "client",
    config: settings => settings['lead-the-way.showFollowingIndicator'] === true,
    type: String,
    choices: {
      "top-left": game.i18n.localize("lead-the-way.settings.indicatorCorner.topLeft"),
      "top-right": game.i18n.localize("lead-the-way.settings.indicatorCorner.topRight"),
      "bottom-left": game.i18n.localize("lead-the-way.settings.indicatorCorner.bottomLeft"),
      "bottom-right": game.i18n.localize("lead-the-way.settings.indicatorCorner.bottomRight")
    },
    default: "top-left",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('lead-the-way', 'showIndicatorBorder', {
    name: game.i18n.localize("lead-the-way.settings.showIndicatorBorder.name"),
    hint: game.i18n.localize("lead-the-way.settings.showIndicatorBorder.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('lead-the-way', 'indicatorColor', {
    name: game.i18n.localize("lead-the-way.settings.indicatorColor.name"),
    hint: game.i18n.localize("lead-the-way.settings.indicatorColor.hint"),
    scope: "client",
    config: settings => settings['lead-the-way.showIndicatorBorder'] === true && settings['lead-the-way.showFollowingIndicator'] === true,
    type: String,
    default: "#6a1010ff",
    onChange: () => updateAllFollowingIndicators()
  });

  game.settings.register('lead-the-way', 'indicatorBorderThickness', {
    name: game.i18n.localize("lead-the-way.settings.indicatorBorderThickness.name"),
    hint: game.i18n.localize("lead-the-way.settings.indicatorBorderThickness.hint"),
    scope: "client",
    config: settings => settings['lead-the-way.showIndicatorBorder'] === true && settings['lead-the-way.showFollowingIndicator'] === true,
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

  console.log(game.i18n.localize("lead-the-way.messages.controls"), controls)
  controls.tokens.tools.clearFormations = {
    name: "clearFormations",
    title: game.i18n.localize("lead-the-way.buttons.clearFormations"),
    icon: "fa-solid fa-users-slash",
    order: Object.keys(controls.tokens.tools).length + 1,
    button: true,
    visible: game.user.isGM,
    onChange: async () => {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content: game.i18n.localize("lead-the-way.messages.confirmClearAll"),
        rejectClose: false,
        modal: true
      });
      if (proceed) {
          ui.notifications.info(game.i18n.localize("lead-the-way.messages.clearedAll"));
          window.TokenFormations.clearAllFormations()
      } else {
        console.log(game.i18n.localize("lead-the-way.messages.noLongerFollowing"));
      }
    }
  }
  
});

Hooks.once('canvasReady', async () => {
  for (const token of canvas.tokens.objects.children) {
    const leader = await window.TokenFormations.getLeader(token)
    
    removeFollowingIndicator(token)

    if (!leader || token.inCombat) continue

    createFollowingIndicator(token, leader)
  }
})

Hooks.on('updateToken', async (updatedTokenDocument, updateData, options, userId) => {
  if (!updateData.flags) return;

  const updatedToken = window.TokenFormations.fromId(updatedTokenDocument.id)

  const leader = await window.TokenFormations.getLeader(updatedToken)

  removeFollowingIndicator(updatedToken)

  if (leader === null || updatedToken.inCombat) return

  createFollowingIndicator(updatedToken, leader)
})
  

Hooks.on('combatStart', async (combat) => {
  ui.notifications.info(game.i18n.localize("lead-the-way.messages.combatStarted"))
  for (const token of canvas.tokens.objects.children) {
    if (token.inCombat) {
      removeFollowingIndicator(token)
    }
  }
});

Hooks.on('deleteCombat', async (combat) => {
  ui.notifications.info(game.i18n.localize("lead-the-way.messages.combatEnded"))
  for (const token of canvas.tokens.objects.children) {
    const leader = await window.TokenFormations.getLeader(token)

    removeFollowingIndicator(token)
  
    if (leader === null) continue
  
    createFollowingIndicator(token, leader)
  }
});

Hooks.on('createCombatant', async (combatant) => {
  const token = window.TokenFormations.fromId(combatant.tokenId)
  if (token.document.canUserModify(game.user, "update"))
    ui.notifications.info(game.i18n.localize("lead-the-way.messages.enteredCombat"))
  removeFollowingIndicator(token)
})

Hooks.on('deleteCombatant', async (combatant) => {
  const token = window.TokenFormations.fromId(combatant.tokenId)
  if (token.document.canUserModify(game.user, "update"))
    ui.notifications.info(game.i18n.localize("lead-the-way.messages.exitedCombat"))

  const leader = await window.TokenFormations.getLeader(token)

  removeFollowingIndicator(token)

  if (leader === null) return

  createFollowingIndicator(token, leader)
});

