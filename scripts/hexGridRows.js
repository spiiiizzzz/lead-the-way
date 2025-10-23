function getAdjacentPositions(pos) { 
    //HEX TESTING
    console.log(canvas.grid.getAdjacentCubes(pos.x, pos.y))
    console.log("pos:", pos)

    for (const cube of canvas.grid.getAdjacentCubes(pos.x, pos.y)) {
      console.log("cube:", cube)
      let adjPos = {
        x: pos.x + Math.sqrt(3) * canvas.grid.sizeY/2  * (cube.q + cube.r / 2),
        y: pos.y + 3/2 * canvas.grid.sizeY/2 * cube.r
      }
      console.log("follower:", followers[0])
      followers[0].document.move([{
        x: adjPos.x,
        y: adjPos.y
      }], {
            autoRotate: true,
            method: "api",
            constrainOptions: {
              ignoreWalls: true
            }
          })
      drawXonCell(adjPos.x, adjPos.y, 0x00ff00, 0.5, 1000)
    }
}