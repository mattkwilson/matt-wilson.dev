
// ----------------------SCENE SETUP-------------------------

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();

const viewportElement = document.getElementById('ray-tracing');
viewportElement.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

// -------------------------BODY----------------------------

const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        iResolution: { value: new THREE.Vector3(viewportElement.offsetWidth, viewportElement.offsetHeight, 0)},
        iMouse: { value: new THREE.Vector4() }
    },
    fragmentShader: `
        // Created by Matthew K. Wilson

        uniform vec3 iResolution;
        uniform vec4 iMouse;
        varying vec2 fragCoord;

        #define PI 3.14159265
        #define MAX_RAYCASTS 5
        #define EPSILON 0.001

        // Structs ------------
        struct Ray
        {
            vec3 origin;
            vec3 direction; // normalized
        };

        struct Material
        {
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
            float roughness;
            float kLocal;
            float kReflect;
            float kTransmit;
        };

        struct RayIntersect
        {
            bool valid;
            vec3 point;
            vec3 normal;
            Material material;
        };

        struct Sphere
        {
            vec3 position;
            float radius;
            Material material;
        };

        struct Plane
        {
            vec3 position;
            vec3 normal;
            Material material;
        };

        struct Light
        {
            vec3 position;
            vec3 color;
            float intensity;
        };
        // --------------------

        // Global Variables ---
        // Constants
        const int NumberPlanes = 6;
        const int NumberSpheres = 3;
        const int NumberLights = 2;

        // Objects
        Plane planes[NumberPlanes];
        Sphere spheres[NumberSpheres];

        // Define the camera in WCS
        vec3 camPosition = vec3(3,1,10);
        vec3 cameraLookAtPoint = vec3(0,0,0);
        vec3 cameraUp = vec3(0,1,0);

        // Lights
        vec3 ambientLight = vec3(0.2,0.2,0.2);
        Light mainLight;
        Light secondaryLight;
        Light lights[NumberLights];

        // --------------------

        // Calculates position of light based on position of cursor
        vec3 lightPositionToMouse(Light light, mat3 mouseTransform) {
            return mouseTransform * vec3(iMouse.xy/iResolution.xy,1.0);
        }

        // Calculates light source fall-off (linear)
        float calculateLightIntensity(Light light, vec3 position) {
            float distanceFromSource = length(light.position - position);
            return light.intensity / (distanceFromSource); 
        }

        // Calculates intersection point for sphere and ray L(t)
        //   returns t on intersection or t = -1.0 if not 
        float raycastSphere(Ray ray, Sphere sphere) {

            float r = sphere.radius;
            vec3 p = sphere.position;
            vec3 o = ray.origin;
            vec3 d = ray.direction;
            
            float c = r*r - dot(o,o) + 2.0 * dot(o,p) - dot(p,p);
            float b = -2.0 * (dot(o,d) - dot(p,d)); 
            float a = -1.0; 
            
            float q = b*b - 4.0*a*c;
            if(q < 0.0) {
                return -1.0;
            }
            
            q = sqrt(q);
            
            float t1 = (-b - q)/(2.0*a);
            float t2 = (-b + q)/(2.0*a);
            
            return t1 < t2 ? t1 : t2;
        }

        // Calculates intersection point for plane and ray L(t)
        //   returns t on intersection or t = -1.0 if not 
        float raycastPlane(Ray ray, Plane plane) { 
            float d = -dot(plane.position, plane.normal);
            float denominator = dot(plane.normal,ray.direction);
            // plane and ray are parallel
            if (denominator == 0.0) {
                return -1.0;
            }
            return -(dot(plane.normal,ray.origin) + d) / denominator;
        }

        RayIntersect raycast(Ray ray) {
            vec3 intersectionPoint;
            vec3 intersectionNormal;
            Material material;
            
            // Find closest intersection
            float t = -1.0;
            bool hitSphere = false;
            bool hitPlane = false;
            
            Sphere nearestSphere;
            for(int i = 0; i < NumberSpheres; i++) {
                float temp = raycastSphere(ray, spheres[i]);
                if ((t == -1.0 || temp < t) && temp >= 0.0) {
                    t = temp;
                    nearestSphere = spheres[i];
                    hitSphere = true;
                }
            }
            
            if (hitSphere) {
                intersectionPoint = ray.origin + ray.direction*t;
                intersectionNormal = normalize(intersectionPoint - nearestSphere.position); 
                material = nearestSphere.material;
            } else {
                Plane nearestPlane;
                
                for(int i = 0; i < NumberPlanes; i++) {
                    float temp = raycastPlane(ray, planes[i]);
                    if ((t == -1.0 || temp < t) && temp >= 0.0) {
                        t = temp;
                        nearestPlane = planes[i];
                        hitPlane = true;
                    }
                }
                
                if(hitPlane) {
                    intersectionPoint = ray.origin + ray.direction*t;
                    intersectionNormal = nearestPlane.normal;
                    material = nearestPlane.material;
                }
            }
            
            return RayIntersect(hitSphere || hitPlane, intersectionPoint, intersectionNormal, material);
        }

        bool raycastShadow(vec3 position, Light light) {
            vec3 direction = normalize(light.position - position);
            Ray shadowRay = Ray(position + direction * EPSILON, direction);
            RayIntersect rayIntersect = raycast(shadowRay);
            return !rayIntersect.valid || length(rayIntersect.point - position) < length(position - light.position);
        }

        // Blinn-Phong Lighting Model 
        vec3 calculateBlinnPhongLighting(Material material, vec3 position, vec3 normal) {
            vec3 color = ambientLight * material.ambient;
            
            for(int i = 0; i < NumberLights; i++) {
                Light light = lights[i];

                if (raycastShadow(position, light)) {
                    continue;
                }

                float lightIntensity = calculateLightIntensity(light, position);
                vec3 lightColor = light.color * lightIntensity;
                
                vec3 L = normalize(light.position - position);
                vec3 V = normalize(camPosition - position);
                vec3 H = normalize(L+V);
                
                vec3 diffuse = lightColor * material.diffuse * max(dot(normal,L), 0.0);
                vec3 specular = lightColor * material.specular * pow(max(dot(normal,H),0.0),1.0 / material.roughness); // pow(max(dot(R,V),0.0),material.shininess);
                color += diffuse + specular;
            }

            return color;
        }

        // Iteratively trace reflection rays (does not handle transmission)
        vec3 iterativeRaytrace(Ray ray) {
            RayIntersect[MAX_RAYCASTS] intersectionStack;
            int counter = 0;
            
            RayIntersect rayIntersect = raycast(ray);
            
            while (rayIntersect.valid && counter < MAX_RAYCASTS) { 
                intersectionStack[counter] = rayIntersect;
                
                if (intersectionStack[counter].material.kReflect > 0.0) {
                    vec3 reflectionDirection = normalize(reflect(ray.direction, rayIntersect.normal));
                    // move the reflaction ray ahead by small amount so it doesn't intersect with itself
                    Ray reflectionRay = Ray(rayIntersect.point + reflectionDirection / 1000.0, reflectionDirection);
                    rayIntersect = raycast(reflectionRay);
                } else {
                    // stop bouncing once a non-reflective material is reached
                    break;
                }
                
                counter++;
            }
            
            rayIntersect = intersectionStack[counter];
            vec3 color = rayIntersect.material.kLocal * calculateBlinnPhongLighting(rayIntersect.material,rayIntersect.point,rayIntersect.normal);
            
            for(int i = counter - 1; i >= 0; i--) {
                rayIntersect = intersectionStack[i];
                Material material = rayIntersect.material;
                vec3 localColor = calculateBlinnPhongLighting(material,rayIntersect.point,rayIntersect.normal);
                vec3 reflectColor = color;
                
                color = material.kLocal * localColor + material.kReflect * reflectColor;
            }

            return color;
        }

        //vec3 raytrace(Ray ray) {
            
        //    RayIntersect rayIntersect = raycast(ray);
        //    vec3 color = vec3(0.0,0.0,0.0);
            
        //    if (rayIntersect.valid) {
        //        Material material = rayIntersect.material;
        //        vec3 localColor = calculateBlinnPhongLighting(material,rayIntersect.point,rayIntersect.normal);
        //        vec3 reflectColor = vec3(0.0,0.0,0.0);
        //        vec3 transmitColor = vec3(0.0,0.0,0.0);
                
        //        if (material.kReflect > 0.0) {
        //            vec3 reflectionDirection = normalize(reflect(ray.direction, rayIntersect.normal));
        //            Ray reflectionRay = Ray(rayIntersect.point, reflectionDirection);
        //            reflectColor = raytrace(reflectionRay);
        //        }
                
        //        if (material.kTransmit > 0.0) {
        //            Ray transmissionRay = Ray(rayIntersect.point, ray.direction);
        //            // TODO: handle refraction
        //            transmitColor = raytrace(transmissionRay);
        //        }
                
        //        color = material.kLocal * localColor + material.kReflect * reflectColor + material.kTransmit * transmitColor;
        //    }

        //    return color;
        //}

        // Create ray in WCS
        Ray createRay(vec2 uv)
        {
            // Calculate camera/viewing matrix
            vec3 k = normalize(camPosition - cameraLookAtPoint);
            vec3 i = normalize(cross(cameraUp, k));
            vec3 j = cross(k, i);
            mat4 cameraMatrix = mat4(vec4(i,0.0), vec4(j,0.0), vec4(k,0.0), vec4(camPosition, 1.0));
            mat4 viewMatrix = inverse(cameraMatrix);

            // Define the view frustum
            float aspect = 16.0/9.0;
            float fov = 70.0;
            float n = 2.0; 
            float f = 10.0; 

            float r = n * tan((fov*PI/180.0)/2.0);
            float l = -r;

            float b = l/aspect;
            float t = r/aspect;
            
            // Unneeded, but keeping this here for future reference
            mat4 projMatrix = mat4(
                2.0*n/(r-l), 0.0, 0.0, 0.0,
                0.0, 2.0*n/(t-b), 0.0, 0.0,
                (r+l)/(r-l), (t+b)/(t-b), -(f+n)/(f-n), -1.0,
                0.0, 0.0, -2.0*f*n/(f-n), 0.0);

            float x = uv.x * (2.0*r) - r;
            float y = uv.y * (2.0*t) - t;
            float z = -n;
            
            // Convert ray from VCS to WCS
            vec4 position = cameraMatrix * vec4(x,y,z,1.0);
            vec3 direction = normalize(position.xyz - camPosition);  
            return Ray(camPosition, direction);
        }

        void main()
        {
            Material planeMaterial1 = Material(vec3(0.5,0.5,0.5), vec3(1.0,1.0,1.0), vec3(0.0,0.0,0.0), 1.0, 1.0, 0.0, 0.0);
            Material planeMaterial2 = Material(vec3(0.5,0.5,0.5), vec3(0.77, 0.17, 0.17), vec3(0.0,0.0,0.0), 1.0, 1.0, 0.0, 0.0);
            Material planeMaterial3 = Material(vec3(0.5,0.5,0.5), vec3(0.52, 0.88, 0.56), vec3(0.0,0.0,0.0), 1.0, 1.0, 0.0, 0.0);
            Material planeMaterial4 = Material(vec3(0.5,0.5,0.5), vec3(1.0, 1.0, 1.0), vec3(1.0,1.0,1.0), 2.0, 0.0, 1.0, 0.0);
            Material planeMaterial5 = Material(vec3(0.5,0.5,0.5), vec3(0.54, 0.30, 0.93), vec3(0.0,0.0,0.0), 1.0, 1.0, 0.0, 0.0);
            Material sphereMaterial = Material(vec3(0.5,0.5,0.5), vec3(0.0, 0.888, 0.76), vec3(0.5,0.5,0.5), 0.02, 0.94, 0.06, 0.0);
            Material sphereMaterial2 = Material(vec3(0.5,0.5,0.5), vec3(1.0, 1.0, 1.0), vec3(0.3,0.3,0.3), 0.1, 0.0, 1.0, 0.0);
            Material sphereMaterial3 = Material(vec3(0.5,0.5,0.5), vec3(0.85, 0.23, 0.43), vec3(0.0,0.0,0.0), 5.0, 1.0, 0.0, 0.0);

            Plane pFloor = Plane(vec3(0.0,-2.0,0.0), vec3(0.0,1.0,0.0), planeMaterial1);
            Plane plWall = Plane(vec3(-5.0,-2.0,0.0), vec3(1.0,0.0,0.0), planeMaterial2); 
            Plane prWall = Plane(vec3(5.0,-2.0,0.0), vec3(-1.0,0.0,0.0), planeMaterial3); 
            Plane pbWall = Plane(vec3(0.0,-2.0,-5.0), vec3(0.0,0.0,1.0), planeMaterial4); 
            Plane pfWall = Plane(vec3(0.0,-2.0,12.0), vec3(0.0,0.0,-1.0), planeMaterial5); 
            Plane pCeiling = Plane(vec3(0.0,4.0,0.0), vec3(0.0,-1.0,0.0), planeMaterial1);
            
            Sphere sphere1 = Sphere(vec3(0.0,-1.0,0.0), 1.0, sphereMaterial);
            Sphere sphere2 = Sphere(vec3(-2.0,0.0,4.0), 1.0, sphereMaterial2);
            Sphere sphere3 = Sphere(vec3(3.0,1.5,4.0), 0.5, sphereMaterial3);

            mainLight = Light(vec3(2.0,2.0,5.0),vec3(1.0,1.0,1.0), 2.0);
            secondaryLight = Light(vec3(-2.0,1.5,-2.0),vec3(1.0,1.0,1.0), 2.0);
            mainLight.position = lightPositionToMouse(mainLight, mat3(vec3(6.0,0.0,0.0), vec3(0.0,2.0,0.0), vec3(-3.0,0.0,6.0)));

            lights = Light[](mainLight, secondaryLight);

            planes = Plane[NumberPlanes](plWall, prWall, pbWall, pfWall, pFloor, pCeiling);
            spheres = Sphere[NumberSpheres](sphere1, sphere2, sphere3);

            Ray ray = createRay(gl_FragCoord.xy / iResolution.xy);
            vec3 color = iterativeRaytrace(ray);
            
            gl_FragColor = vec4(color,1.0);
        }
    `,
    vertexShader: `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `
});

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial));

// ----------------------Handle Input----------------------
var mouseDown = false;

viewportElement.addEventListener('mousedown', (event) => {
    mouseDown = true;
    update();
});

viewportElement.addEventListener('mouseup', (event) => {
    mouseDown = false;
});

// -----------------Capture Cursor Position-----------------

viewportElement.addEventListener('mousemove', (event) => {
    shaderMaterial.uniforms.iMouse.value = new THREE.Vector4(event.clientX, event.clientY, 0, 0);
    shaderMaterial.uniformsNeedUpdate = true;
});

// ----------------------Handle Resizing--------------------

window.addEventListener('resize', resize);

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(viewportElement);

function resize() {
    const width = viewportElement.offsetWidth;
    const height = viewportElement.offsetHeight;
    renderer.setSize(width, height);

    shaderMaterial.uniforms.iResolution.value = new THREE.Vector3(width, height, 0);
    shaderMaterial.uniformsNeedUpdate = true;

    update();
}

// -------------------------UPDATE---------------------------

function update() {
    renderer.render(scene, camera);

    if(mouseDown) {
        requestAnimationFrame(update);
    }
}

update();