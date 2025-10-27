/**
 * Token Formations Module for Foundry VTT
 * A module for managing token formations
 */

import PriorityQueue from "./priorityQueue.js";
import * as gui from './gui.js'
import {findMinimumDistances, 
  dot, 
  inLeftRightBoundary, 
  inGrowBoundary, 
  drawXonCell, 
  rotateClockwise, 
  drawSegmentBetweenCells, 
  getAdjacentPositions, 
  getRelevantWalls, 
  drawRay, 
  checkWallCollision,
  checkTokenCollisions
} from "./utils.js"

// Module constants
const MODULE_ID = 'token-formations';
const MODULE_NAME = 'Token Formations';

// Formation data structure: Map<leaderId, Set<followerId>>
let enabled = true;


/**
 * Initialize the module
 */
Hooks.once('init', () => {
  console.log(`${MODULE_NAME} | ${game.i18n.localize("token-formations.messages.init")}`);
  
  

  // Register module settings here if needed
  // game.settings.register(MODULE_ID, 'setting-name', {
  //   name: 'Setting Name',
  //   hint: 'Setting description',
  //   scope: 'world',
  //   config: true,
  //   type: Boolean,
  //   default: false
  // });
});

/**
 * Setup the module when Foundry is ready
 */
Hooks.once('ready', async () => {
  console.log(`${MODULE_NAME} | ${game.i18n.localize("token-formations.messages.ready")}`);

  if (game.user.isGM) {
    let tokens = canvas.tokens.objects.children
  
    for (const t1 of tokens) {
      const t2 = await window.TokenFormations.getLeader(t1)

      if (t2 === null) continue
  
      const t3 = await window.TokenFormations.getLeader(t2)
  
      if (t3 !== null) {
        window.TokenFormations.addFollower(t3, t1)
      }
    }
  }

  // Add keyboard event listener for F key
  document.addEventListener('keydown', async (event) => {
    // Check if F key is pressed (keyCode 70 or key 'f'/'F')
    if (event.key === 'f' || event.key === 'F') {
      // Only trigger if not typing in an input field
      if (!event.target.matches('input, textarea, [contenteditable]')) {

        // Get the currently selected tokens and hovered token
        const selectedTokens = canvas.tokens.controlled;
        const hoveredToken = window.TokenFormations.hoveredToken;

        if (selectedTokens.length === 1 && hoveredToken && selectedTokens[0].document.disposition === hoveredToken.document.disposition) {
          await window.TokenFormations.addFollower(hoveredToken, selectedTokens[0])  
        } else if (selectedTokens.length === 0) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.selectToken"));
        } else if (selectedTokens.length > 1) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.selectOneToken"));
        } else if (!hoveredToken) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.hoverLeader"));
        } else if (selectedTokens[0].document.disposition !== hoveredToken.document.disposition) {
          ui.notifications.warn("Cannot follow a token with a different disposition") // TODO: localize
        }
      }
    }
  });

  game.settings.register('token-formations', 'queue-width', {
    name: game.i18n.localize("token-formations.settings.queueWidth.name"),
    hint: game.i18n.localize("token-formations.settings.queueWidth.hint"),
    scope: 'world',
    config: true,
    type: Number,
    default: 2,
  });

  game.settings.register('token-formations', 'max-distance', {
    name: game.i18n.localize("token-formations.settings.maxDistance.name"),
    hint: game.i18n.localize("token-formations.settings.maxDistance.hint"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 1
    },
    default: 0,
  });
});

Hooks.on('deleteToken', async (object) => {
  if (!game.user.isGM) {
    console.log(game.i18n.localize("token-formations.messages.notGM"));
    return;
  }
  if (window.TokenFormations.isLeader(object)) {
    const followers = await window.TokenFormations.getFollowers(object);
    for (const f of followers) {
      await window.TokenFormations.removeToken(f)
    }
  }
});

Hooks.on('updateToken', async (updatedTokenDocument, updateData, options, userId) => {
  //Controlla se l'update riguarda le flag
  console.log(updateData)
  if (!(updateData.flags?.["token-formations"])) return; // I'm honestly surprised this syntax works
  console.log("detected update on:", updatedTokenDocument.name)
  //Controlla se il token modificato è un leader
  const updatedToken = window.TokenFormations.fromId(updatedTokenDocument.id)

  const leader = await window.TokenFormations.getLeader(updatedToken)
  if (leader && leader.document.canUserModify(game.user, "update")) {
    ui.notifications.info(game.i18n.format("token-formations.messages.followingYou", { token: updatedToken.name, leader: leader.name }))
  }

  if (!(await window.TokenFormations.isLeader(updatedToken))) {
    console.log(game.i18n.localize("token-formations.messages.updatedTokenNotLeader"))
    return;
  }
  
  for (const token of canvas.tokens.objects.children) {
    if (token.document.getUserLevel(game.user) &&
      (await window.TokenFormations.getLeader(token))?.document.id === updatedTokenDocument.id)
    {
      console.log("token", token.document, "leader is:", (await window.TokenFormations.getLeader(token))?.document.name)
      const newLeader = await window.TokenFormations.getLeader(updatedToken)
      if (newLeader) {
        console.log("newLeader", newLeader.document.name)
        window.TokenFormations.addFollower(newLeader, token)
      }
    }    
  }

  
});

