const element = document.getElementById("three");
const width = element.offsetWidth;
const height = element.offsetHeight;

// ----------------------SCENE SETUP-------------------------

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
renderer.setClearColor(0x000000);
element.appendChild(renderer.domElement);

const aspect = width / height;
const camera = new THREE.PerspectiveCamera(80, aspect, 0.1, 100);
camera.position.set(0,12,0);
camera.lookAt(0,0,0);

const ambientLight = new THREE.AmbientLight(0x4a4a4a);
scene.add(ambientLight);
const light = new THREE.PointLight(0xffffff);
scene.add(light);

// -------------------------BODY----------------------------

const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        
    },
    vertexShader: document.getElementById('vertex').textContent,
    fragmentShader: document.getElementById('frag').textContent
});

scene.add(new THREE.Mesh(new THREE.SphereGeometry(5), sphereMaterial));

// ------------------------CONTROLS--------------------------

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);
const pressedKeys = new Set();

function keydown(event) {
    pressedKeys.add(event.keyCode);
}

function keyup(event) {
    pressedKeys.delete(event.keyCode);
}

var clock = new THREE.Clock();

function inputHandler() {
    const speed = 5;
    var delta = clock.getDelta();

}

// -------------------------UPDATE---------------------------

window.addEventListener('resize', resize);
function resize() {
    renderer.setSize(element.offsetWidth, element.offsetHeight);
    camera.aspect = element.offsetWidth / element.offsetHeight;
    camera.updateProjectionMatrix();
}

function update() {
    light.position.set(camera.position.x, camera.position.y, camera.position.z);

    inputHandler();
    requestAnimationFrame(update);
    renderer.render(scene, camera);
}

update();