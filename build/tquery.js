// tquery.js - https://github.com/jeromeetienne/tquery - MIT License
/**
 * @fileOverview This file is the core of tQuery library. 
*/

/**
 * Create a tQuery element
 *
 * @class root class
 * 
 * @param {} object
 * @param {THREE.Object3D} rootnode
 * @returns {tQuery.*} the tQuery object created
*/
var tQuery	= function(object, root)
{
// TODO make tthat cleaner
// - there is a list of functions registered by each plugins
//   - handle() object instanceof THREE.Mesh
//   - create() return new tQuery(object)
// - this list is processed in order here

	if( object instanceof THREE.Mesh  && tQuery.Mesh){
		return new tQuery.Mesh(object);

	}else if( object instanceof THREE.DirectionalLight && tQuery.DirectionalLight){
		return new tQuery.DirectionalLight(object);
	}else if( object instanceof THREE.AmbientLight && tQuery.AmbientLight){
		return new tQuery.AmbientLight(object);
	}else if( object instanceof THREE.Light && tQuery.Light){
		return new tQuery.Light(object);

	}else if( object instanceof THREE.Object3D  && tQuery.Object3D){
		return new tQuery.Object3D(object);
	}else if( object instanceof THREE.Geometry && tQuery.Geometry){
		return new tQuery.Geometry(object);
	}else if( object instanceof THREE.Material && tQuery.Material){
		return new tQuery.Material(object);
	}else if( typeof object === "string" && tQuery.Object3D){
		return new tQuery.Object3D(object, root);
	}else{
		console.assert(false, "unsupported type")
	}
	return undefined;
};

/**
 * The version of tQuery
*/
tQuery.VERSION	= "0.0.1";

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * generic getter/setter
 * 
 * @param {Object} object the object in which store the data
 * @param {String} key the key/name of the data to get/set
 * @param {*} value the value to set (optional)
 * 
 * @returns {*} return the value stored in this object for this key
*/
tQuery.data	= function(object, key, value)
{
	// sanity check
	console.assert( object, 'invalid parameters' );
	console.assert( typeof key === 'string', 'invalid parameters');

	// init _tqData
	object['_tqData']	= object['_tqData']	|| {};
	// set the value if any
	if( value ){
		object['_tqData'][key]	= value;
	}
	// return the value
	return object['_tqData'][key];
};

/**
 * Same as jQuery.removeData()
*/
tQuery.removeData	= function(object, key)
{
	// handle the 'key as Array' case
	if( key instanceof Array ){
		key.forEach(function(key){
			tQuery.removeData(object, key);
		})
		return;
	}
	// sanity check
	console.assert( typeof key === "string");
	// do delete the key
	delete object['_tqData'][key];
	// TOTO remove object[_tqData] if empty now
}


//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * loop over a Array.
 * 
 * @param {Array} arr the array to traverse.
 * @param {Function} callback the function to notify. function(element){ }.
 * 			loop interrupted if it returns false
 * 
 * @returns {Boolean} return true if completed, false if interrupted
*/
tQuery.each	= function(arr, callback){
	for(var i = 0; i < arr.length; i++){
		var keepLooping	= callback(arr[i])
		if( keepLooping === false )	return false;
	}
	return true;
};

/**
 * Make a child Class inherit from the parent class.
 *
 * @param {Object} childClass the child class which gonna inherit
 * @param {Object} parentClass the class which gonna be inherited
*/
tQuery.inherit	= function(childClass, parentClass){
	// trick to avoid calling parentClass constructor
	var tempFn		= function() {};
	tempFn.prototype	= parentClass.prototype;
	childClass.prototype	= new tempFn();

	childClass.parent	= parentClass.prototype;
	childClass.prototype.constructor= childClass;	
};

/**
 * extend function. mainly aimed at handling default values - jme: im not sure at all it is the proper one.
 * http://jsapi.info/_/extend
 * similar to jquery one but much smaller
*/
tQuery.extend = function(obj, base){
	var result	= {};
	base && Object.keys(base).forEach(function(key){
		result[key]	= base[key];
	})
	obj && Object.keys(obj).forEach(function(key){
		result[key]	= obj[key];
	})
	return result;
};

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Make an object pluginable
 * 
 * @param {Object} object the object on which you mixin function
 * @param {Object} dest the object in which to register the plugin
*/
tQuery.pluginsOn	= function(object, dest){
	dest	= dest	|| object.prototype || object;
	object.register	= function(name, funct) {
		if( dest[name] ){
			throw new Error('Conflict! Already method called: ' + name);
		}
		dest[name]	= funct;
	};
	object.unregister	= function(name){
		if( dest.hasOwnProperty(name) === false ){
			throw new Error('Plugin not found: ' + name);
		}
		delete dest[name];
	};
	object.registered	= function(name){
		return dest.hasOwnProperty(name) === true;
	}
};

tQuery.pluginsInstanceOn= function(klass){ return tQuery.pluginsOn(klass);		};
tQuery.pluginsStaticOn	= function(klass){ return tQuery.pluginsOn(klass. klass);	};


// make it pluginable
tQuery.pluginsOn(tQuery, tQuery);

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

tQuery.mixinAttributes	= function(dstObject, properties){
	dstObject.prototype.attr	= function(name, value){
		// handle parameters
		if( name instanceof Object && value === undefined ){
			Object.keys(name).forEach(function(key){
				this.attr(key, name[key]);
			}.bind(this));
		}else if( typeof(name) === 'string' ){
			console.assert( Object.keys(properties).indexOf(name) !== -1, 'invalid property name:'+name);
		}else	console.assert(false, 'invalid parameter');

		// handle setter
		if( value !== undefined ){
			var convertFn	= properties[name];
			value		= convertFn(value);
			this.each(function(element){
				element[name]	= value;
			})
			return this;			
		}
		// handle getter
		if( this.length === 0 )	return undefined
		var element	= this.get(0);
		return element[name];
	};

	// add shortcuts
	Object.keys(properties).forEach(function(name){
		dstObject.prototype[name]	= function(value){
			return this.attr(name, value);
		};
	}.bind(this));
};/**
 * implementation of the tQuery.Node
 *
 * @class base class for tQuery objects
 *
 * @param {Object} object an instance or an array of instance
*/
tQuery.Node	= function(object)
{
	// handle parameters
	if( object instanceof Array )	this._lists	= object;
	else if( !object )		this._lists	= [];
	else				this._lists	= [object];
	this.length	= this._lists.length;
};

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieve the elements matched by the tQuery object
 * 
 * @param {Function} callback the function to notify. function(element){ }.
 * 			loop interrupted if it returns false
 * 
 * @returns {Boolean} return true if completed, false if interrupted
