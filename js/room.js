import * as THREE from 'three';

class Room {
  constructor(name, textures) {
    this.name = name;
    // Floor, ceiling, left wall, right wall, back wall, front wall
    this.textures = textures;
    this.items = [];
    this.textureLoader = new THREE.TextureLoader();
  }

    buildWalls(scene) {
        const wallTexture = this.textureLoader.load('../resources/images/wall.jpg');
        const floorTexture = this.textureLoader.load('../resources/images/floor.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set( 4, 4 );
        const ceilingTexture = this.textureLoader.load('../resources/images/ceiling.jpg');
        const windowedTexture = this.textureLoader.load('../resources/images/windowWall.jpg');
        const floor = this.buildWall(10, 10, 0, -3, 0, -Math.PI / 2, 0, 0, floorTexture);
        scene.add(floor);
        const ceiling = this.buildWall( 10, 10, 0, 5, 0, Math.PI / 2, 0, 0, ceilingTexture);
        scene.add(ceiling);
        const leftWall = this.buildWall( 10, 10, -5, 0, 0, 0, Math.PI/2, 0, wallTexture);
        scene.add(leftWall);
        const rightWall = this.buildWall( 10, 10, 5, 0, 0, 0, -Math.PI/2, Math.PI, windowedTexture, false, true);
        scene.add(rightWall);
        const backWall = this.buildWall( 10, 10, 0, 2, -5, 0, 0, 0, wallTexture, true);
        scene.add(backWall);
        const frontWall = this.buildWall( 10, 10, 0, 2, 5, 0, -Math.PI, 0, wallTexture);
        scene.add(frontWall);
    }

    buildWall( width, height, x, y, z, rotationX, rotationY, rotationZ = 0, texture, door = false, window = false) {
        const planeGeometry = new THREE.PlaneGeometry(width, height);
        let planeMaterial
        if (!door) {
            // Dogwater code <3
            if (window) {
                const alphaMap = this.textureLoader.load('../resources/images/windowAlphaMap.jpg')
                planeMaterial = new THREE.MeshLambertMaterial({ 
                    alphaMap: alphaMap,
                    map: texture,
                    transparent: true,
                });

            } else {
                planeMaterial = new THREE.MeshLambertMaterial({ map: texture });
            }
            
        } else {
            const alphaMap = this.textureLoader.load('../resources/images/dooredWall.jpg')
            planeMaterial = new THREE.MeshLambertMaterial({
                alphaMap: alphaMap, 
                map: texture,
                transparent: true
            });
            
        }
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = rotationX; // Rotate the plane to be horizontal
        plane.rotation.y = rotationY; // Rotate the plane to be horizontal
        plane.rotation.z = rotationZ; // Rotate the plane to be horizontal
        plane.position.x = x;
        plane.position.y = y; // Position the plane below the cube
        plane.position.z = z;
        return plane;
    }
}

export default Room;
