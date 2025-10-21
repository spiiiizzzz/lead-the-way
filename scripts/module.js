/**
 * Token Formations Module for Foundry VTT
 * A module for managing token formations
 */

import PriorityQueue from "./priorityQueue.js";
import * as gui from "./gui.js";
// Module constants
const MODULE_ID = 'token-formations';
const MODULE_NAME = 'Token Formations';

// Formation data structure: Map<leaderId, Set<followerId>>
const formations = new Map();



/**
 * Initialize the module
 */
Hooks.once('init', () => {
  console.log(`${MODULE_NAME} | Initializing module`);
  
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
  console.log(`${MODULE_NAME} | Module ready`);
  
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
          console.log(leader)
          
          // Don't allow a token to follow itself
          if (selectedToken.id !== leader.id) {
            // Add the selected token as a follower to the hovered token (leader)
            window.TokenFormations.addFollower(leader.id, selectedToken);
            
            ui.notifications.info(
              `Added ${selectedToken.name} as follower to ${leader.name}`,
              { permanent: false }
            );

            gui.createFollowingIndicator(selectedToken, leader);
            // Print the updated follower list for the leader (hovered token)
            const followers = window.TokenFormations.getFollowers(leader.id);
            console.log(`${MODULE_NAME} | Leader: ${leader.name} (ID: ${leader.id})`);
            
            if (followers.size > 0) {
              console.log(`${MODULE_NAME} | Followers (${followers.size}):`);
              followers.forEach(followerId => {
                const followerToken = canvas.tokens.get(followerId);
                if (followerToken) {
                  console.log(`${MODULE_NAME} |   - ${followerToken.name} (ID: ${followerId})`);
                } else {
                  console.log(`${MODULE_NAME} |   - Unknown token (ID: ${followerId})`);
                }
              });
            } else {
              console.log(`${MODULE_NAME} | No followers for this leader.`);
            }
            
          } else {
            ui.notifications.warn("A token cannot follow itself!");
          }
        } else if (selectedTokens.length === 0) {
          ui.notifications.warn("Please select a token first!");
        } else if (selectedTokens.length > 1) {
          ui.notifications.warn("Please select only one token!");
        } else if (!hoveredToken) {
          ui.notifications.warn("Please hover over a leader token!");
        }
      }
    }
  });

  game.settings.register('token-formations', 'queue-width', {
    name: "Larghezza della formazione",
    hint: "Imposta la larghezza (in celle di griglia) della formazione dei seguaci.",
    scope: 'world',
    config: true,
    type: Number,
    default: 2,
  });
});

function findMinimumDistances (source, distances) {
  let minDistance = Number.MAX_SAFE_INTEGER
  let minPosition = null
  distances.map((s) => {
    console.log("Source:", source.x, source.y)
    const tmp = Math.sqrt(Math.pow(s.x - source.x, 2) + Math.pow(s.y - source.y, 2))
    if (tmp <= minDistance) {
      minDistance = tmp
      minPosition = s
    }
  })

  return minPosition
}

//function dot (a, b) { return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n) }

// Function to calculate the dot product of two vectors in 3D space
function dot(vector1, vector2) {
  return vector1.x * vector2.x + vector1.y * vector2.y;
}


function inLeftRightBoundary (pos, boundaries) {
  console.log("Pos:", pos)
  console.log("Boundaries:", boundaries)

  if (boundaries.left.x === boundaries.right.x && boundaries.left.y === boundaries.right.y) {
    console.log("InLRBoundary -> Equal boundaries");
    if (boundaries.growDirection.x === 0) {
      if(pos.x === boundaries.right.x) return true
      return false
    } else {
      if(pos.y === boundaries.right.y) return true
      return false
    }
  }

  if (boundaries.left.x === boundaries.right.x) {
    const min = Math.min(boundaries.left.y, boundaries.right.y)
    const max = Math.max(boundaries.left.y, boundaries.right.y)
    console.log("InLRBoundary -> Min:", min, "Max:", max);
    if (pos.y >= min && pos.y <= max) return true;
    return false
  } else {
    const min = Math.min(boundaries.left.x, boundaries.right.x)
    const max = Math.max(boundaries.left.x, boundaries.right.x)

    if (pos.x >= min && pos.x <= max) return true;
    return false
  }
}

function inGrowBoundary (pos, boundaries) {
  if (boundaries.growDirection.x === 0) {
    if (boundaries.growDirection.y === 1) {
      if (pos.y >= boundaries.right.y) return true
      return false
    } else {
      if (pos.y <= boundaries.right.y) return true
      return false
    }
  } else {
    if (boundaries.growDirection.x === 1) {
      if (pos.x >= boundaries.right.x) return true
      return false
    } else {
      if (pos.x <= boundaries.right.x) return true
      return false
    }
  }
}