*/
tQuery.Node.prototype.get	= function(idx)
{
	if( idx === undefined )	return this._lists;
	// sanity check - it MUST be defined
	console.assert(this._lists[idx], "element not defined");
	return this._lists[idx];
};

/**
 * loop over element
 * 
 * @param {Function} callback the function to notify. function(element){ }.
 * 			loop interrupted if it returns false
 * 
 * @returns {Boolean} return true if completed, false if interrupted
*/
tQuery.Node.prototype.each	= function(callback)
{
	return tQuery.each(this._lists, callback)
};

/**
 * getter/setter of the back pointer
 *
 * @param {Object} back the value to return when .back() is called. optional
*/
tQuery.Node.prototype.back	= function(value)
{
	if( value  === undefined )	return this._back;
	this._back	= value;
	return this;
};

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * same as .data() in jquery
*/
tQuery.Node.prototype.data	= function(key, value)
{
	// handle the setter case
	if( value ){
		this.each(function(element){
			tQuery.data(element, key, value);
		});
		return this;	// for chained API
	}
	// return the value of the first element
	if( this.length > 0 )	return tQuery.data(this.get(0), key)
	// return undegined if the list is empty
	console.assert(this.length === 0);
	return undefined
}


/**
 * same as .data() in jquery
*/
tQuery.Node.prototype.removeData	= function(key)
{
	this.each(function(element){
		tQuery.removeData(element, key);
	});
	return this;	// for chained API
}/**
 * Handle object3D
 *
 * @class include THREE.Object3D
 *
 * @param {} object
 * @param {THREE.Object3D} rootnode
 * @returns {tQuery.*} the tQuery object created
*/
tQuery.Object3D	= function(object, root)
{
	// handle the case of selector
	if( typeof object === "string" ){
		object	= tQuery.Object3D._select(object, root);
	}

	// call parent ctor
	tQuery.Object3D.parent.constructor.call(this, object)

	// sanity check - all items MUST be THREE.Object3D
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.Object3D); });
};

/**
 * inherit from tQuery.Node
*/
tQuery.inherit(tQuery.Object3D, tQuery.Node);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.Object3D);

//////////////////////////////////////////////////////////////////////////////////
//		geometry and material						//
//////////////////////////////////////////////////////////////////////////////////

/**
 * get geometry.
 *
 * TODO this should be move in tQuery.Mesh
 * 
 * @returns {tQuery.Geometry} return the geometries from the tQuery.Object3D
*/
tQuery.Object3D.prototype.geometry	= function(value){
	var geometries	= [];
	this.each(function(object3d){
		geometries.push(object3d.geometry)
	});
	return new tQuery.Geometry(geometries).back(this);
};

/**
 * get material.
 * 
 * TODO this should be move in tQuery.Mesh
 * 
 * @returns {tQuery.Material} return the materials from the tQuery.Object3D
*/
tQuery.Object3D.prototype.material	= function(){
	var materials	= [];
	this.each(function(object3d){
		materials.push(object3d.material)
	});
	return new tQuery.Material(materials);
};

//////////////////////////////////////////////////////////////////////////////////
//			addTo/removeFrom tQuery.World/tQuery.Object3d		//
//////////////////////////////////////////////////////////////////////////////////

/**
 * add all matched elements to a world
 * 
 * @param {tQuery.World or tQuery.Object3D} target object to which add it
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.addTo	= function(target)
{
	console.assert( target instanceof tQuery.World || target instanceof tQuery.Object3D )
	this.each(function(object3d){
		target.add(object3d)
	}.bind(this));
	return this;
}

/**
 * remove all matched elements from a world
 * 
 * @param {tQuery.World or tQuery.Object3D} target object to which add it
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.removeFrom	= function(target)
{
	console.assert( target instanceof tQuery.World || target instanceof tQuery.Object3D )
	this.each(function(object3d){
		target.remove(object3d)
	}.bind(this));
	return this;
}

//////////////////////////////////////////////////////////////////////////////////
//			addTo/removeFrom tQuery.World/tQuery.Object3d		//
//////////////////////////////////////////////////////////////////////////////////

/**
 * add all matched elements to a world
 * 
 * @param {tQuery.Object3D} target object to which add it
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.add	= function(tqObject3d)
{
	console.assert( tqObject3d instanceof tQuery.Object3D )
	this.each(function(object1){
		tqObject3d.each(function(object2){
			object1.add(object2);
		})
	}.bind(this));
	return this;
}

/**
 * remove all matched elements from a world
 * 
 * @param {tQuery.Object3D} object3d the object to add in this object
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.remove	= function(tqObject3d)
{
	console.assert( tqObject3d instanceof tQuery.Object3D )
	this.each(function(object1){
		tqObject3d.each(function(object2){
			object1.remove(object2);
		})
	}.bind(this));
	return this;
}

//////////////////////////////////////////////////////////////////////////////////
//		Handle dom attribute						//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Getter/Setter for the id of the matched elements
*/
tQuery.Object3D.prototype.id	= function(value)
{
	// sanity check 
	console.assert(this.length <= 1, "tQuery.Object3D.id used on multi-elements" );
	if( value !== undefined ){
		if( this.length > 0 ){
			var object3d	= this.get(0);
			object3d._tqId	= value;
		}
		return this;
	}else{
		if( this.length > 0 ){
			var object3d	= this.get(0);
			return object3d._tqId;
		}
		return undefined;
	}
};

