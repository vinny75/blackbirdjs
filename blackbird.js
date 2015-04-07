/*
	Blackbird - Open Source JavaScript Logging Utility
	Author: G Scott Olson
	Web: http://blackbirdjs.googlecode.com/
	     http://www.gscottolson.com/blackbirdjs/
	Version: 1.0

	The MIT License - Copyright (c) 2008 Blackbird Project
*/
( function() {
	var NAMESPACE = 'log';

	var bbird;
	var outputList;
	var cache = [];
	
	var state = getState();
	var classes = {};
	var profiler = {};
	var IDs = {
		blackbird: 'blackbird',
		checkbox: 'bbVis',
		filters: 'bbFilters',
		controls: 'bbControls',
		size: 'bbSize'
	}
	var messageTypes = { //order of these properties imply render order of filter controls
		debug: true,
		info: true,
		warn: true,
		error: true,
		profile: true
	};
	
	function generateMarkup() { //build markup
		var spans = [];
		for ( type in messageTypes ) {
			spans.push( [ '<span class="bb-', type, '" type="', type, '"></span>'].join( '' ) );
		}

		var newNode = document.createElement( 'DIV' );
		newNode.id = IDs.blackbird;
		newNode.style.display = 'none';
		newNode.innerHTML = [
			'<div class="bb-header">',
				'<div class="bb-left">',
					'<div id="', IDs.filters, '" title="click to filter by message type">', spans.join( '' ), '</div>',
				'</div>',
				'<div class="bb-right">',
					'<div id="', IDs.controls, '">',
						'<span id="', IDs.size ,'" op="resize"></span>',
						'<span class="bb-clear" title="clear" op="clear"></span>',
						'<span class="bb-close" title="close" op="close"></span>',
					'</div>',
				'</div>',
			'</div>',
			'<div class="bb-main">',
				'<div class="bb-left"></div><div class="bb-mainBody">',
					'<ol>', cache.join( '' ), '</ol>',
				'</div><div class="bb-right"></div>',
			'</div>',
			'<div class="bb-footer">',
				'<div class="bb-left" id="', IDs.checkbox, '"><span></span>Visible on page load</div>',
				'<div class="bb-right"></div>',
			'</div>'
		].join( '' );
		return newNode;
	}

	function addMessage( type, content ) { //adds a message to the output list
		content = ( content.constructor == Array ) ? content.join( '' ) : content;
		if ( outputList ) {
			var newMsg = document.createElement( 'LI' );
			newMsg.className = 'bb-' + type;
			newMsg.title = type;
			newMsg.innerHTML = [ '<span class="bb-icon"></span>', content ].join( '' );
			outputList.appendChild( newMsg );
			scrollToBottom();
		} else {
			cache.push( [ '<li class="bb-', type, '" title="', type ,' message"><span class="bb-icon"></span>', content, '</li>' ].join( '' ) );
		}
	}
	
	function clear() { //clear list output
		outputList.innerHTML = '';
	}
	
	function clickControl( evt ) {
		if ( !evt ) evt = window.event;
		var el = ( evt.target ) ? evt.target : evt.srcElement;

		if ( el.tagName == 'SPAN' ) {
			switch ( el.getAttributeNode( 'op' ).nodeValue ) {
				case 'resize': resize(); break;
				case 'clear':  clear();  break;
				case 'close':  hide();   break;
			}
		}
	}
	
	function clickFilter( evt ) { //show/hide a specific message type
		if ( !evt ) evt = window.event;
		var span = ( evt.target ) ? evt.target : evt.srcElement;

		if ( span && span.tagName == 'SPAN' ) {

			var type = span.getAttributeNode( 'type' ).nodeValue;

			if ( evt.altKey ) {
				var filters = document.getElementById( IDs.filters ).getElementsByTagName( 'SPAN' );

				var active = 0;
				for ( entry in messageTypes ) {
					if ( messageTypes[ entry ] ) active++;
				}
				var oneActiveFilter = ( active == 1 && messageTypes[ type ] );

				for ( var i = 0; filters[ i ]; i++ ) {
					var spanType = filters[ i ].getAttributeNode( 'type' ).nodeValue;

					filters[ i ].className = ( oneActiveFilter || ( spanType == type ) ) ? 'bb-' + spanType : 'bb-' + spanType + ' bb-disabled';
					messageTypes[ spanType ] = oneActiveFilter || ( spanType == type );
				}
			}
			else {
				messageTypes[ type ] = ! messageTypes[ type ];
				span.className = ( messageTypes[ type ] ) ? 'bb-' + type : 'bb-' + type + ' bb-disabled';
			}

			//build outputList's class from messageTypes object
			var disabledTypes = [];
			for ( type in messageTypes ) {
				if ( ! messageTypes[ type ] ) disabledTypes.push( 'bb-' + type );
			}
			disabledTypes.push( '' );
			outputList.className = disabledTypes.join( '-hidden ' );

			scrollToBottom();
		}
	}

	function clickVis( evt ) {
		if ( !evt ) evt = window.event;
		var el = ( evt.target ) ? evt.target : evt.srcElement;
		
		var checkbox = ( el.tagName == 'SPAN' ) ? el : el.getElementsByTagName( 'SPAN' )[ 0 ];
		checkbox.className = ( checkbox.className == '' ) ? 'checked' : '';
		state.load = ( checkbox.className == 'checked' ) ? true : false;
		setState();
	}
	
	
	function scrollToBottom() { //scroll list output to the bottom
		outputList.scrollTop = outputList.scrollHeight;
	}
	
	function isVisible() { //determine the visibility
		return ( bbird.style.display == 'block' );
	}

	function hide() { 
		bbird.style.display = 'none';
	}
			
	function show() {
		var body = document.getElementsByTagName( 'BODY' )[ 0 ];
		body.removeChild( bbird );
		body.appendChild( bbird );
		bbird.style.display = 'block';
	}
	
	//sets the position
	function reposition( position ) {
		if ( position === undefined || position == null ) {
			position = ( state && state.pos === null ) ? 1 : ( state.pos + 1 ) % 4; //set to initial position ('topRight') or move to next position
		}
				
		switch ( position ) {
			case 0: classes[ 0 ] = 'bb-top-left'; break;
			case 1: classes[ 0 ] = 'bb-top-right'; break;
			case 2: classes[ 0 ] = 'bb-bottom-left'; break;
			case 3: classes[ 0 ] = 'bb-bottom-right'; break;
		}
		state.pos = position;
		setState();
	}

	function resize( size ) {
		if ( size === undefined || size === null ) {
			size = ( state && state.size == null ) ? 0 : ( state.size + 1 ) % 2;
			}

		classes[ 1 ] = ( size === 0 ) ? 'bb-small' : 'bb-large'

		var span = document.getElementById( IDs.size );
		span.title = ( size === 1 ) ? 'small' : 'large';
		span.className = ( size === 1) ? 'bb-contract' : 'bb-expand';

		state.size = size;
		setState();
		scrollToBottom();
	}

	function setState() {
		var props = [];
		for ( entry in state ) {
			var value = ( state[ entry ] && state[ entry ].constructor === String ) ? '"' + state[ entry ] + '"' : state[ entry ]; 
			props.push( entry + ':' + value );
		}
		props = props.join( ',' );
		
		var expiration = new Date();
		expiration.setDate( expiration.getDate() + 14 );
		document.cookie = [ 'blackbird={', props, '}; expires=', expiration.toUTCString() ,';' ].join( '' );

		var newClass = [];
		for ( word in classes ) {
			newClass.push( classes[ word ] );
		}
		bbird.className = newClass.join( ' ' );
	}
	
	function getState() {
		var re = new RegExp( /blackbird=({[^;]+})(;|\b|$)/ );
		var match = re.exec( document.cookie );
		return ( match && match[ 1 ] ) ? eval( '(' + match[ 1 ] + ')' ) : { pos:null, size:null, load:null };
	}
	
	//event handler for 'keyup' event for window
	function readKey( evt ) {
		if ( !evt ) evt = window.event;
		var code = 113; //F2 key
					
		if ( evt && evt.keyCode == code ) {
					
			var visible = isVisible();
					
			if ( visible && evt.shiftKey && evt.altKey ) clear();
			else if	 (visible && evt.shiftKey ) reposition();
			else if ( !evt.shiftKey && !evt.altKey ) {
				( visible ) ? hide() : show();
			}
		}
	}

	//event management ( thanks John Resig )
	function addEvent( obj, type, fn ) {
		var obj = ( obj.constructor === String ) ? document.getElementById( obj ) : obj;
		if ( obj.attachEvent ) {
			obj[ 'e' + type + fn ] = fn;
			obj[ type + fn ] = function(){ obj[ 'e' + type + fn ]( window.event ) };
			obj.attachEvent( 'on' + type, obj[ type + fn ] );
		} else obj.addEventListener( type, fn, false );
	}
	function removeEvent( obj, type, fn ) {
		var obj = ( obj.constructor === String ) ? document.getElementById( obj ) : obj;
		if ( obj.detachEvent ) {
			obj.detachEvent( 'on' + type, obj[ type + fn ] );
			obj[ type + fn ] = null;
		} else obj.removeEventListener( type, fn, false );
	}

	
	window[ NAMESPACE ] = {
		toggle:
			function( visible ) { 
				if ( visible === true || visible === false ) {
					( visible ) ? show() : hide()
				} else if ( isVisible() ) {
					hide();
				} else {
					show();
				}
			},
		resize:
			function() { resize(); },
		clear:
			function() { clear(); },
		move:
			function() { reposition(); },
		debug:
			function( msg ) { addMessage( 'debug', msg ); },
		warn:
			function( msg ) { addMessage( 'warn', msg ); },
		info:
			function( msg ) { addMessage( 'info', msg ); },
		error:
			function( msg ) { addMessage( 'error', msg ); },
		profile:
			function( label ) {
				var currentTime = new Date(); //record the current time when profile() is executed
				
				if ( label == undefined || label == '' ) {
					addMessage( 'error', '<b>ERROR:</b> Please specify a label for your profile statement' );
				}
				else if ( profiler[ label ] ) {
					addMessage( 'profile', [ label, ': ', currentTime - profiler[ label ], 'ms' ].join( '' ) );
					delete profiler[ label ];
				}
				else {
					profiler[ label ] = currentTime;
					addMessage( 'profile', label );
				}
				return currentTime;
			}
	}

	addEvent( window, 'load', function() { /* initialize Blackbird when the page loads */
		var body = document.getElementsByTagName( 'BODY' )[ 0 ];
		bbird = body.appendChild( generateMarkup() );
		outputList = bbird.getElementsByTagName( 'OL' )[ 0 ];
	
		//add events
		addEvent( IDs.checkbox, 'click', clickVis );
		addEvent( IDs.filters, 'click', clickFilter );
		addEvent( IDs.controls, 'click', clickControl );
		addEvent( document, 'keyup', readKey);

		resize( state.size );
		reposition( state.pos );
		if ( state.load ) {
			show();
			document.getElementById( IDs.checkbox ).getElementsByTagName( 'SPAN')[ 0 ].className = 'checked'; 
		}

		scrollToBottom();

		addEvent( window, 'unload', function() {
			removeEvent( IDs.checkbox, 'click', clickVis );
			removeEvent( IDs.filters, 'click', clickFilter );
			removeEvent( IDs.controls, 'click', clickControl );
			removeEvent( document, 'keyup', readKey );
		});
	});
	
	window.blackbird = {
		namespace:
			function( newNS ) {
				if ( newNS && newNS.constructor === String ) {
					window[ newNS ] = {};
					for ( method in window[ NAMESPACE ] ) {
						window[ newNS ][ method ] = window[ NAMESPACE ][ method ];
					}
					delete window[ NAMESPACE ];
					NAMESPACE = newNS;
				}
			}
	}
})();