Hooks.on('moveToken', async (tokenDocument, movement, options, userId) => {
  if (!game.user.isGM) {
    console.log(game.i18n.localize("token-formations.messages.notGM"));
    return;
  }
  let token = canvas.tokens.objects.children.find((e) => e.id === tokenDocument.id) 
  if (token.inCombat) return;

  if (movement.method !== "api" && !!(await window.TokenFormations.getLeader(token))) {
    await window.TokenFormations.removeToken(token)
    ui.notifications.info(game.i18n.localize("token-formations.messages.removedOnManualMove"))
    return
  }

  if (!(await window.TokenFormations.isLeader(token))) return;
  const followers = await window.TokenFormations.getFollowers(token);

  console.log("followers", followers);
  

  if (await window.TokenFormations.isLeader(token)) {
    if (movement.method === "api") {
      return
    }

    const followerLength = followers.length;
    const oldPosition = { x: movement.origin.x, y: movement.origin.y };
    const targetPosition = { x: movement.destination.x, y: movement.destination.y };

    const direction = {
      x: (targetPosition.x - oldPosition.x) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2)),
      y: (targetPosition.y - oldPosition.y) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2))
    };

    let firstPosition = {
      x: targetPosition.x - Math.round(direction.x) * canvas.grid.size,
      y: targetPosition.y - Math.round(direction.y) * canvas.grid.size
    };

    firstPosition = canvas.grid.getTopLeftPoint(firstPosition)
    const sum = (followers.reduce((acc, curr) => {
      return {x: curr.x + acc.x, y: curr.y + acc.y} 
    }, {
      x: 0,
      y: 0
    }
    ));
    
    const mean = { x: sum.x / followers.length, y: sum.y / followers.length}

    //drawXonCell(mean.x, mean.y, 0x0000ff, 0.8, 10000)

    const closestDirection = {
      x: (mean.x - firstPosition.x) / Math.sqrt(Math.pow(mean.x - firstPosition.x, 2) + Math.pow(mean.y - firstPosition.y, 2)),
      y: (mean.y - firstPosition.y) / Math.sqrt(Math.pow(mean.x - firstPosition.x, 2) + Math.pow(mean.y - firstPosition.y, 2))
    };

    let cardinals = [{
        x: 0, 
        y: 1
      }, 
      {
        x: 0, 
        y: -1
      }, 
      {
        x: 1, 
        y:0
      }, 
      {
        x: -1, 
        y: 0
      }]

    const movementCardinal = findMinimumDistances(direction, cardinals)

    cardinals.splice(cardinals.indexOf(movementCardinal), 1)

    const closestCardinal = findMinimumDistances(closestDirection, cardinals)

    let queue = new PriorityQueue()
    queue.add(firstPosition, 0)
    let validPositions = []
    let fallbackPositions = new PriorityQueue()
    let visited = [firstPosition, targetPosition]
    let neededPositions = followerLength

    let boundaries = {
      growDirection: closestCardinal
    }

    let n = game.settings.get('token-formations', 'queue-width');

    //drawXonCell(firstPosition.x, firstPosition.y, 0xff0000, 1, 1000)
    if (dot(movementCardinal, closestCardinal) === 0) { // Cardinals are perpendicular
      const oppositeCardinal = {x: -movementCardinal.x, y: -movementCardinal.y}
      boundaries.right = firstPosition
      boundaries.left = {
        x: boundaries.right.x + (n-1) * oppositeCardinal.x * canvas.grid.size,
        y: boundaries.right.y + (n-1) * oppositeCardinal.y * canvas.grid.size
      }
    } else {
      const oppositeCardinal = rotateClockwise(movementCardinal)
      boundaries.right = {
        x: Math.floor(n/2) * oppositeCardinal.x * canvas.grid.size + firstPosition.x,
        y: Math.floor(n/2) * oppositeCardinal.y * canvas.grid.size + firstPosition.y
      }

      boundaries.left = {
        x: boundaries.right.x + (n-1) * -oppositeCardinal.x * canvas.grid.size,
        y: boundaries.right.y + (n-1) * -oppositeCardinal.y * canvas.grid.size
      }
    }

    //drawSegmentBetweenCells(boundaries.right.x, boundaries.right.y, boundaries.left.x, boundaries.left.y)
    while (!queue.isEmpty() && neededPositions > 0) {
      let pos = queue.min()
      queue.remove()

      validPositions.push(pos)

      let collisions = checkWallCollision(pos, boundaries)

      let tokenCollisions = checkTokenCollisions(pos, boundaries, token.document.disposition)

      let positions = getAdjacentPositions(pos, boundaries)

      for (let i = 0; i < 4; i++) {
        const newPos = positions[i]
        if(!collisions[i] && !tokenCollisions[i] && visited.findIndex((e) => newPos.x === e.x && newPos.y === e.y) === -1) {
          if (inLeftRightBoundary(newPos, boundaries) && inGrowBoundary(newPos, boundaries)) {
            queue.add(newPos, Math.sqrt(Math.pow(newPos.x - firstPosition.x, 2) + Math.pow(newPos.y - firstPosition.y, 2)))
          }
          else if (inGrowBoundary(newPos, boundaries)) // NOTE: could remove this check if you don't care about followers ending up in front of the leader
            fallbackPositions.add(newPos, Math.sqrt(Math.pow(newPos.x - firstPosition.x, 2) + Math.pow(newPos.y - firstPosition.y, 2)))
        }
        visited.push(newPos)
      }
      neededPositions--
    }

    // Run this in case there are no valid cells in the boundaries
    while (!fallbackPositions.isEmpty() && neededPositions > 0) {
      console.log("uhhhhhhh")

      let pos = fallbackPositions.min()
      fallbackPositions.remove()

      validPositions.push(pos)

      let collisions = checkWallCollision(pos, boundaries)

      let tokenCollisions = checkTokenCollisions(pos, boundaries, token.document.disposition)

      let positions = getAdjacentPositions(pos, boundaries)

      for (let i = 0; i < 4; i++) {
        let newPos = positions[i]
        if(!collisions[i] && !tokenCollisions[i]
            && visited.findIndex((e) => newPos.x === e.x && newPos.y === e.y) === -1
            && inGrowBoundary(newPos, boundaries)
        ) {
            fallbackPositions.add(newPos, Math.sqrt(Math.pow(newPos.x - firstPosition.x, 2) + Math.pow(newPos.y - firstPosition.y, 2)))
        }
        visited.push(newPos)
      }
      neededPositions--
    }

    for (const v of validPositions) {
      drawXonCell(v.x, v.y, 0xff0000, 0.8, 5000)
    }

    const maxDistance = game.settings.get('token-formations', 'max-distance') * canvas.grid.size;

    for (let i = followerLength-1; i >= 0; i--) {
      const f = followers[i]

      if (f.inCombat) {
        continue
      }

      if (validPositions.length === 0) {
        ui.notifications.warn(game.i18n.localize("token-formations.messages.noValidLocation"))
        return
      }

      const targetPosition = canvas.grid.getTopLeftPoint(validPositions.shift())

      const currentPosition = f.document.movement.destination ? f.document.movement.destination : {x: f.x, y: f.y}

      const dist = Math.sqrt(Math.pow(currentPosition.x - targetPosition.x, 2) + Math.pow(currentPosition.y - targetPosition.y, 2))
      if (maxDistance !== 0 && dist > maxDistance) {
        followers.splice(i, 1)
        ui.notifications.warn(game.i18n.localize("token-formations.messages.targetTooFar"))
        continue
      }

      let queue = new PriorityQueue()
      queue.add({
        position: canvas.grid.getTopLeftPoint({
          x: currentPosition.x,
          y: currentPosition.y
        }),
        prev: null 
      }, 0)

      let visited = [canvas.grid.getTopLeftPoint({x: currentPosition.x, y: currentPosition.y})]
      while (!queue.isEmpty()) {
        const pos = queue.min()
        //drawXonCell(pos.x, pos.y, 0x00ff00)
        queue.remove()

        if (pos.position.x === targetPosition.x && pos.position.y === targetPosition.y) {
          let path = []
          let tmp = pos
          while (tmp.prev !== null) {
            path.unshift({
              x: tmp.position.x,
              y: tmp.position.y
            })
            tmp = tmp.prev
          }

          f.document.move(path, {
            autoRotate: true,
            method: "api",
            constrainOptions: {
              ignoreWalls: true
            }
          })

          break
        }

        const collisions = checkWallCollision(pos.position, boundaries, true)
        const positions = getAdjacentPositions(pos.position, boundaries, true)
        for (let i = 0; i < 8; i++) {
          if (!collisions[i] 
            && visited.findIndex((e) => positions[i].x === e.x && positions[i].y === e.y) === -1
            && positions[i].x >= canvas.dimensions.sceneRect.x && positions[i].x < canvas.dimensions.sceneRect.x+canvas.dimensions.sceneWidth
            && positions[i].y >= canvas.dimensions.sceneRect.y && positions[i].y < canvas.dimensions.sceneRect.y+canvas.dimensions.sceneHeight
          ) {
            queue.add({position: positions[i], prev:pos}, Math.sqrt(Math.pow(currentPosition.x - positions[i].x, 2) + Math.pow(currentPosition.y - positions[i].y, 2)))
            visited.push(positions[i])
          }
        }
      }
    }  
  }
});



