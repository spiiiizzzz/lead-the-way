/**
 * Token Formations Module for Foundry VTT
 * A module for managing token formations
 */

import PriorityQueue from "./priorityQueue.js";
import * as gui from "./gui.js";
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
  checkWallCollision
} from "./utils.js"

// Module constants
const MODULE_ID = 'token-formations';
const MODULE_NAME = 'Token Formations';

// Formation data structure: Map<leaderId, Set<followerId>>
const formations = new Map();



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
Hooks.once('ready', () => {
  console.log(`${MODULE_NAME} | ${game.i18n.localize("token-formations.messages.ready")}`);
  
  // Add keyboard event listener for F key
  document.addEventListener('keydown', (event) => {
    // Check if F key is pressed (keyCode 70 or key 'f'/'F')
    if (event.key === 'f' || event.key === 'F') {
      // Only trigger if not typing in an input field
      if (!event.target.matches('input, textarea, [contenteditable]')) {
        
        // Get the currently selected tokens and hovered token
        const selectedTokens = canvas.tokens.controlled;
        const hoveredToken = window.TokenFormations.hoveredToken;
        
        if (selectedTokens.length === 1 && hoveredToken) {
          const selectedToken = selectedTokens[0]; // This becomes the follower
          const leader = hoveredToken; // This becomes the leader

          // Don't allow a token to follow itself
          if (selectedToken.id !== leader.id) {
            // Add the selected token as a follower to the hovered token (leader)
            window.TokenFormations.addFollower(leader.id, selectedToken);
            
            ui.notifications.info(
              game.i18n.format("token-formations.messages.addedFollower", { follower: selectedToken.name, leader: leader.name }),
              { permanent: false }
            );

            gui.createFollowingIndicator(selectedToken, leader);
            // Print the updated follower list for the leader (hovered token)
            const followers = window.TokenFormations.getFollowers(leader.id);
            console.log(`${MODULE_NAME} | Leader: ${leader.name} (ID: ${leader.id})`);
            
            if (followers.size > 0) {
              console.log(`${MODULE_NAME} | ${game.i18n.format("token-formations.messages.followers", { count: followers.size })}`);
              followers.forEach(followerId => {
                const followerToken = canvas.tokens.get(followerId);
                if (followerToken) {
                  console.log(`${MODULE_NAME} |   - ${followerToken.name} (ID: ${followerId})`);
                } else {
                  console.log(`${MODULE_NAME} |   - Unknown token (ID: ${followerId})`);
                }
              });
            } else {
              console.log(`${MODULE_NAME} | ${game.i18n.localize("token-formations.messages.noFollowers")}`);
            }
            
          } else {
            ui.notifications.warn(game.i18n.localize("token-formations.messages.noSelfFollow"));
          }
        } else if (selectedTokens.length === 0) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.selectToken"));
        } else if (selectedTokens.length > 1) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.selectOneToken"));
        } else if (!hoveredToken) {
          ui.notifications.warn(game.i18n.localize("token-formations.messages.hoverLeader"));
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

Hooks.on('moveToken', (token, movement, options, userId) => {
  if (movement.method !== "api" && window.TokenFormations.getAllFollowers().findIndex((e) => e.id === token.id) !== -1) {
    window.TokenFormations.removeToken(token)
    return
  }

  if (window.TokenFormations.isLeader(token.id)) {
    if (movement.method === "api") {
      return
    }

    const followers = window.TokenFormations.getFollowers(token.id);
    const followerLength = followers.length;
    const oldPosition = { x: movement.origin.x, y: movement.origin.y };
    const targetPosition = { x: movement.destination.x, y: movement.destination.y };

    const direction = {
      x: (targetPosition.x - oldPosition.x) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2)),
      y: (targetPosition.y - oldPosition.y) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2))
    };
    const directionAngle = Math.atan2(direction.y, direction.x);

    let firstPosition = {
      x: targetPosition.x - direction.x * canvas.grid.size,
      y: targetPosition.y - direction.y * canvas.grid.size
    };

    firstPosition = canvas.grid.getSnappedPosition( firstPosition.x, firstPosition.y )

    const sum = (followers.reduce((acc, curr) => {
      return {x: curr.x + acc.x, y: curr.y + acc.y} 
    }, {
      x: 0,
      y: 0
    }
    ));
    
    const mean = { x: sum.x / followers.length, y: sum.y / followers.length}

    drawXonCell(mean.x, mean.y, 0x0000ff, 0.8, 10000)

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
    let visited = [firstPosition]
    let neededPositions = followerLength

    let boundaries = {
      growDirection: closestCardinal
    }

    let n = game.settings.get('token-formations', 'queue-width');

    
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

    drawSegmentBetweenCells(boundaries.right.x, boundaries.right.y, boundaries.left.x, boundaries.left.y)

    while (!queue.isEmpty() && neededPositions > 0) {
      let pos = queue.min()
      queue.remove()

      validPositions.push(pos)

      let collisions = checkWallCollision(pos, boundaries)

      let positions = getAdjacentPositions(pos, boundaries)

      for (let i = 0; i < 4; i++) {
        const newPos = positions[i]
        if(!collisions[i] && visited.findIndex((e) => newPos.x === e.x && newPos.y === e.y) === -1) {
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
    if (fallbackPositions.isEmpty && neededPositions > 0) {
      console.error("No valid positions found, using fallback positions")
      let pos = fallbackPositions.min()
      fallbackPositions.remove()

      validPositions.push(pos)

      let collisions = checkWallCollision(pos, boundaries)

      let positions = getAdjacentPositions(pos, boundaries)

      for (let i = 0; i < 4; i++) {
        let newPos = positions[i]
        if(!collisions[i] 
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
      drawXonCell(v.x, v.y, 0xff0000, 0.8, 10000)
    }

    const maxDistance = game.settings.get('token-formations', 'max-distance') * canvas.grid.size;

    for (let i = followerLength-1; i >= 0; i--) {
      const f = followers[i]

      const targetPosition = canvas.grid.getTopLeftPoint(validPositions.shift())

      const dist = Math.sqrt(Math.pow(f.x - targetPosition.x, 2) + Math.pow(f.y - targetPosition.y, 2))
      if (maxDistance !== 0 && dist > maxDistance) {
        followers.splice(i, 1)
        ui.notifications.warn("Il target da raggiungere è troppo lontano")
        continue
      }

      let queue = new PriorityQueue()
      queue.add({
        position: canvas.grid.getTopLeftPoint({
          x: f.x,
          y: f.y
        }),
        prev: null 
      }, 0)

      let visited = [canvas.grid.getTopLeftPoint({x: f.x, y: f.y})]
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
            method: "api"
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
            queue.add({position: positions[i], prev:pos}, Math.sqrt(Math.pow(f.x - positions[i].x, 2) + Math.pow(f.y - positions[i].y, 2)))
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
  formations,
  hoveredToken: null, // Currently hovered token
  
  /**
   * Add a follower to a leader's formation
   * @param {string} leaderId - The ID of the leader token
   * @param {string} follower - The the follower token
   */
  addFollower(leaderId, follower) {
    if (!formations.has(leaderId)) {
      formations.set(leaderId, new Array());
    }
    formations.get(leaderId).push(follower);
    console.log(`${MODULE_NAME} | ${game.i18n.format("token-formations.messages.addedFollower", { follower: follower.id, leader: leaderId })}`);
  },
  
  /**
   * Get all followers for a leader
   * @param {string} leaderId - The ID of the leader token
   * @returns {Array<string>} Array of follower IDs
   */
  getFollowers(leaderId) {
    return formations.get(leaderId) || new Array();
  },

  /**
   * Get a list of all the followers for all leaders
   */
  getAllFollowers() {
    let allFollowers = []
    for (const l of formations.values()) {
      allFollowers = allFollowers.concat(l)
    }
    return allFollowers
  },
  
  /**
   * Check if a token is a leader
   * @param {string} tokenId - The ID of the token
   * @returns {boolean} True if the token is a leader
   */
  isLeader(tokenId) {
    return formations.has(tokenId);
  },
  
  /**
   * Remove a token from all formations (as leader or follower)
   * @param {string} tokenId - The ID of the token to remove
   */
  removeToken(token) {
    // Remove as leader
    if (formations.has(token.id)) {
      formations.delete(token.id);
      console.log(`${MODULE_NAME} | ${game.i18n.format("token-formations.messages.removedLeader", { id: token.id })}`);
    }
    
    // Remove as follower
    for (const [leaderId, followers] of formations) {
      const index = followers.findIndex(e => e.id === token.id)
      if (index !== -1) {
        followers.splice(index, 1);
        if (followers.length === 0) {
          formations.delete(leaderId);
        }
        console.log(`${MODULE_NAME} | ${game.i18n.format("token-formations.messages.removedFollower", { id: tokenId, leader: leaderId })}`);
        break;
      }
    }
  },
  
  /**
   * Clear all formations
   */
  clearAllFormations() {
    formations.clear();
    console.log(`${MODULE_NAME} | ${game.i18n.localize("token-formations.messages.clearedAll")}`);
  }
};