/**
 * add a class to all matched elements
 * 
 * @param {string} className the name of the class to add
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.addClass	= function(className){
	this.each(function(tObject3d){
		// init ._tqClasses if needed
		tObject3d._tqClasses	= tObject3d._tqClasses	|| '';

		if( tQuery.Object3D._hasClassOne(tObject3d, className) )	return;
		
		tObject3d._tqClasses	+= ' '+className;
	}.bind(this));
	return this;
};

/**
 * remove a class to all matched elements
 * 
 * @param {string} className the name of the class to remove
 * @returns {tQuery.Object3D} chained API
*/
tQuery.Object3D.prototype.removeClass	= function(className){
	this.each(function(tObject3d){
		tQuery.Object3D._removeClassOne(tObject3d, className);
	}.bind(this));
	return this;	// for chained api
};

/**
 * return true if any of the matched elements has this class
 *
 * @param {string} className the name of the class
 * @returns {tQuery.Object3D} true if any of the matched elements has this class, false overwise
*/
tQuery.Object3D.prototype.hasClass	= function(className){
	var completed	= this.each(function(object3d){
		// init ._tqClasses if needed
		object3d._tqClasses	= object3d._tqClasses	|| '';

		var hasClass	= tQuery.Object3D._hasClassOne(object3d, className);
		return hasClass ? false : true;
	}.bind(this));
	return completed ? false : true;
};

tQuery.Object3D._hasClassOne	= function(object3d, className){
	if( object3d._tqClasses === undefined )	return false;
	var classes	= object3d._tqClasses;
	var re		= new RegExp('(^| |\t)+('+className+')($| |\t)+');
	return classes.match(re) ? true : false;
};

tQuery.Object3D._removeClassOne	= function(object3d, className){
	if( object3d._tqClasses === undefined )	return;
	var re		= new RegExp('(^| |\t)('+className+')($| |\t)');
	object3d._tqClasses	= object3d._tqClasses.replace(re, ' ');
};

//////////////////////////////////////////////////////////////////////////////////
//			handling selection					//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Object3D._select	= function(selector, root){
	root		= root	|| tQuery.world.scene();
	var selectItems	= selector.split(' ').filter(function(v){ return v.length > 0;})

	var lists	= [];	
	root.children.forEach(function(child){
		var nodes	= this._crawls(child, selectItems);
		// FIXME reallocate the array without need
		lists		= lists.concat(nodes);
	}.bind(this));	
	return lists;
}

tQuery.Object3D._crawls	= function(root, selectItems)
{
	var result	= [];
//console.log("crawl", root, selectItems)
	console.assert( selectItems.length >= 1 );
	var match	= this._selectItemMatch(root, selectItems[0]);
//console.log("  match", match)
	var nextSelect	= match ? selectItems.slice(1) : selectItems;
//console.log("  nextSelect", nextSelect)

	if( nextSelect.length === 0 )	return [root];

	root.children.forEach(function(child){
		var nodes	= this._crawls(child, nextSelect);
		// FIXME reallocate the array without need
		result		= result.concat(nodes);
	}.bind(this));

	return result;
}

// all the geometries keywords
tQuery.Object3D._selectableGeometries	= Object.keys(THREE).filter(function(value){
	return value.match(/.+Geometry$/);}).map(function(value){ return value.replace(/Geometry$/,'').toLowerCase();
});

// all the light keywords
tQuery.Object3D._selectableLights	= Object.keys(THREE).filter(function(value){
	return value.match(/.+Light$/);}).map(function(value){ return value.replace(/Light$/,'').toLowerCase();
});

tQuery.Object3D._selectableClasses	= ['mesh', 'light'];

tQuery.Object3D._selectItemMatch	= function(object3d, selectItem)
{
	// sanity check
	console.assert( object3d instanceof THREE.Object3D );
	console.assert( typeof selectItem === 'string' );

	// parse selectItem into subItems
	var subItems	= selectItem.match(new RegExp("([^.#]+|\.[^.#]+|\#[^.#]+)", "g"));;

	// go thru each subItem
	var completed	= tQuery.each(subItems, function(subItem){
		var meta	= subItem.charAt(0);
		var suffix	= subItem.slice(1);
		//console.log("meta", meta, subItem, suffix, object3d)
		if( meta === "." ){
			var hasClass	= tQuery.Object3D._hasClassOne(object3d, suffix);
			return hasClass ? true : false;
		}else if( meta === "#" ){
			return object3d._tqId === suffix ? true : false;
		}else if( subItem === "*" ){
			return true;
		}else if( this._selectableGeometries.indexOf(subItem) !== -1 ){	// Handle geometries
			var geometry	= object3d.geometry;
			var className	= subItem.charAt(0).toUpperCase() + subItem.slice(1) + "Geometry";
			return geometry instanceof THREE[className];
		}else if( this._selectableLights.indexOf(subItem) !== -1 ){	// Handle light
			var className	= subItem.charAt(0).toUpperCase() + subItem.slice(1) + "Light";
			return object3d instanceof THREE[className];
		}else if( this._selectableClasses.indexOf(subItem) !== -1 ){	// Handle light
			var className	= subItem.charAt(0).toUpperCase() + subItem.slice(1);
			return object3d instanceof THREE[className];
		}
		// this point should never be reached
		console.assert(false, "invalid selector: "+subItem);
		return true;
	}.bind(this));

	return completed ? true : false;
}
/**
 * Handle geometry. It inherit from tQuery.Node
 *
 * @class handle THREE.Geometry. It inherit from {@link tQuery.Node}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.Geometry} object an instance or an array of instance
*/
tQuery.Geometry	= function(object)
{
	// call parent
	tQuery.Geometry.parent.constructor.call(this, object)

	// sanity check - all items MUST be THREE.Geometry
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.Geometry); });
};

/**
 * inherit from tQuery.Node
*/
tQuery.inherit(tQuery.Geometry, tQuery.Node);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.Geometry);/**
 * Handle material
 *
 * @class include THREE.Material. It inherit from {@link tQuery.Node}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.Material} object an instance or array of instance
*/
tQuery.Material	= function(object)
{
	// call parent
	tQuery.Material.parent.constructor.call(this, object)

	// sanity check - all items MUST be THREE.Material
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.Material); });
};

