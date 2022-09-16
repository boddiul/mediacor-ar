const panelShowSpeed = 20/2;
const textOpenSpeed = 15/2;

const panelsNum = 11; 


const logoHeight = 0.75;


//const panelCircleOffset = [0+10,90-10,180+10,270-10];

var panelStartOffset = [
/*[-1,0,-1],
[1,0,-1],
[-1,0,1],
[1,0,1],
[-1,0,-1],
[1,0,-1],
[-1,0,1],
[1,1,1],
[-1,1,-1],
[1,1,-1],
[-1,1,1],*/

/*[0,0,0.4],
[-0.3,0,0.35],
[0.3,0,0.35],
[0,0,0.2],
[-0.3,0,0],
[0.3,0,0],
[-0.2,0,-0.2],
[0.2,0,-0.2],
[-0.4,0,0.15],
[0,0,-0.4],
[0.4,0,0.15],*/

[0,0,-0.75],
[-0.35,0,-0.5],
[0.35,0,-0.5],
[-0.55,0,-0.2],
[0.55,0,-0.2],
[-0.5,0,0.15],
[0.5,0,0.15],
[-0.65,0,0.5],
[0.65,0,0.5],
[-0.35,0,0.8],
[0.35,0,0.8]
];
/*for (let i=0;i<11;i++)
    panelStartOffset.push([-2+Math.random()*4,1+Math.random()*0.5,-4+Math.random()*8])*/

/*for (let i=0;i<11;i++)
        panelStartOffset[i] = [6*panelStartOffset[i][0],logoHeight+1*panelStartOffset[i][1],-7*panelStartOffset[i][2]]
*/
for (let i=0;i<11;i++)
        panelStartOffset[i] = [3*panelStartOffset[i][0],logoHeight+1*(1-Math.abs(panelStartOffset[i][0])),3*panelStartOffset[i][2]]


var scene, camera, renderer, clock, deltaTime, totalTime;
var dissTime;
var raycaster;

var raycastPlane, dummyTextPlane, mediacorPattern;

var arToolkitSource, arToolkitContext, smoothedControls;

var markerRoot1, markerRoot2;

var mesh1;

//const texture_names = ["back","mediacor","mediacor_pattern","mediacor_pattern_lag1","mediacor_pattern_lag2","preview1","preview2","preview3","preview4","shadow","text1","text2","text3","text4"];

const texture_names = ["back1","back2","back3",
                    "preview_back",
                    "mediacor","shadow",
                    "mediacor_pattern","mediacor_pattern_lag1","mediacor_pattern_lag2",
                    "photo_cinema","help"
                    ]