function drawXonCell(x, y, color = 0xff0000, size = 0.8, duration = 1000) {
  console.log("PORCODDIO")

  const gridSize = canvas.grid.size;
  const margin = (gridSize * (1 - size)) / 2;

  const g = new PIXI.Graphics();
  g.lineStyle(3, color, 0.9);

  // Prima diagonale
  g.moveTo(x + margin, y + margin);
  g.lineTo(x + gridSize - margin, y + gridSize - margin);

  // Seconda diagonale
  g.moveTo(x + gridSize - margin, y + margin);
  g.lineTo(x + margin, y + gridSize - margin);

  canvas.stage.addChild(g);

  setTimeout(() => {
    canvas.stage.removeChild(g);
    g.destroy();
  }, duration);
}

function rotateClockwise(vector) {
  return {
    x: vector.y,
    y: -vector.x
  }
}

function drawSegmentBetweenCells(x1, y1, x2, y2, color = 0x00ff00, duration = 1000) {
  const gridSize = canvas.grid.size;
  // Calcola il centro di ciascuna casella
  const center1 = { x: x1 + gridSize / 2, y: y1 + gridSize / 2 };
  const center2 = { x: x2 + gridSize / 2, y: y2 + gridSize / 2 };

  const g = new PIXI.Graphics();
  g.lineStyle(3, color, 0.9);
  g.moveTo(center1.x, center1.y);
  g.lineTo(center2.x, center2.y);

  canvas.stage.addChild(g);

  setTimeout(() => {
    canvas.stage.removeChild(g);
    g.destroy();
  }, duration);
}

function getAdjacentPositions(pos) {
  let positions = []
  for (let i = 0; i < 4; i++) {

    let newPos
    switch (i) {
      case 0:
        newPos ={
          x: pos.x + canvas.grid.size,
          y: pos.y
        }
        break;
      case 1:
        newPos = {
          x: pos.x,
          y: pos.y + canvas.grid.size
        }
        break;
      case 2:
        newPos = {
          x: pos.x - canvas.grid.size,
          y: pos.y
        }
        break;
      case 3:
        newPos = {
          x: pos.x,
          y: pos.y - canvas.grid.size
        }
        break;
    }
    positions.push(newPos)
  }

  return positions
}

Hooks.on('moveToken', (token, movement, options, userId) => { 
  if (window.TokenFormations.isLeader(token.id)) {
    const followers = window.TokenFormations.getFollowers(token.id);
    console.log("followers:", followers)
    const followerLength = followers.length;
    const oldPosition = { x: movement.origin.x, y: movement.origin.y };
    const targetPosition = { x: movement.destination.x, y: movement.destination.y };

    const direction = {
      x: (targetPosition.x - oldPosition.x) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2)),
      y: (targetPosition.y - oldPosition.y) / Math.sqrt(Math.pow(oldPosition.x - targetPosition.x, 2) + Math.pow(oldPosition.y - targetPosition.y, 2))
    };
    const directionAngle = Math.atan2(direction.y, direction.x);

    const firstPosition = {
      x: targetPosition.x - direction.x * canvas.grid.size,
      y: targetPosition.y - direction.y * canvas.grid.size
    };

    const sum = (followers.reduce((acc, curr) => {
      return {x: curr.x + acc.x, y: curr.y + acc.y} 
    }, {
      x: 0,
      y: 0
    }
    ));
    
    const mean = { x: sum.x / followers.length, y: sum.y / followers.length}

    drawXonCell(mean.x, mean.y, 0x0000ff, 0.8, 10000)

    console.log("mean:", mean)

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

    console.log("Direction", direction)

    const movementCardinal = findMinimumDistances(direction, cardinals)

    console.log("Movement cardinal:", movementCardinal)

    cardinals.splice(cardinals.indexOf(movementCardinal, 1))

    const closestCardinal = findMinimumDistances(closestDirection, cardinals)

    // const closestCardinal = {x: 0, y: -1}

    console.log("Closest cardinal:", closestCardinal)

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
      console.log("Caso perpendicolare")
      const oppositeCardinal = {x: -movementCardinal.x, y: -movementCardinal.y}
      boundaries.right = firstPosition
      boundaries.left = {
        x: boundaries.right.x + (n-1) * oppositeCardinal.x * canvas.grid.size,
        y: boundaries.right.y + (n-1) * oppositeCardinal.y * canvas.grid.size
      }
    } else {
      console.log("Caso parallelo")
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

      let collisions = checkWallCollision(pos)

      console.log("Collisions:", collisions)

      for (const newPos of getAdjacentPositions(pos)) {
        if (/*!collisions[i] && */ visited.findIndex((e) => newPos.x === e.x && newPos.y === e.y) === -1) {
          console.log("New Pos in left-right boundary:", inLeftRightBoundary(newPos, boundaries))
          if (inLeftRightBoundary(newPos, boundaries) && inGrowBoundary(newPos, boundaries)) {
            queue.add(newPos, Math.sqrt(Math.pow(newPos.x - firstPosition.x, 2) + Math.pow(newPos.y - firstPosition.y, 2)))
            console.log("Added", newPos, "to queue")
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
      console.log("No valid positions found, using fallback positions")
      let pos = fallbackPositions.min()
      fallbackPositions.remove()

      validPositions.push(pos)

      let collisions = checkWallCollision(pos)

      console.log("Collisions:", collisions)

      for (const newPos of getAdjacentPositions(pos)) {
        if(/*!collisions[i] 
            && */visited.findIndex((e) => newPos.x === e.x && newPos.y === e.y) === -1
            && inGrowBoundary(newPos, boundaries)
        ) {
            fallbackPositions.add(newPos, Math.sqrt(Math.pow(newPos.x - firstPosition.x, 2) + Math.pow(newPos.y - firstPosition.y, 2)))
        }
        visited.push(newPos)
      }
      neededPositions--
    }

    console.log("valid positions: ", validPositions)
    for (const v of validPositions) {
      drawXonCell(v.x, v.y, 0xff0000, 0.8, 10000)
    }

    for (const f of followers) {
      // check distance and break in case it's too far

      // do dijkstra
    }


    console.log(`Old Position: ${oldPosition.x}, ${oldPosition.y}`);
    console.log(`Target Position: ${targetPosition.x}, ${targetPosition.y}`);
    console.log(`Direction: ${direction.x}, ${direction.y}`);

  
  }
});