/**
 * inherit from tQuery.Node
*/
tQuery.inherit(tQuery.Material, tQuery.Node);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.Material);tQuery.convert	= {};

/**
 * Convert the value into a THREE.Color object
 * 
 * @return {THREE.Color} the resulting color
*/
tQuery.convert.toThreeColor	= function(value){
	if( arguments.length === 1 && typeof(value) === 'number'){
		return new THREE.Color(value);
	}else if( arguments.length === 1 && value instanceof THREE.Color ){
		return value;
	}else{
		console.assert(false, "invalid parameter");
	}
	return undefined;	// never reached - just to workaround linter complaint
};

tQuery.convert.toNumber	= function(value){
	if( arguments.length === 1 && typeof(value) === 'number'){
		return value;
	}else{
		console.assert(false, "invalid parameter");
	}
	return undefined;	// never reached - just to workaround linter complaint
};

tQuery.convert.identity	= function(value){
	return value;
};

/**
 * Handle light
 *
 * @class include THREE.Light. It inherit from {@link tQuery.Node}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.Light} object an instance or array of instance
*/
tQuery.Light	= function(elements)
{
	// call parent ctor
	tQuery.Light.parent.constructor.call(this, elements)

	// sanity check - all items MUST be THREE.Light
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.Light); });
};

/**
 * inherit from tQuery.Node
 * - TODO this should inherit from tQuery.Object3D but but in inheritance
*/
tQuery.inherit(tQuery.Light, tQuery.Object3D);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.Light);

/**
 * define all acceptable attributes for this class
*/
tQuery.mixinAttributes(tQuery.Light, {
	color	: tQuery.convert.toThreeColor
});


/**
 * Handle mesh
 *
 * @class include THREE.Mesh. It inherit from {@link tQuery.Node}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.Mesh} object an instance or array of instance
*/
tQuery.Mesh	= function(elements)
{
	// call parent ctor
	var parent	= tQuery.Mesh.parent;
	parent.constructor.call(this, elements)

	// sanity check - all items MUST be THREE.Mesh
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.Mesh); });
};

/**
 * inherit from tQuery.Node
 * - TODO this should inherit from tQuery.Object3D but but in inheritance
*/
tQuery.inherit(tQuery.Mesh, tQuery.Object3D);


/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.Mesh);


tQuery.Mesh.prototype.material	= function(value){
	var parent	= tQuery.Mesh.parent;
	// handle the getter case
	if( value == undefined )	return parent.material.call(this);
	// handle the setter case
	this.each(function(tMesh){
		tMesh.material	= value;
	});
	return this;	// for the chained API
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Handle world (aka scene+camera+renderer)
 *
 * @class youpla
 * 
 * @param {THREE.Material} object an instance or an array of instance
*/
tQuery.World	= function()
{
	// update default world.
	// - TODO no sanity check ?
	tQuery.world	= this;
	
	// create a scene
	this._scene	= new THREE.Scene();

	// create a renderer
	if( this._hasWebGL ){
		this._renderer = new THREE.WebGLRenderer({
			antialias		: true,	// to get smoother output
			preserveDrawingBuffer	: true	// to allow screenshot
		});
		this._renderer.setClearColorHex( 0xBBBBBB, 1 );
	}else{
		this._addGetWebGLMessage();
		throw new Error("WebGL required and not available")
	}
	// FIXME this window dimension is crap
	this._renderer.setSize( window.innerWidth, window.innerHeight );

	// create a camera in the scene
	// FIXME this window dimension is crap
	this._camera	= new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 10000 );
	this._camera.position.set(0, 0, 3);
	this._scene.add(this._camera);
	
	// create the loop
	this._loop	= new tQuery.Loop(this)
};

// make it pluginable
tQuery.pluginsInstanceOn(tQuery.World);


tQuery.World.prototype.destroy	= function()
{
	this._loop.destroy();
	// remove renderer element
	var parent	= this._renderer.domElement.parentElement;
	parent	&& parent.removeChild(this._renderer.domElement);
	
	if( tQuery.world === this )	tQuery.world = null;

}

//////////////////////////////////////////////////////////////////////////////////
//		WebGL Support							//
//////////////////////////////////////////////////////////////////////////////////

/**
 * true if webgl is available, false otherwise
*/
tQuery.World.prototype._hasWebGL	= (function(){
	// test from Detector.js
	try{
		return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
	} catch( e ){
		return false;
	}
})();

/**
*/
tQuery.World.prototype._addGetWebGLMessage	= function(parent)
{
	parent	= parent || document.body;
	
	// message directly taken from Detector.js
	var domElement = document.createElement( 'div' );
	domElement.style.fontFamily = 'monospace';
	domElement.style.fontSize = '13px';
	domElement.style.textAlign = 'center';
	domElement.style.background = '#eee';
	domElement.style.color = '#000';
	domElement.style.padding = '1em';
	domElement.style.width = '475px';
	domElement.style.margin = '5em auto 0';
	domElement.innerHTML = window.WebGLRenderingContext ? [
		'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</a>.<br />',
		'Find out how to get it <a href="http://get.webgl.org/">here</a>.'
	].join( '\n' ) : [
		'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</a>.<br/>',
		'Find out how to get it <a href="http://get.webgl.org/">here</a>.'
	].join( '\n' );

	parent.appendChild(domElement);
}

//////////////////////////////////////////////////////////////////////////////////
//		add/remove object3D						//
//////////////////////////////////////////////////////////////////////////////////

/**
 * add an object to the scene
 * 
 * @param {tQuery.Object3D} object3D to add to the scene (THREE.Object3D is accepted)
*/
tQuery.World.prototype.add	= function(object3d)
{
	if( object3d instanceof tQuery.Object3D ){
		object3d.each(function(object3d){
			this._scene.add(object3d)			
		}.bind(this));
	}else if( object3d instanceof THREE.Object3D ){
		this._scene.add(object3d)		
	}else	console.assert(false, "invalid type");
	// for chained API
	return this;
}

