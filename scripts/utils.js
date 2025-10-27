export function findMinimumDistances (source, distances) {
  let minDistance = Number.MAX_SAFE_INTEGER
  let minPosition = null
  distances.map((s) => {
    const tmp = Math.sqrt(Math.pow(s.x - source.x, 2) + Math.pow(s.y - source.y, 2))
    if (tmp <= minDistance) {
      minDistance = tmp
      minPosition = s
    }
  })

  return minPosition
}

// Function to calculate the dot product of two vectors in 3D space
export function dot(vector1, vector2) {
  return vector1.x * vector2.x + vector1.y * vector2.y;
}


export function inLeftRightBoundary (pos, boundaries) {

  if (boundaries.left.x === boundaries.right.x && boundaries.left.y === boundaries.right.y) {
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
    if (pos.y >= min && pos.y <= max) return true;
    return false
  } else {
    const min = Math.min(boundaries.left.x, boundaries.right.x)
    const max = Math.max(boundaries.left.x, boundaries.right.x)

    if (pos.x >= min && pos.x <= max) return true;
    return false
  }
}

export function inGrowBoundary (pos, boundaries) {
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

export function drawXonCell(x, y, color = 0xff0000, size = 0.8, duration = 1000) {

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

export function rotateClockwise(vector) {
  return {
    x: vector.y,
    y: -vector.x
  }
}

export function drawSegmentBetweenCells(x1, y1, x2, y2, color = 0x00ff00, duration = 1000) {
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

export function getAdjacentPositions(pos, boundaries, checkDiagonals = false) {
  let positions = []

  const d1 = rotateClockwise(boundaries.growDirection)

  let newPos = {
    x: pos.x + d1.x * canvas.grid.size,
    y: pos.y + d1.y * canvas.grid.size
  }

  positions.push(newPos)

  newPos = {
    x: pos.x + -d1.x * canvas.grid.size,
    y: pos.y + -d1.y * canvas.grid.size
  }

  positions.push(newPos)

  newPos = {
    x: pos.x + boundaries.growDirection.x * canvas.grid.size,
    y: pos.y + boundaries.growDirection.y * canvas.grid.size
  }

  positions.push(newPos)

  newPos = {
    x: pos.x + -boundaries.growDirection.x * canvas.grid.size,
    y: pos.y + -boundaries.growDirection.y * canvas.grid.size
  }

  positions.push(newPos)

  if (checkDiagonals) {
    newPos = {
      x: pos.x + canvas.grid.size,
      y: pos.y + canvas.grid.size
    }
    positions.push(newPos)
    newPos = {
      x: pos.x - canvas.grid.size,
      y: pos.y + canvas.grid.size
    }
    positions.push(newPos)
    newPos = {
      x: pos.x - canvas.grid.size,
      y: pos.y - canvas.grid.size
    }
    positions.push(newPos)
    newPos = {
      x: pos.x + canvas.grid.size,
      y: pos.y - canvas.grid.size
    }
    positions.push(newPos)
  }

  return positions
}


export function drawRay(ray, color = 0xff0000, duration = 1000) {
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
  
export function getRelevantWalls(ray) {
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
        wall.document.move !== CONST.WALL_MOVEMENT_TYPES.NONE &&
        wall.document.ds !== CONST.WALL_DOOR_STATES.OPEN
        );
    });
}
  
export function checkWallCollision(position, boundaries, checkDiagonals = false) {
    let collisions = []
    const tmp = rotateClockwise(boundaries.growDirection)
    const d = Math.atan2(tmp.y, tmp.x)
    for (let i = 0; i < 2; i++) {
        const ray = foundry.canvas.geometry.Ray.fromAngle(
        position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, d + i * Math.PI, canvas.grid.size
        );
        //drawRay(ray)
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

    const d2 = Math.atan2(boundaries.growDirection.y, boundaries.growDirection.x)
    for (let i = 0; i < 2; i++) {
        const ray = foundry.canvas.geometry.Ray.fromAngle(
        position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, d2 + i * Math.PI, canvas.grid.size
        );
        //drawRay(ray)
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

    if (checkDiagonals) {
        for (let i = 0; i < 4; i++) {
        const directRay = foundry.canvas.geometry.Ray.fromAngle(
            position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, ((1 + 2*i) / 4) * Math.PI, canvas.grid.size*Math.SQRT2
        );
        const ray1 = foundry.canvas.geometry.Ray.fromAngle(
            position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, (i / 2) * Math.PI, canvas.grid.size
        );
        const ray2 = foundry.canvas.geometry.Ray.fromAngle(
            position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, ((1+i) / 2) * Math.PI, canvas.grid.size
        );
        //drawRay(directRay, 0x00ff00)
        const relevantWalls = getRelevantWalls(directRay).concat(getRelevantWalls(ray1)).concat(getRelevantWalls(ray2));
        let collides = false
        for (const wall of relevantWalls) {
            if (foundry.utils.lineSegmentIntersects(
                directRay.A, directRay.B,
                { x: wall.document.c[0], y: wall.document.c[1] },
                { x: wall.document.c[2], y: wall.document.c[3] }
            ) || foundry.utils.lineSegmentIntersects(
                ray1.A, ray1.B,
                { x: wall.document.c[0], y: wall.document.c[1] },
                { x: wall.document.c[2], y: wall.document.c[3] }
            ) || foundry.utils.lineSegmentIntersects(
                ray2.A, ray2.B,
                { x: wall.document.c[0], y: wall.document.c[1] },
                { x: wall.document.c[2], y: wall.document.c[3] }
            )
            ) { 
            collides = true;
            break;
            }
        }
        collisions.push(collides);
        }
    }

    return collisions
}

export function getRelevantTokens(ray, disposition) {
  // Calcola bounding box del raggio
  const minX = Math.min(ray.A.x, ray.B.x) - 1;
  const maxX = Math.max(ray.A.x, ray.B.x) + 1;
  const minY = Math.min(ray.A.y, ray.B.y) - 1;
  const maxY = Math.max(ray.A.y, ray.B.y) + 1;

  // Filtra solo i muri che sono nel bounding box
  return canvas.tokens.objects.children.filter(token => {
    const ul = token.getSnappedPosition();
    console.log("upper left of token", ul)
    const lr = {x: ul.x + canvas.grid.size, y: ul.y + canvas.grid.size}

    let c = [ul, lr]

    //drawXonCell(ul.x, ul.y, 0x00ff00, 0.8, 1000)
    //drawXonCell(lr.x, lr.y, 0x00ff00, 0.8, 1000)

    return (
    Math.max(c.map((p) => p.x)) >= minX &&
    Math.min(c.map((p) => p.x)) <= maxX &&
    Math.max(c.map((p) => p.y)) >= minY &&
    Math.min(c.map((p) => p.y)) <= maxY &&
    token.document.disposition !== disposition
    );
  });
}

export function checkTokenCollisions(position, boundaries, disposition, checkDiagonals = false) {
  let collisions = []
  const tmp = rotateClockwise(boundaries.growDirection)
  const d = Math.atan2(tmp.y, tmp.x)
  for (let i = 0; i < 2; i++) {
      const ray = foundry.canvas.geometry.Ray.fromAngle(
      position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, d + i * Math.PI, canvas.grid.size
      );
      //drawRay(ray)
      const relevantTokenBounds = getRelevantTokens(ray);
      let collides = false
      for (const token of relevantTokenBounds) {
        drawRay(foundry.canvas.geometry.Ray.towardsPoint(token[0], token[1], canvas.grid.size * Math.SQRT2), 0xff00ff, 1000)
        if (foundry.utils.lineSegmentIntersects(
          ray.A, ray.B,
          token[0],
          token[1]
        )) { 
            collides = true;
            break;
        }
      }
      collisions.push(collides);
  }

  const d2 = Math.atan2(boundaries.growDirection.y, boundaries.growDirection.x)
  for (let i = 0; i < 2; i++) {
      const ray = foundry.canvas.geometry.Ray.fromAngle(
      position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, d2 + i * Math.PI, canvas.grid.size
      );
      //drawRay(ray)
      const relevantTokenBounds = getRelevantTokens(ray);
      let collides = false
      for (const token of relevantTokenBounds) {
        drawRay(foundry.canvas.geometry.Ray.towardsPoint(token[0], token[1], canvas.grid.size * Math.SQRT2), 0xff00ff, 1000)
      if (foundry.utils.lineSegmentIntersects(
          ray.A, ray.B,
          token[0],
          token[1]
      )) { 
          collides = true;
          break;
      }
      }
      collisions.push(collides);
  }

  if (checkDiagonals) {
      for (let i = 0; i < 4; i++) {
      const directRay = foundry.canvas.geometry.Ray.fromAngle(
          position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, ((1 + 2*i) / 4) * Math.PI, canvas.grid.size*Math.SQRT2
      );
      const ray1 = foundry.canvas.geometry.Ray.fromAngle(
          position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, (i / 2) * Math.PI, canvas.grid.size
      );
      const ray2 = foundry.canvas.geometry.Ray.fromAngle(
          position.x + canvas.grid.size/2, position.y + canvas.grid.size/2, ((1+i) / 2) * Math.PI, canvas.grid.size
      );
      //drawRay(directRay, 0x00ff00)
      const relevantWalls = getRelevantWalls(directRay).concat(getRelevantWalls(ray1)).concat(getRelevantWalls(ray2));
      let collides = false
      for (const wall of relevantWalls) {
          if (foundry.utils.lineSegmentIntersects(
              directRay.A, directRay.B,
              { x: wall.document.c[0], y: wall.document.c[1] },
              { x: wall.document.c[2], y: wall.document.c[3] }
          ) || foundry.utils.lineSegmentIntersects(
              ray1.A, ray1.B,
              { x: wall.document.c[0], y: wall.document.c[1] },
              { x: wall.document.c[2], y: wall.document.c[3] }
          ) || foundry.utils.lineSegmentIntersects(
              ray2.A, ray2.B,
              { x: wall.document.c[0], y: wall.document.c[1] },
              { x: wall.document.c[2], y: wall.document.c[3] }
          )
          ) { 
          collides = true;
          break;
          }
      }
      collisions.push(collides);
      }
  }

  return collisions
}