for (let i=1;i<=11;i++)
    {
        texture_names.push("preview_text"+i);
        texture_names.push("text"+i)
    }

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
    renderer.setPixelRatio(window.devicePixelRatio*1.5);
    //console.log(window.devicePixelRatio);
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
		patternUrl : "data/mcor.patt",
	})

	let markerControls2 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
		type : 'pattern',
		patternUrl : "data/kanji.patt",
	})

	// interpolates from last position to create smoother transitions when moving.
	// parameter lerp values near 0 are slow, near 1 are fast (instantaneous).
	let smoothedRoot = new THREE.Group();
	scene.add(smoothedRoot);
	smoothedControls = new THREEx.ArSmoothedControls(smoothedRoot, {
		lerpPosition: 0.9,
		lerpQuaternion: 0.5,
		lerpScale: 0.7,
        //lerpStepDelay : 1/120
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

    dummyTextPlane.position.z = -3;
    
    
    scene.add( dummyTextPlane );


    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry( 2, 2 ),textures["shadow"]);
    shadowPlane.rotation.x = -Math.PI/2;
    
	smoothedRoot.add( shadowPlane );
    
    mediacorPattern = 
    [
        new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ),textures["mediacor_pattern"]),
        new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ),textures["mediacor_pattern_lag1"]),
        new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ),textures["mediacor_pattern_lag2"])
    ];
    for (let i=0;i<3;i++)
        scene.add( mediacorPattern[i] );


    mediacorPatternPos = new THREE.Object3D();
    mediacorPatternPos.position.y = logoHeight;
    mediacorPatternPos.rotation.x = -Math.PI/2;
    smoothedRoot.add( mediacorPatternPos );

    mediacorName =  new THREE.Mesh(new THREE.PlaneGeometry( 1, 121/1024 ),textures["mediacor"])
    scene.add(mediacorName);

    mediacorNamePos = new THREE.Object3D();
    mediacorNamePos.position.y = logoHeight+0.07;
    mediacorNamePos.position.z = 0.3;
    mediacorNamePos.rotation.x = -Math.PI/2;
	smoothedRoot.add( mediacorNamePos );


    raycastPlane = new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial( {color: 0x01ff01, visible: false} ));
    //raycastPlane.visible = false;
    raycastPlane.rotation.x = -Math.PI/2;
    raycastPlane.position.y = logoHeight;
	smoothedRoot.add( raycastPlane );

    for (let i=0;i<panelsNum;i++)
    {
        let mesh1 = new THREE.Mesh(new THREE.PlaneGeometry(7/10,1/3),textures["preview_back"]);
        let header = new THREE.Mesh(new THREE.PlaneGeometry(1,1/3),textures["preview_text"+(i+1)]);
        let mesh2 = new THREE.Mesh(new THREE.PlaneGeometry(1,2/3),textures["back"+(1+Math.floor(Math.random() * 3))]);
        let txt = new THREE.Mesh(new THREE.PlaneGeometry(1,2/3),textures["text"+(i+1)]);

        let baseObj = new THREE.Object3D();

        baseObj.rotation.x = -Math.PI/2;
        baseObj.rotation.y = panelStartOffset[i][0]/10;
        panelData.push({
            "mesh1" : mesh1,
            "header":header,
            "mesh2" : mesh2,
            "txt":txt,
            "baseObj" : baseObj,
            "openK": 0,
            "openState": "closed",
            "visited" : false
        })
    

        smoothedRoot.add(baseObj);
        scene.add(mesh1);

        header.position.z = 0.05;
        mesh1.add(header);

        mesh2.position.y = -0.5;
        mesh1.add(mesh2);

        txt.position.y = -0.5;
        txt.position.z = 0.05;
        mesh1.add(txt);

        if (i===4)
        {
            panelData[i]["img"] = new THREE.Mesh(new THREE.PlaneGeometry(0.7,506/811*0.7),textures["photo_cinema"]);

            panelData[i]["img"].position.y = -0.7;
            panelData[i]["img"].position.z = 0.2;
            mesh1.add(panelData[i]["img"]);
        }
    }


    raycaster = new THREE.Raycaster();
    
    document.body.addEventListener('click', onDocumentClick, false);

    dissTime = 0;



    helpPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),textures["help"]);
    helpPlane.position.z = -2;
    helpPlane.material.opacity = 0;
    scene.add( helpPlane );
}


var selectedPanel = -1;

var panelsShowK = 0;




var mainVisible = false;