/**
 * remove an object to the scene
 * 
 * @param {tQuery.Object3D} object3D to add to the scene (THREE.Object3D is accepted)
*/
tQuery.World.prototype.remove	= function(object3d)
{
	if( object3d instanceof tQuery.Object3D ){
		object3d.each(function(object3d){
			this._scene.remove(object3d)
		}.bind(this));
	}else if( object3d instanceof THREE.Object3D ){
		this._scene.remove(object3d)
	}else	console.assert(false, "invalid type");
	// for chained API
	return this;
}

tQuery.World.prototype.appendTo	= function(domElement)
{
	domElement.appendChild(this._renderer.domElement)
	this._renderer.setSize( domElement.offsetWidth, domElement.offsetHeight );
	// for chained API
	return this;
}

/**
 * Start the loop
*/
tQuery.World.prototype.start	= function(){
	this._loop.start();
	return this;	// for chained API
}
/**
 * Stop the loop
*/
tQuery.World.prototype.stop	= function(){
	this._loop.stop();
	return this;	// for chained API
}

tQuery.World.prototype.fullpage	= function()
{
	// FIXME i dont like this function. way too cooked for tquery core stuff
	// put it elsewhere ? in a plugin ?
	
	// Should that be in pluging
	var domElement	= document.body;
	domElement.style.margin		= "0";
	domElement.style.padding	= "0";
	domElement.style.overflow	= 'hidden';
	return this.appendTo(domElement);
}

tQuery.World.prototype.loop	= function(){ return this._loop;	}
tQuery.World.prototype.renderer	= function(){ return this._renderer;	}
tQuery.World.prototype.camera	= function(){ return this._camera;	}
tQuery.World.prototype.scene	= function(){ return this._scene;	}
tQuery.World.prototype.get	= function(){ return this._scene;	}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

tQuery.World.prototype.render	= function()
{
	// actually render the scene
	this._renderer.render( this._scene, this._camera );
}
//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Handle the rendering loop
 *
 * @class This class handle the rendering loop
 *
 * @param {THREE.World} world the world to display (optional)
*/
tQuery.Loop	= function(world)
{	
	// internally if world present do that
	this._world	= world;
	this._hooks	= [];
	this._lastTime	= null;

	// if world is available, hook it ON_RENDER
	this._world && this.hookOnRender(function(){
		this._world.render();
	}.bind(this));
};

// make it pluginable
tQuery.pluginsInstanceOn(tQuery.Loop);

