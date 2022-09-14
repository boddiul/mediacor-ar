
const panelShowSpeed = 20/2;
const textOpenSpeed = 15/2;


const panelCircleOffset = [0+10,90-10,180+10,270-10];

var scene, camera, renderer, clock, deltaTime, totalTime;
var dissTime;
var raycaster;

var raycastPlane, dummyTextPlane;

var arToolkitSource, arToolkitContext, smoothedControls;

var markerRoot1, markerRoot2;

var mesh1;

const texture_names = ["mediacor","mediacor_pattern","preview1","preview2","preview3","preview4","shadow","text1","text2","text3","text4"];

var textures = {};

var p = 0;
function loadTextures() {
  new THREE.TextureLoader().load(`assets/${texture_names[p]}.png`, function(texture) {
    textures[texture_names[p]] = new THREE.MeshBasicMaterial({ map: texture,transparent: true, color: 0xffffff });
    
    p ++;
    if (p < texture_names.length)
        loadTextures();
    else
    {
        initialize();
        animate();
    }
        
  });
}
loadTextures();


var panelData = [];



function initialize()
{

    console.log(textures);
	scene = new THREE.Scene();

	let ambientLight = new THREE.AmbientLight( 0xcccccc, 0.5 );
	scene.add( ambientLight );
				
	camera = new THREE.Camera();
	scene.add(camera);

	renderer = new THREE.WebGLRenderer({
		antialias : true,
		alpha: true
	});
	renderer.setClearColor(new THREE.Color('lightgrey'), 0)
	//renderer.setSize( 640, 480 );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

	renderer.domElement.style.position = 'absolute'
	renderer.domElement.style.top = '0px'
	renderer.domElement.style.left = '0px'
	document.body.appendChild( renderer.domElement );

	clock = new THREE.Clock();
	deltaTime = 0;
	totalTime = 0;
	
	////////////////////////////////////////////////////////////
	// setup arToolkitSource
	////////////////////////////////////////////////////////////

	arToolkitSource = new THREEx.ArToolkitSource({
		sourceType : 'webcam',
	});

	function onResize()
	{
		arToolkitSource.onResize()	
		arToolkitSource.copySizeTo(renderer.domElement)	
		if ( arToolkitContext.arController !== null )
		{
			arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)	
		}	
	}

	arToolkitSource.init(function onReady(){
		onResize()
	});
	
	// handle resize event
	window.addEventListener('resize', function(){
		onResize()
	});
	
	////////////////////////////////////////////////////////////
	// setup arToolkitContext
	////////////////////////////////////////////////////////////	

	// create atToolkitContext
	arToolkitContext = new THREEx.ArToolkitContext({
		cameraParametersUrl: 'data/camera_para.dat',
		detectionMode: 'mono'
	});
	
	// copy projection matrix to camera when initialization complete
	arToolkitContext.init( function onCompleted(){
		camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
	});

	////////////////////////////////////////////////////////////
	// setup markerRoots
	////////////////////////////////////////////////////////////

	// build markerControls
	markerRoot1 = new THREE.Group();
	scene.add(markerRoot1);
	
	let markerControls1 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
		type : 'pattern',
		patternUrl : "data/kanji.patt",
	})

	// interpolates from last position to create smoother transitions when moving.
	// parameter lerp values near 0 are slow, near 1 are fast (instantaneous).
	let smoothedRoot = new THREE.Group();
	scene.add(smoothedRoot);
	smoothedControls = new THREEx.ArSmoothedControls(smoothedRoot, {
		lerpPosition: 0.8,
		lerpQuaternion: 0.8,
		lerpScale: 1,
		// minVisibleDelay: 1,
		// minUnvisibleDelay: 1,
	});

	let geometry1	= new THREE.CubeGeometry(1,0.45,1);
	let material1	= new THREE.MeshNormalMaterial({
		transparent : true,
		opacity: 0.5,
		side: THREE.DoubleSide
	}); 
	
	mesh1 = new THREE.Mesh( geometry1, material1 );
	mesh1.position.y = 0.25;
	
	//smoothedRoot.add( mesh1 );


    
    dummyTextPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1, 1 ), new THREE.MeshBasicMaterial({visible : false}) );

    dummyTextPlane.position.z = -2.25;
    
    
    scene.add( dummyTextPlane );


    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ),textures["shadow"]);
    shadowPlane.rotation.x = -Math.PI/2;
    
	smoothedRoot.add( shadowPlane );
    
    const mediacorPattern = new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ),textures["mediacor_pattern"]);
    mediacorPattern.position.y = 0.25;
    mediacorPattern.rotation.x = -Math.PI/2;
	smoothedRoot.add( mediacorPattern );

    
    const mediacorName = new THREE.Mesh(new THREE.PlaneGeometry( 1, 121/1024 ),textures["mediacor"]);
    mediacorName.position.y = 0.3;
    mediacorName.position.z = 0.3;
    mediacorName.rotation.x = -Math.PI/2;
	smoothedRoot.add( mediacorName );


    raycastPlane = new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial( {color: 0x01ff01, visible: false} ));
    //raycastPlane.visible = false;
    raycastPlane.rotation.x = -Math.PI/2;
	smoothedRoot.add( raycastPlane );

    for (let i=0;i<4;i++)
    {
        let mesh1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),textures["preview"+(i+1)]);
        let mesh2 = new THREE.Mesh(new THREE.PlaneGeometry(1,1),textures["text"+(i+1)]);
        let baseObj = new THREE.Object3D();

        baseObj.rotation.x = -Math.PI/2;
        panelData.push({
            "mesh1" : mesh1,
            "mesh2" : mesh2,
            "baseObj" : baseObj,
            "openK": 0,
            "openState": "closed"
        })

        smoothedRoot.add(baseObj);
        scene.add(mesh1);
        scene.add(mesh2);
    }


    raycaster = new THREE.Raycaster();
    
    document.body.addEventListener('click', onDocumentClick, false);

    dissTime = 0;

}