var firstShow = false;

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

    if (mainVisible)
        firstShow = true;

    let dd = clock.getDelta();
    dd = 1/60;

    for (let i=0;i<panelsNum;i++)

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

    /*
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
    }*/
    if (mainVisible)
    {
        if (panelsShowK<1)
            panelsShowK+=panelShowSpeed*dd;
        if (panelsShowK>=1)
            panelsShowK=1;
    }


    dummyTextPlane.position.y = 0 + Math.sin(totalTime*2)/20;

    
    let k = Math.floor(Math.random()*3);

    if (Math.sin(totalTime*2)<0)
        k = 0;
    for (let i=0;i<3;i++)

    {

        mediacorPattern[i].visible = i===k && firstShow;

        if (mainVisible)
        {
            mediacorPattern[i].position.lerp(mediacorPatternPos.getWorldPosition(),0.1*4);
            mediacorPattern[i].position.z = mediacorPatternPos.getWorldPosition().z;
            mediacorPattern[i].rotation.setFromQuaternion(mediacorPatternPos.getWorldQuaternion());

        }
        
    }

    mediacorName.visible = firstShow;
    if (mainVisible)
    {
        mediacorName.position.lerp(mediacorNamePos.getWorldPosition(),0.1*4);
        mediacorName.position.z = mediacorNamePos.getWorldPosition().z;
        mediacorName.rotation.setFromQuaternion(mediacorNamePos.getWorldQuaternion());
       
    }

    helpPlane.visible = !firstShow;

    if (helpPlane.material.opacity<0.75)
        helpPlane.material.opacity+=0.0002

    if (helpPlane.material.opacity>=0.75)
        helpPlane.material.opacity = 0.75;
    
    for (let i=0;i<panelsNum;i++)
        {
            /*let aa = (panelCircleOffset[i]+60+2*10*totalTime)/180*Math.PI;
            let ll = panelsShowK*panelsShowK;


            panelData[i].baseObj.position.y = logoHeight+0.50+Math.sin(i+totalTime*3)/15;


            panelData[i].baseObj.position.x = Math.cos(aa)*ll + Math.sin(aa)*ll;
            panelData[i].baseObj.position.z = Math.sin(aa)*ll - Math.cos(aa)*ll;*/

            let ll = panelsShowK*panelsShowK;

            let aa = i+totalTime;

            panelData[i].baseObj.position.x = panelStartOffset[i][0]+Math.sin(aa)/4;
            panelData[i].baseObj.position.y = panelStartOffset[i][1]-Math.cos(1+aa*0.8)/4;
            panelData[i].baseObj.position.z = panelStartOffset[i][2]+Math.sin(2+aa*1.2)/8;


            panelData[i].baseObj.position.multiplyScalar(ll);


            let q1 = new THREE.Quaternion();
            panelData[i].baseObj.getWorldQuaternion(q1);
            let v1 = panelData[i].mesh1.position;


            // 0 1
            // 1 0.05
            v1.lerp(panelData[i].baseObj.getWorldPosition(),1-panelsShowK*0.75);
            //v1.y = panelData[i].baseObj.getWorldPosition().y;




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

            //console.log(panelData[i].openK,sc);
            //panelData[i].mesh2.scale.set(sc,sc,sc);

           
            
            let showT = (panelData[i].openK>0.5); //|| (panelData[i].openK>0.1 && Math.sin(totalTime*50)>0); 
        
            panelData[i].mesh1.rotation.setFromQuaternion(q1);
            panelData[i].mesh1.position.copy(v);
            panelData[i].mesh1.visible = true;//!showT && panelsShowK>0.1;

            
            /*

            panelData[i].mesh2.rotation.setFromQuaternion(q1);
            panelData[i].mesh2.position.copy(v);*/
            panelData[i].mesh2.visible = showT;
            panelData[i].txt.visible = showT;
            

            if ("img" in panelData[i])
                panelData[i].img.visible = showT;
            //panelData[i].mesh1.position.y+=1.5*panelData[i].openK;


            panelData[i].header.material.opacity = panelData[i].visited &&  panelData[i].openK < 0.5 ? 0.5 : 1;


            /*
            panelData[i].mesh1.rotation.setFromQuaternion(t);
            panelData[i].mesh2.rotation.setFromQuaternion(t);

            panelData[i].mesh1.position.copy( v );
            panelData[i].mesh2.position.copy( v );*/

            //panelData[i].mesh.position.setFromQuaternion(t);
        }
    


    for (let i=0;i<panelsNum;i++)
        if (panelData[i].openState == "opened")
           panelData[i].visited = true;

        
}



function onDocumentClick(event) {
    console.log(event);


    let clickX = (event.clientX / window.innerWidth) * 2 - 1;
    let clickY = -(event.clientY / window.innerHeight) * 2 + 1;

    let topHalf = clickY>=-0.2;

    console.log(clickX,clickY);

    
    //raycaster.setFromCamera({x:clickX,y:clickY}, camera);

    const camInverseProjection = new THREE.Matrix4().getInverse(camera.projectionMatrix);
    const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
    const mousePosition = new THREE.Vector3(clickX, clickY, 1).applyMatrix4(camInverseProjection);
    const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();

    raycaster.set(cameraPosition, viewDirection);


    let opened = -1;

    let anyAnim = false;
    
    for (let i=0;i<panelsNum;i++)
    {

        if (panelData[i].openState =="opened")
            opened = i;
        else if (panelData[i].openState =="opening" || panelData[i].openState =="closing")
            anyAnim = true;
    }

    if (opened!=-1 /*&& !topHalf*/)
        panelData[opened].openState = "closing";

    else if (!anyAnim)
    {

        let bestD = -1;
        let bestI = -1;

        for (let i=0;i<panelsNum;i++)
        if (firstShow)
        {
            let intersections = raycaster.intersectObjects([panelData[i].mesh1,panelData[i].header]);
            if (intersections.length>0)
            {
                bestI = i;
                bestD = 0;
            }

        }


        if (bestI===-1)
        {
            let intersections = raycaster.intersectObject(raycastPlane);


            if (intersections.length>0)
            {
    
                let v = intersections[0].point;
    
    
    
                for (let i=0;i<panelsNum;i++)
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
    
                
                    
                
            }
        }
        

        if (opened!=-1 && bestD>1)
            panelData[opened].openState = "closing";
        else if (bestI!=-1)
            {
                    //selectedPanel = bestI;
                    panelData[bestI].openState = "opening";
        
                    
                for (let i=0;i<panelsNum;i++)
                {
                        if (panelData[i].openState == "opened")
                            panelData[i].openState = "closing";
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