function drawRay(ray, color = 0xff0000, duration = 1000) {
  const g = new PIXI.Graphics();
  g.lineStyle(3, color, 0.8);
  g.moveTo(ray.A.x, ray.A.y);
  g.lineTo(ray.B.x, ray.B.y);
  canvas.stage.addChild(g);

  // Rimuovi il ray dopo "duration" ms
  setTimeout(() => {
    canvas.stage.removeChild(g);
    g.destroy();
  }, duration);
}

function getRelevantWalls(ray) {
  // Calcola bounding box del raggio
  const minX = Math.min(ray.A.x, ray.B.x) - 1;
  const maxX = Math.max(ray.A.x, ray.B.x) + 1;
  const minY = Math.min(ray.A.y, ray.B.y) - 1;
  const maxY = Math.max(ray.A.y, ray.B.y) + 1;

  // Filtra solo i muri che sono nel bounding box
  return canvas.walls.placeables.filter(wall => {
    const c = wall.document.c;
    return (
      Math.max(c[0], c[2]) >= minX &&
      Math.min(c[0], c[2]) <= maxX &&
      Math.max(c[1], c[3]) >= minY &&
      Math.min(c[1], c[3]) <= maxY &&
      wall.document.move !== CONST.WALL_MOVEMENT_TYPES.NONE
    );
  });
}

function checkWallCollision(position) {
  let collisions = []
  for (let i = 0; i < 4; i++) {
    const ray = foundry.canvas.geometry.Ray.fromAngle(
      position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, i * Math.PI / 2, canvas.grid.size
    );
    const relevantWalls = getRelevantWalls(ray);
    let collides = false
    for (const wall of relevantWalls) {
      if (foundry.utils.lineSegmentIntersects(
        ray.A, ray.B,
        { x: wall.document.c[0], y: wall.document.c[1] },
        { x: wall.document.c[2], y: wall.document.c[3] }
      )) { 
        collides = true;
        break;
      }
    }
    collisions.push(collides);
  }

  return collisions
}

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
    console.log(`${MODULE_NAME} | Added follower ${follower.id} to leader ${leaderId}`);
  },
  
  /**
   * Remove a follower from a leader's formation
   * @param {string} leaderId - The ID of the leader token
   * @param {string} followerId - The ID of the follower token
   */
  removeFollower(leaderId, followerId) {
    if (formations.has(leaderId)) {
      formations.get(leaderId).splice(formations.get(leaderId).indexOf(followerId), 1);
      if (formations.get(leaderId).length === 0) {
        formations.delete(leaderId);
      }
      console.log(`${MODULE_NAME} | Removed follower ${followerId} from leader ${leaderId}`);
    }
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
   * Get all formations
   * @returns {Map<string, Set<string>>} Map of leader IDs to follower sets
   */
  getAllFormations() {
    return formations;
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
   * Find the leader of a follower token
   * @param {string} followerId - The ID of the follower token
   * @returns {string|null} The leader ID or null if not found
   */
  findLeader(followerId) {
    for (const [leaderId, followers] of formations) {
      if (followers.has(followerId)) {
        return leaderId;
      }
    }
    return null;
  },
  
  /**
   * Remove a token from all formations (as leader or follower)
   * @param {string} tokenId - The ID of the token to remove
   */
  removeToken(tokenId) {
    // Remove as leader
    if (formations.has(tokenId)) {
      formations.delete(tokenId);
      console.log(`${MODULE_NAME} | Removed leader ${tokenId} and disbanded formation`);
    }
    
    // Remove as follower
    for (const [leaderId, followers] of formations) {
      if (followers.has(tokenId)) {
        followers.delete(tokenId);
        if (followers.size === 0) {
          formations.delete(leaderId);
        }
        console.log(`${MODULE_NAME} | Removed ${tokenId} as follower from leader ${leaderId}`);
        break;
      }
    }
  },
  
  /**
   * Clear all formations
   */
  clearAllFormations() {
    formations.clear();
    console.log(`${MODULE_NAME} | Cleared all formations`);
  }
};