/**
 * destructor
*/
tQuery.Loop.prototype.destroy	= function()
{
	this.stop();
	if( tQuery.loop === this )	tQuery.loop = null;
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * start looping
 * 
 * @returns {tQuery.Loop} chained API
*/
tQuery.Loop.prototype.start	= function()
{
	if( this._timerId )	this.stop();
	this._timerId	= requestAnimationFrame( this._onAnimationFrame.bind(this) );
	// for chained API
	return this;
}

/**
 * stop looping
 * 
 * @returns {tQuery.Loop} chained API
*/
tQuery.Loop.prototype.stop	= function()
{
	cancelAnimationFrame(this._timerId);
	this._timerId	= null;
	// for chained API
	return this;
}

tQuery.Loop.prototype._onAnimationFrame	= function(time)
{
	// loop on request animation loop
	// - it has to be at the begining of the function
	// - see details at http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	this._timerId	= requestAnimationFrame( this._onAnimationFrame.bind(this) );

	// update time values
	var currentTime	= time/1000;
	if( !this._lastTime )	this._lastTime = currentTime - 1/60;
	var deltaTime	= currentTime - this._lastTime;
	this._lastTime	= currentTime;

	// run all the hooks - from lower priority to higher - in order of registration
	for(var priority = 0; priority <= this._hooks.length; priority++){
		if( this._hooks[priority] === undefined )	continue;
		var callbacks	= this._hooks[priority].slice(0)
		for(var i = 0; i < callbacks.length; i++){
			// TODO ? change that to {delta, current} ?
			// thus function(time){ time.current }
			callbacks[i](deltaTime, currentTime);
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////
//		Handle the hooks						//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Loop.prototype.PRE_RENDER		= 20;
tQuery.Loop.prototype.ON_RENDER		= 50;
tQuery.Loop.prototype.POST_RENDER	= 80;

/**
 * hook a callback at a given priority
 *
 * @param {Number} priority for this callback
 * @param {Function} callback the function which will be called function(time){}
 * @returns {tQuery.Loop} chained API
*/
tQuery.Loop.prototype.hook	= function(priority, callback)
{
	// handle parameters
	if( typeof priority === 'function' ){
		callback	= priority;
		priority	= this.PRE_RENDER;
	}

	this._hooks[priority]	= this._hooks[priority] || [];
	console.assert(this._hooks[priority].indexOf(callback) === -1)
	this._hooks[priority].push(callback);
	// for chained API
	return this;
}

/**
 * unhook a callback at a given priority
 *
 * @param {Number} priority for this callback
 * @param {Function} callback the function which will be called function(time){}
 * @returns {tQuery.Loop} chained API
*/
tQuery.Loop.prototype.unhook	= function(priority, callback)
{
	// handle parameters
	if( typeof priority === 'function' ){
		callback	= priority;
		priority	= this.PRE_RENDER;
	}

	var index	= this._hooks[priority].indexOf(callback);
	console.assert(index !== -1);
	this._hooks[priority].splice(index, 1);
	this._hooks[priority].length === 0 && delete this._hooks[priority]
	// for chained API
	return this;
}


// bunch of shortcut
// - TODO should it be in a plugin ?

tQuery.Loop.prototype.hookPreRender	= function(callback){ return this.hook(this.PRE_RENDER, callback);	};
tQuery.Loop.prototype.hookOnRender	= function(callback){ return this.hook(this.ON_RENDER, callback);	};
tQuery.Loop.prototype.hookPostRender	= function(callback){ return this.hook(this.POST_RENDER, callback);	};
tQuery.Loop.prototype.unhookPreRender	= function(callback){ return this.unhook(this.PRE_RENDER, callback);	};
tQuery.Loop.prototype.unhookOnRender	= function(callback){ return this.unhook(this.ON_RENDER, callback);	};
tQuery.Loop.prototype.unhookPostRender	= function(callback){ return this.unhook(this.POST_RENDER, callback);	};
/**
 * @fileOverview plugins for tQuery.core to help creation of object
*/


//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Create tQuery.World
*/
tQuery.register('createWorld', function(){
	return new tQuery.World();
});

/**
 * Create tQuery.loop
 * 
 * @param {tQuery.World} world the world to display (optional)
 * @function
*/
tQuery.register('createLoop', function(world){
	return new tQuery.Loop(world);
});


tQuery.register('createDirectionalLight', function(){
	var tLight	= new THREE.DirectionalLight(0xFFFFFF * Math.random());
	tLight.position.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
	return tQuery(tLight);
});

tQuery.register('createAmbientLight', function(){
	var tLight	= new THREE.AmbientLight(0xFFFFFF);
	return tQuery(tLight);
});


//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * contains the default material to use when create tQuery.Object3D
 * 
 * @fieldOf tQuery
 * @name defaultObject3DMaterial
*/
tQuery.register('defaultObject3DMaterial', new THREE.MeshNormalMaterial());

tQuery.Geometry.prototype.toMesh	= function(material){
	var meshes	= [];
	this.each(function(tGeometry){
		// handle paramters
		material	= material || tQuery.defaultObject3DMaterial;
		// create the THREE.Mesh
		var mesh	= new THREE.Mesh(tGeometry, material)
		// return it
		meshes.push(mesh);
	});
	return new tQuery.Mesh(meshes);
};


/**
 * Create a cube
 * 
 * @returns {tQuery.Object3D} a tQuery.Object3D containing it
*/
tQuery.register('createCube', function(){
	var ctor	= THREE.CubeGeometry;
	var dflGeometry	= [1, 1, 1];
	return this._createMesh(ctor, dflGeometry, arguments)
});

tQuery.register('createTorus', function(){
	var ctor	= THREE.TorusGeometry;
	var dflGeometry	= [0.5-0.15, 0.15];
	return this._createMesh(ctor, dflGeometry, arguments)
});

tQuery.register('createSphere', function(){
	var ctor	= THREE.SphereGeometry;
	var dflGeometry	= [0.5, 32, 16];
	return this._createMesh(ctor, dflGeometry, arguments)
});

tQuery.register('createPlane', function(){
	var ctor	= THREE.PlaneGeometry;
	var dflGeometry	= [1, 1, 16, 16];
	return this._createMesh(ctor, dflGeometry, arguments)
});

tQuery.register('createCylinder', function(){
	var ctor	= THREE.CylinderGeometry;
	var dflGeometry	= [0.5, 0.5, 1, 16, 4];
	return this._createMesh(ctor, dflGeometry, arguments)
});

tQuery.register('_createMesh', function(ctor, dflGeometry, args)
{
	// convert args to array if it is instanceof Arguments
	// FIXME if( args instanceof Arguments )
	args	= Array.prototype.slice.call( args );
	
	// init the material
	var material	= tQuery.defaultObject3DMaterial;
	// if the last arguments is a material, use it
	if( args.length && args[args.length-1] instanceof THREE.Material ){
		material	= args.pop();
	}
	
	// ugly trick to get .apply() to work 
	var createFn	= function(ctor, a0, a1, a2, a3, a4, a5, a6, a7){
		console.assert(arguments.length <= 9);
		//console.log("createFn", arguments)
		return new ctor(a0,a1,a2,a3,a4,a5,a6,a7);
	}
	if( args.length === 0 )	args	= dflGeometry.slice();
	args.unshift(ctor);
	var geometry	= createFn.apply(this, args);

	// set the geometry.dynamic by default
	geometry.dynamic= true;
	// create the THREE.Mesh
	var mesh	= new THREE.Mesh(geometry, material)
	// return it
	return tQuery(mesh);
});

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

tQuery.register('createAxis', function(){
	var axis	= new THREE.AxisHelper();
	axis.scale.multiplyScalar(1/40);
	return tQuery(axis);
});
/**
 * Handle ambient light
 *
 * @class include THREE.AmbientLight. It inherit from {@link tQuery.Light}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.AmbientLight} element an instance or array of instance
*/
tQuery.AmbientLight	= function(elements)
{
	// call parent ctor
	tQuery.AmbientLight.parent.constructor.call(this, elements)

	// sanity check - all items MUST be THREE.Light
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.AmbientLight); });
};

/**
 * inherit from tQuery.Node
*/
tQuery.inherit(tQuery.AmbientLight, tQuery.Light);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.AmbientLight);
/**
 * Handle directional light
 *
 * @class include THREE.DirectionalLight. It inherit from {@link tQuery.Light}
 * 
 * @borrows tQuery.Node#get as this.get
 * @borrows tQuery.Node#each as this.each
 * @borrows tQuery.Node#back as this.back
 *
 * @param {THREE.DirectionalLight} element an instance or array of instance
*/
tQuery.DirectionalLight	= function(elements)
{
	// call parent ctor
	tQuery.DirectionalLight.parent.constructor.call(this, elements)

	// sanity check - all items MUST be THREE.Light
	this._lists.forEach(function(item){ console.assert(item instanceof THREE.DirectionalLight); });
};

/**
 * inherit from tQuery.Light
*/
tQuery.inherit(tQuery.DirectionalLight, tQuery.Light);

/**
 * Make it pluginable
*/
tQuery.pluginsInstanceOn(tQuery.DirectionalLight);

/**
 * define all acceptable attributes for this class
*/
tQuery.mixinAttributes(tQuery.DirectionalLight, {
	intensity	: tQuery.convert.toNumber,
	distance	: tQuery.convert.toNumber
});


/**
 * @fileOverview Plugins for tQuery and Stats.js
*/