var selectedPanel = -1;

var panelsShowK = 0;




var mainVisible = false;

function update()
{
  
	// update artoolkit on every frame
	if ( arToolkitSource.ready !== false )
    {
        arToolkitContext.update( arToolkitSource.domElement );
    }
		
		
	// additional code for smoothed controls
	smoothedControls.update(markerRoot1);


    //console.log(markerRoot1.visible)


    mainVisible = markerRoot1.visible;


    let dd = clock.getDelta();
    dd = 1/60;

    for (let i=0;i<4;i++)

    if (panelData[i].openState==="opening")
    {
        if (panelData[i].openK<1)
            panelData[i].openK+=textOpenSpeed*dd;

        if (panelData[i].openK>=1)
        {
            panelData[i].openK = 1;
            panelData[i].openState = "opened";
        }
    } 
    else if (panelData[i].openState==="closing")
    {
        if (panelData[i].openK>0)
            panelData[i].openK-=textOpenSpeed*dd;

        if (panelData[i].openK<=0)
        {
            panelData[i].openK = 0;
            panelData[i].openState = "closed";
        }
    }

    if (mainVisible)
    {
        if (panelsShowK<1)
            panelsShowK+=panelShowSpeed*dd;
        if (panelsShowK>=1)
            panelsShowK=1;
        
        dissTime = 0;
    }
    else
    {
        if (dissTime>0.1)
            if (panelsShowK>0)
                panelsShowK-=panelShowSpeed*dd;
            if (panelsShowK<=0)
                panelsShowK=0;
    }

    dummyTextPlane.position.y = -0.4 + Math.sin(totalTime*2)/20;
   
    for (let i=0;i<4;i++)
        {
            let aa = (panelCircleOffset[i]+60+6*totalTime)/180*Math.PI;
            let ll = panelsShowK*panelsShowK;


            panelData[i].baseObj.position.y = 0.15;


            panelData[i].baseObj.position.x = Math.cos(aa)*ll + Math.sin(aa)*ll;
            panelData[i].baseObj.position.z = Math.sin(aa)*ll - Math.cos(aa)*ll;


            let q1 = new THREE.Quaternion();
            panelData[i].baseObj.getWorldQuaternion(q1);
            let v1 = panelData[i].baseObj.getWorldPosition();


            let v2 = dummyTextPlane.getWorldPosition();


            q1.slerp(dummyTextPlane.quaternion,panelData[i].openK*0.75);

            
            /*
            let v = v2.clone();
            
            v.sub(v1);
            v.multiplyScalar(panelData[i].openK*0.95);
            v1.add(v);*/


            let v = new THREE.Vector3(
                v1.x + (v2.x-v1.x)*panelData[i].openK*0.95,
                v1.y + (v2.y-v1.y)*panelData[i].openK*0.95+Math.sin(panelData[i].openK/Math.PI*10)*0.5,
                v1.z + (v2.z-v1.z)*panelData[i].openK*0.95

            )
            
            // 0 2
            // 1 1
            let sc = 2-panelData[i].openK;
            panelData[i].mesh1.scale.set(sc,sc,sc);
            panelData[i].mesh2.scale.set(sc,sc,sc);

            let showT = (panelData[i].openK>0.5); //|| (panelData[i].openK>0.1 && Math.sin(totalTime*50)>0); 
        
            panelData[i].mesh1.rotation.setFromQuaternion(q1);
            panelData[i].mesh1.position.copy(v);
            panelData[i].mesh1.visible = !showT && panelsShowK>0.1;

            panelData[i].mesh2.rotation.setFromQuaternion(q1);
            panelData[i].mesh2.position.copy(v);
            panelData[i].mesh2.visible = showT;
            
            //panelData[i].mesh1.position.y+=1.5*panelData[i].openK;


            

            /*
            panelData[i].mesh1.rotation.setFromQuaternion(t);
            panelData[i].mesh2.rotation.setFromQuaternion(t);

            panelData[i].mesh1.position.copy( v );
            panelData[i].mesh2.position.copy( v );*/

            //panelData[i].mesh.position.setFromQuaternion(t);
        }
    
        
}