/**
 * Called when the canvas is ready
 */
Hooks.on('canvasReady', () => {
  
  // Add hover hook for tokens
  Hooks.on('hoverToken', (token, hovered) => {
    if (hovered) {
      // Store the currently hovered token
      window.TokenFormations.hoveredToken = token;
    } else {
      // Clear hovered token when no longer hovering
      window.TokenFormations.hoveredToken = null;
    }
  });
});

// Export the module for potential use by other modules
window.TokenFormations = {
  MODULE_ID,
  MODULE_NAME,
  
  // Formation management methods
  hoveredToken: null, // Currently hovered token

  fromId(id) {
    return canvas.tokens.objects.children.find(e => e.id === id)
  },
 
  async getLeader(follower) {
    return this.fromId(await follower.document.getFlag(MODULE_ID, "leader")) || null
  },

  /**
   * Add a follower to a leader's formation
   * @param {string} leaderId - The ID of the leader token
   * @param {string} follower - The the follower token
   */
  async addFollower(leader, follower) {
    // Don't allow a token to follow itself
    if(leader.document.id === follower.document.id) {
      ui.notifications.warn(game.i18n.localize("token-formations.messages.cannotFollowSelf"));
      return;
    }

    //Dont allow adding a follower that is already following the same leader
    if ((await this.getLeader(leader))?.document.id === follower.id) {
      ui.notifications.warn(game.i18n.localize("token-formations.messages.alreadyFollowing"));
      return;
    }
    
    // change the leader in case the hovered token is already following someone else
      if (await this.getLeader(leader)) {
      const newLeader = (await this.getLeader(leader)).document.id;
      console.log("Leader is already a follower, changing leader");
        await follower.document.setFlag(MODULE_ID, "leader", newLeader);
        ui.notifications.info(
          game.i18n.format("token-formations.messages.addedFollower", { follower: follower.name, leader: this.fromId(newLeader).name }),
        { permanent: false }
      );
    } else {
      // Add the selected token as a follower to the hovered token (leader)
      follower.document.setFlag(MODULE_ID, "leader", leader.id);
      ui.notifications.info(
        game.i18n.format("token-formations.messages.addedFollower", { follower: follower.name, leader: leader.name }),
        { permanent: false }
      );
    }
  },
  

  /**
   * Get all followers for a leader
   * @param {string} leaderId - The ID of the leader token
   * @returns {Array<string>} Array of follower IDs
   */
  async getFollowers(leader) {
    let followers = []
    for (let token of canvas.tokens.objects.children) {
      let leaderId = await token.document.getFlag(MODULE_ID, "leader")
      if (leaderId === leader.id) {
        followers.push(token)
      }
    }
    return followers
  },

  /**
   * Get a list of all the followers for all leaders
   */
  async getAllFollowers() {
    let allFollowers = []
    for (let token of canvas.tokens.objects.children) {
      let leaderId = await token.document.getFlag(MODULE_ID, "leader")
      if (leaderId) {
        allFollowers.push(token)
      }
    }
    return allFollowers
  },
  
  /**
   * Check if a token is a leader
   * @param {string} token - The token
   * @returns {boolean} True if the token is a leader
   */
  async isLeader(token) {
    for (let t of canvas.tokens.objects.children) {
      let leaderId = await t.document.getFlag(MODULE_ID, "leader")
      if (leaderId === token.id) return true
    }
    return false
  },
  
  /**
   * Remove a token from all formations (as leader or follower)
   * @param {string} token - The token to remove
   */
  async removeToken(token) {
    // Remove as follower
    const leader = token.document.getFlag(MODULE_ID, "leader");
    if (leader) {
      ui.notifications.info(game.i18n.format("token-formations.messages.noLongerFollowing", { follower: token.name, leader: (await this.fromId(leader)).name }))
    }
    token.document.unsetFlag(MODULE_ID, "leader");
  },
  
  /**
   * Clear all formations
   */
  clearAllFormations() {
    for (let token of canvas.tokens.objects.children) {
      token.document.unsetFlag(MODULE_ID, "leader");
    }
  }
};