(function(){	// closure function

/**
 * 
*/
var DragPanControls	= function(loop)
{
	this._loop	= loop	|| tQuery.loop;

	this._controls	= new THREEx.DragPanControls(tQuery.world.camera());
	this._$onRender	= this._onRender.bind(this);
	this._loop.hookPreRender(this._$onRender);
};

DragPanControls.prototype.destroy	= function(){
	this._loop.unhookPreRender(this._$onRender);	
};

DragPanControls.prototype._onRender	= function(){
	this._controls.update();
};


// register the plugins
tQuery.register('DragPanControls', DragPanControls);
tQuery.register('createDragPanControls', function(loop){ return new tQuery.DragPanControls(loop); });

})();	// closure function end
/**
 * @fileOverview Plugins for tQuery.Geometry: tool box to play with geometry
*/

(function(){

//////////////////////////////////////////////////////////////////////////////////
//		Size functions							//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Geometry.register('computeAll', function(){
	this.each(function(tGeometry){
		tGeometry.computeBoundingBox();
		tGeometry.computeCentroids();
		tGeometry.computeFaceNormals();
		tGeometry.computeVertexNormals();
		//tGeometry.computeTangents();
	});

	// return this, to get chained API	
	return this;
});

/**
 * zoom a geometry
 *
 * @name zoom
 * @methodOf tQuery.Geometry
*/
tQuery.Geometry.register('scaleBy', function(vector3){
	// handle parameters
	if( typeof vector3 === "number" && arguments.length === 1 ){
		vector3	= new THREE.Vector3(vector3, vector3, vector3);
	}else if( typeof vector3 === "number" && arguments.length === 3 ){
		vector3	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(vector3 instanceof THREE.Vector3, "Geometry.vector3 parameter error");

	// change all geometry.vertices
	this.each(function(geometry){
		for(var i = 0; i < geometry.vertices.length; i++) {
			var vertex	= geometry.vertices[i];
			vertex.position.multiplySelf(vector3); 
		}
		// mark the vertices as dirty
		geometry.__dirtyVertices = true;
		geometry.computeBoundingBox();
	})

	// return this, to get chained API	
	return this;
});

tQuery.Geometry.register('size', function(){
	// only on zero-or-one element
	console.assert(this.length <= 1)
	// if no element, return undefined
	if( this.length === 0 )	return undefined

	// else measure the size of the element
	var geometry	= this.get(0);
	// compute middle
	var size= new THREE.Vector3()
	size.x	= geometry.boundingBox.max.x - geometry.boundingBox.min.x;
	size.y	= geometry.boundingBox.max.y - geometry.boundingBox.min.y;
	size.z	= geometry.boundingBox.max.z - geometry.boundingBox.min.z;

	// return the just computed middle
	return size;	
});

/**
*/
tQuery.Geometry.register('normalize', function(){
	// change all geometry.vertices
	this.each(function(geometry){
		var node	= tQuery(geometry);
		var size	= node.size();
		if( size.x >= size.y && size.x >= size.z ){
			node.zoom(1/size.x);
		}else if( size.y >= size.x && size.y >= size.z ){
			node.zoom(1/size.y);
		}else{
			node.zoom(1/size.z);
		}
	});
	// return this, to get chained API	
	return this;
});


//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////


tQuery.Geometry.register('middlePoint', function(){
	// only on zero-or-one element
	console.assert(this.length <= 1)
	// if no element, return undegined
	if( this.length === 0 )	return undefined
	// else measure the size of the element
	var geometry	= this.get(0);
	// compute middle
	var middle	= new THREE.Vector3()
	middle.x	= ( geometry.boundingBox.max.x + geometry.boundingBox.min.x ) / 2;
	middle.y	= ( geometry.boundingBox.max.y + geometry.boundingBox.min.y ) / 2;
	middle.z	= ( geometry.boundingBox.max.z + geometry.boundingBox.min.z ) / 2;

	// return the just computed middle
	return middle;
});

//////////////////////////////////////////////////////////////////////////////////
//		move functions							//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Geometry.register('translate', function(delta){
	// handle parameters
	if( typeof delta === "number" && arguments.length === 3 ){
		delta	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(delta instanceof THREE.Vector3, "Geometry.translate parameter error");

	// change all geometry.vertices
	this.each(function(geometry){
		// change all geometry.vertices
		for(var i = 0; i < geometry.vertices.length; i++) {
			var vertex	= geometry.vertices[i];
			vertex.position.addSelf(delta); 
		}
		// mark the vertices as dirty
		geometry.__dirtyVertices = true;
		geometry.computeBoundingBox();
	})

	// return this, to get chained API	
	return this;
});

tQuery.Geometry.register('rotate', function(angles, order){
	// handle parameters
	if( typeof angles === "number" && arguments.length === 3 ){
		angles	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(angles instanceof THREE.Vector3, "Geometry.rotate parameter error");

	// set default rotation order if needed
	order	= order	|| 'XYZ';
	// compute transformation matrix
	var matrix	= new THREE.Matrix4();
	matrix.setRotationFromEuler(angles, order);

	// change all geometry.vertices
	this.each(function(geometry){
		// apply the matrix
		geometry.applyMatrix( matrix );
	
		// mark the vertices as dirty
		geometry.__dirtyVertices = true;
		geometry.computeBoundingBox();
	});

	// return this, to get chained API	
	return this;
});

/**
*/
tQuery.Geometry.register('center', function(noX, noY, noZ){
	// change all geometry.vertices
	this.each(function(tGeometry){
		var geometry	= tQuery(tGeometry);
		// compute delta
		var delta 	= geometry.middlePoint().negate();
		if( noX )	delta.x	= 0;
		if( noY )	delta.y	= 0;
		if( noZ )	delta.z	= 0;

		return geometry.translate(delta)
	});
	// return this, to get chained API	
	return this;
});

// some shortcuts
tQuery.Geometry.register('translateX'	, function(delta){ return this.translate(delta, 0, 0);	});
tQuery.Geometry.register('translateY'	, function(delta){ return this.translate(0, delta, 0);	});
tQuery.Geometry.register('translateZ'	, function(delta){ return this.translate(0, 0, delta);	});
tQuery.Geometry.register('rotateX'	, function(angle){ return this.rotate(angle, 0, 0);	});
tQuery.Geometry.register('rotateY'	, function(angle){ return this.rotate(0, angle, 0);	});
tQuery.Geometry.register('rotateZ'	, function(angle){ return this.rotate(0, 0, angle);	});
tQuery.Geometry.register('scaleXBy'	, function(ratio){ return this.scaleBy(ratio, 1, 1);	});
tQuery.Geometry.register('scaleYBy'	, function(ratio){ return this.scaleBy(1, ratio, 1);	});
tQuery.Geometry.register('scaleZBy'	, function(ratio){ return this.scaleBy(1, 1, ratio);	});

// backward compatibility
tQuery.Geometry.register('zoom'		, function(value){return this.scaleBy(value);		});
tQuery.Geometry.register('zoomX'	, function(ratio){ return this.zoom(ratio, 1, 1);	});
tQuery.Geometry.register('zoomY'	, function(ratio){ return this.zoom(1, ratio, 1);	});
tQuery.Geometry.register('zoomZ'	, function(ratio){ return this.zoom(1, 1, ratio);	});


})();	// closure function end
/**
 * @fileOverview Plugins for tQuery.Object3D to play with .position/.rotation/.scale
*/