function onDocumentClick(event) {
    console.log(event);


    let clickX = (event.clientX / window.innerWidth) * 2 - 1;
    let clickY = -(event.clientY / window.innerHeight) * 2 + 1;

    let topHalf = clickY>=-0.2;

    console.log(topHalf);

    
    //raycaster.setFromCamera({x:clickX,y:clickY}, camera);

    const camInverseProjection = new THREE.Matrix4().getInverse(camera.projectionMatrix);
    const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
    const mousePosition = new THREE.Vector3(clickX, clickY, 1).applyMatrix4(camInverseProjection);
    const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();

    raycaster.set(cameraPosition, viewDirection);


    let opened = -1;

    let anyAnim = false;
    
    for (let i=0;i<4;i++)
    {

        if (panelData[i].openState =="opened")
            opened = i;
        else if (panelData[i].openState =="opening" || panelData[i].openState =="closing")
            anyAnim = true;
    }

    if (opened!=-1 && !topHalf)
        panelData[opened].openState = "closing";

    else if (mainVisible && !anyAnim)
    {
        let intersections = raycaster.intersectObject(raycastPlane);


        if (intersections.length>0)
        {

            let v = intersections[0].point;


            let bestD = -1;
            let bestI = -1;

            for (let i=0;i<4;i++)
            {

                if (panelData[i].openState !="closed")
                    continue;

                let dist = v.distanceTo(panelData[i].baseObj.getWorldPosition());

                if (bestD==-1 || dist<bestD)
                {
                    bestD = dist;
                    bestI = i;
                }
            }

            if (opened!=-1 && bestD>1)
                panelData[opened].openState = "closing";
            else if (bestI!=-1)
                {
                    //selectedPanel = bestI;
                    panelData[bestI].openState = "opening";
        
                    
                    for (let i=0;i<4;i++)
                    {
                        if (panelData[i].openState == "opened")
                            panelData[i].openState = "closing";
                    }
                }
                
            
        }
    }

}

function render()
{
	renderer.render( scene, camera );
}


function animate()
{
	requestAnimationFrame(animate);
	deltaTime = clock.getDelta();
	totalTime += deltaTime;
    dissTime += deltaTime;
	update();
	render();
}