(function(){

//////////////////////////////////////////////////////////////////////////////////
//		set function							//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Object3D.register('scale', function(scale){
	// handle parameters
	if( typeof scale === "number" && arguments.length === 1 ){
		scale	= new THREE.Vector3(scale, scale, scale);
	}else if( typeof scale === "number" && arguments.length === 3 ){
		scale	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(scale instanceof THREE.Vector3, "Geometry.scale parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.scale.copy(scale);
	});

	// return this, to get chained API	
	return this;
});

tQuery.Object3D.register('position', function(vector3){
	// handle parameters
	if( typeof vector3 === "number" && arguments.length === 3 ){
		vector3	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(vector3 instanceof THREE.Vector3, "Object3D.position parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.position.copy(vector3);
	})

	// return this, to get chained API	
	return this;
});

tQuery.Object3D.register('rotation', function(vector3){
	// handle parameters
	if( typeof vector3 === "number" && arguments.length === 3 ){
		vector3	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(vector3 instanceof THREE.Vector3, "Object3D.rotation parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.rotation.copy(vector3);
	})

	// return this, to get chained API	
	return this;
});

//////////////////////////////////////////////////////////////////////////////////
//		add function							//
//////////////////////////////////////////////////////////////////////////////////

tQuery.Object3D.register('translate', function(delta){
	// handle parameters
	if( typeof delta === "number" && arguments.length === 3 ){
		delta	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(delta instanceof THREE.Vector3, "Object3D.translate parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.position.addSelf(delta);
	})

	// return this, to get chained API	
	return this;
});


tQuery.Object3D.register('rotate', function(angles){
	// handle parameters
	if( typeof angles === "number" && arguments.length === 3 ){
		angles	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(angles instanceof THREE.Vector3, "Object3D.rotate parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.rotation.addSelf(angles);
	})

	// return this, to get chained API	
	return this;
});

tQuery.Object3D.register('scaleBy', function(ratio){
	// handle parameters
	if( typeof ratio === "number" && arguments.length === 1 ){
		ratio	= new THREE.Vector3(ratio, ratio, ratio);
	}else if( typeof ratio === "number" && arguments.length === 3 ){
		ratio	= new THREE.Vector3(arguments[0], arguments[1], arguments[2]);
	}
	console.assert(ratio instanceof THREE.Vector3, "Object3D.rotate parameter error");

	// do the operation on each node
	this.each(function(object3d){
		object3d.scale.multiplySelf(ratio);
	})

	// return this, to get chained API	
	return this;
});

// some shortcuts
tQuery.Object3D.register('translateX'	, function(delta){ return this.translate(delta, 0, 0);	});
tQuery.Object3D.register('translateY'	, function(delta){ return this.translate(0, delta, 0);	});
tQuery.Object3D.register('translateZ'	, function(delta){ return this.translate(0, 0, delta);	});
tQuery.Object3D.register('rotateX'	, function(angle){ return this.rotate(angle, 0, 0);	});
tQuery.Object3D.register('rotateY'	, function(angle){ return this.rotate(0, angle, 0);	});
tQuery.Object3D.register('rotateZ'	, function(angle){ return this.rotate(0, 0, angle);	});
tQuery.Object3D.register('scaleXBy'	, function(ratio){ return this.scaleBy(ratio, 1, 1);	});
tQuery.Object3D.register('scaleYBy'	, function(ratio){ return this.scaleBy(1, ratio, 1);	});
tQuery.Object3D.register('scaleZBy'	, function(ratio){ return this.scaleBy(1, 1, ratio);	});

// backward compatibility
tQuery.Object3D.register('zoom'		, function(value){ return this.scaleBy(value);		});
tQuery.Object3D.register('zoomX'	, function(ratio){ return this.zoom(ratio, 1, 1);	});
tQuery.Object3D.register('zoomY'	, function(ratio){ return this.zoom(1, ratio, 1);	});
tQuery.Object3D.register('zoomZ'	, function(ratio){ return this.zoom(1, 1, ratio);	});

})();	// closure function end
/**
 * @fileOverview Plugins for tQuery and Stats.js
*/

(function(){

/**
 * 
*/
var myStats	= function(loop)
{
	// add Stats.js - https://github.com/mrdoob/stats.js
	this._stats	= new Stats();
	this._stats.domElement.style.position	= 'absolute';
	this._stats.domElement.style.bottom	= '0px';
	document.body.appendChild( this._stats.domElement );

	this._loop	= loop	|| tQuery.world.loop();

	this._$onRender	= this._onRender.bind(this);
	this._loop.hookPostRender(this._$onRender);
}

myStats.prototype.destroy	= function(){
	this._loop.unhookPostRender(this._$onRender);	
	document.body.removeChild(this._stats.domElement );
}

myStats.prototype._onRender	= function(){
	this._stats.update();
};

// register the plugins
tQuery.register('Stats', myStats);
tQuery.register('createStats', function(loop){ return new tQuery.Stats(loop); });

})();	// closure function end
