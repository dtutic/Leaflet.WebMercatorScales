/**
 *  Visalization of scales and distortions in Web Mercator map projection. 
 *  Authors: Dražen Tutić (dtutic@geof.hr), Ana Kuveždić Divjak (akuvezdic@geof.hr)
 *  	     University of Zagreb, Faculty of Geodesy, GEOF-OSGL Lab
 *  Inspired by LatLonGraticule by: lanwei@cloudybay.com.tw
 */



L.WebMercatorScales = L.Layer.extend({
    includes: L.Mixin.Events,

    options: {
        opacity: 1,
        weight: 0.8,
        color: '#000',
        colorMer: '#00f',
		colorPar: '#0f0',
        font: '11px Arial',
        zoomInterval: [
            {start: 1, end: 2, interval: 5000000},
            {start: 3, end: 3, interval: 2000000},
            {start: 4, end: 4, interval: 1000000},
            {start: 5, end: 5, interval: 500000},
            {start: 6, end: 7, interval: 200000},
            {start: 8, end: 8, interval: 100000},
            {start: 9, end: 9, interval: 50000},
            {start: 10, end: 10, interval: 20000},
            {start: 11, end: 11, interval: 10000},
            {start: 12, end: 12, interval: 5000},
            {start: 13, end: 13, interval: 2000},
            {start: 14, end: 14, interval: 1000},
            {start: 15, end: 15, interval: 500},
            {start: 16, end: 16, interval: 200},
            {start: 17, end: 17, interval: 100},
            {start: 18, end: 18, interval: 50},
            {start: 19, end: 19, interval: 20},
            {start: 20, end: 20, interval: 10}
        ],
		bottomScaleBar: false,
		leftScaleBar: false,
		topScaleBar: true,
		rightScaleBar: true,
		majorTickSize: 10,
		minorTickSize: 4,
		verticalScaleLines: false,
		horizontalScaleLines: false,
		distortionMerMask: true,
		distortionParMask: false,
		distortionThresh: 5,
		merScaleIsolines: false,
		parScaleIsolines: false
    },

    initialize: function (options) {

        L.setOptions(this, options);

		// Global variables

		//Constants of the WGS84 ellipsoid needed to calculate meridian length or latitute

    	this._a = 6378137.0;
		this._b = 6356752.3142;
		this._e2 = (this._a*this._a - this._b*this._b)/(this._a*this._a);
		this._n = (this._a - this._b)/(this._a + this._b);
		this._n2 = this._n * this._n;
		this._A = this._a*(1.0 - this._n)*(1.0 - this._n2)*(1.0 + 9.0/4.0*this._n2 + 225.0/64.0*this._n2*this._n2);
		this._ic1 = 1.5*this._n - 29.0/12.0*this._n2*this._n + 553.0/80.0*this._n2*this._n2*this._n;
		this._ic2 = 21.0/8.0*this._n2 - 1537.0/128.0*this._n2*this._n2;
		this._ic3 = 151.0/24.0*this._n2*this._n - 32373.0/640.0*this._n2*this._n2*this._n;
		this._ic4 = 1097.0/64.0*this._n2*this._n2;
		this._ic5 = 8011.0/150.0*this._n2*this._n2*this._n;
		this._c1 = -1.5*this._n + 31.0/24.0*this._n2*this._n - 669.0/640.0*this._n2*this._n2*this._n;
		this._c2 = 15.0/18.0*this._n2 - 435.0/128.0*this._n2*this._n2;
		this._c3 = -35.0/12.0*this._n2*this._n + 651.0/80.0*this._n2*this._n2*this._n;
		this._c4 = 315.0/64.0*this._n2*this._n2;
		this._c5 = -693.0/80.0*this._n2*this._n2*this._n;

		//Latitude limit of the Web Mercator projection
		this._LIMIT_PHI = 1.484419982;
		this._EPSILON = 1e-10;
        this._phi_g = -9999;
        this._phi_d = -9999;
    },

    onAdd: function (map) {
        this._map = map;

        if (!this._container) {
            this._initCanvas();
        }

        map._panes.overlayPane.appendChild(this._container);

        map.on('viewreset', this._reset, this);
        map.on('move', this._reset, this);
        map.on('moveend', this._reset, this);

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._container);

        map.off('viewreset', this._reset, this);
        map.off('move', this._reset, this);
        map.off('moveend', this._reset, this);
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    setOpacity: function (opacity) {
        this.options.opacity = opacity;
        this._updateOpacity();
        return this;
    },

    bringToFront: function () {
        if (this._canvas) {
            this._map._panes.overlayPane.appendChild(this._canvas);
        }
        return this;
    },

    bringToBack: function () {
        var pane = this._map._panes.overlayPane;
        if (this._canvas) {
            pane.insertBefore(this._canvas, pane.firstChild);
        }
        return this;
    },

    getAttribution: function () {
        return this.options.attribution;
    },

    _initCanvas: function () {
        this._container = L.DomUtil.create('div', 'leaflet-image-layer');

        this._canvas = L.DomUtil.create('canvas', '');
        this._ctx = this._canvas.getContext('2d');

		this._vert_gradientFill=this._ctx.createLinearGradient(0,0,0,10);
		this._vert_gradientFill.addColorStop(0,"rgba(255, 255, 255, 1)");
		this._vert_gradientFill.addColorStop(1,"rgba(255, 255, 255, 0)");

		this._bottom_vert_gradientFill=this._ctx.createLinearGradient(0,this._map.getSize().y-10,0,this._map.getSize().y);
		this._bottom_vert_gradientFill.addColorStop(0,"rgba(255, 255, 255, 0)");
		this._bottom_vert_gradientFill.addColorStop(1,"rgba(255, 255, 255, 1)");

		this._hor_gradientFill=this._ctx.createLinearGradient(this._map.getSize().x-10,0,this._map.getSize().x,0);
		this._hor_gradientFill.addColorStop(0,"rgba(255, 255, 255, 0)");
		this._hor_gradientFill.addColorStop(1,"rgba(255, 255, 255, 1)");

		this._left_hor_gradientFill=this._ctx.createLinearGradient(0,0,10,0);
		this._left_hor_gradientFill.addColorStop(0,"rgba(255, 255, 255, 1)");
		this._left_hor_gradientFill.addColorStop(1,"rgba(255, 255, 255, 0)");

        this._updateOpacity();

        this._container.appendChild(this._canvas);

        L.extend(this._canvas, {
            onselectstart: L.Util.falseFn,
            onmousemove: L.Util.falseFn,
            onload: L.bind(this._onCanvasLoad, this)
        });
    },

    _reset: function () {
        var container = this._container,
            canvas = this._canvas,
            size = this._map.getSize(),
            lt = this._map.containerPointToLayerPoint([0, 0]);

        L.DomUtil.setPosition(container, lt);

        container.style.width = size.x + 'px';
        container.style.height = size.y + 'px';

        canvas.width  = size.x;
        canvas.height = size.y;
        canvas.style.width  = size.x + 'px';
        canvas.style.height = size.y + 'px';

        if (this.options.distortionMerMask) this._drawDistortionMask(true);
        if (this.options.distortionParMask) this._drawDistortionMask(false);
		this._drawEdgeScaleBar();			
        if (this.options.verticalScaleLines) this._drawVerticalScaleLines();
        if (this.options.merScaleIsolines) this._drawScaleIsolines(true);
        if (this.options.parScaleIsolines) this._drawScaleIsolines(false);
    },

    _onCanvasLoad: function () {
        this.fire('load');
    },

    _updateOpacity: function () {
        L.DomUtil.setOpacity(this._canvas, this.options.opacity);
    },


	// draw scale isolines
	_drawScaleIsolines: function (mer) {
        var c_g = this._calcLinScaleMap(0, mer);
		var y = this._map.getSize().y;
        var c_d = this._calcLinScaleMap(y, mer);

   		var phi_g = this._map.containerPointToLatLng(L.point(0, 0)).lat * Math.PI / 180.0;
		if (phi_g > this._LIMIT_PHI) phi_g = this._LIMIT_PHI; 
		if (phi_g < -this._LIMIT_PHI) phi_g = -this._LIMIT_PHI; 

   		var phi_d = this._map.containerPointToLatLng(L.point(0, y)).lat * Math.PI / 180.0;
		if (phi_d > this._LIMIT_PHI) phi_d = this._LIMIT_PHI; 
		if (phi_d < -this._LIMIT_PHI) phi_d = -this._LIMIT_PHI; 

		var range, interval;
		if (phi_g * phi_d < 0.0) {
			if (c_g > c_d) range = c_g - 1.0; else range = c_d - 1,0;
			interval = range / 2.5;
		}
		else {
			if (c_g > c_d) range = c_g - c_d; else range = c_d - c_g;
			interval = range / 5.0;
		}
        var temp;
		if (interval < 1.0) temp = interval - Math.trunc(interval);	else temp = interval / 2;
        temp = temp.toExponential().split("e");
        var num = parseFloat(temp[0]);
        var digits = -parseFloat(temp[1]);

		if (num < 1.5) interval = 1.0;
		else if (num >= 1.5 && num < 3.5) interval = 2.0;
		else if (num >= 3.5 && num < 7.5) interval = 5.0;
		else interval = 10.0;

		interval = interval/Math.pow(10.0,digits);
		
		var top_stop = 0;
		if (this.options.bottomScaleBar) top_stop = 12;

        var c, phi, dif, olddif = 0, oldphi = -this._LIMIT_PHI, c1 = true, oldc;

        do {
            y--;
            c = this._calcLinScaleMap(y, mer); 
   		    phi = this._map.containerPointToLatLng(L.point(0, y)).lat;
			dif = c + Math.sign(phi)*(c % interval);
			if (olddif > dif || (oldphi*phi <= 0 && c1)) {
		        if (mer) this._ctx.strokeStyle = this.options.colorMer; else this._ctx.strokeStyle = this.options.colorPar;
				this._ctx.beginPath();
		        this._ctx.moveTo(0, y+1);
		        this._ctx.lineTo(this._map.getSize().x, y+1);
		        this._ctx.stroke();
		        if (mer) this._ctx.fillStyle = this.options.colorMer; else this._ctx.fillStyle = this.options.colorPar;
		        this._ctx.font = this.options.font;
				this._ctx.textAlign = "left";
				this._ctx.textBaseline = "bottom"; 
				if(oldphi*phi <= 0) { c1 = false; if (mer) oldc = 1.0 / (1.0 - this._e2); else oldc = 1.0; }
		        this._ctx.fillText(oldc.toFixed(digits), 12+(!mer)*60, y-1);
			}
			olddif = dif;						
			oldphi = phi;
			oldc = c;
        } while (y >= top_stop)  	
	},

	// calculate meridian or parallel linear scale from map coordinates
	_calcLinScaleMap: function (y, mer) {
   		var phi = this._map.containerPointToLatLng(L.point(0, y)).lat * Math.PI / 180.0;
		if (phi > this._LIMIT_PHI) phi = this._LIMIT_PHI; 
		if (phi < -this._LIMIT_PHI) phi = -this._LIMIT_PHI; 
        var sinPhi = Math.sin(phi);
		if (mer)
	        return Math.sqrt(Math.pow(1.0 - this._e2 * sinPhi * sinPhi, 3)) / ((1.0 - this._e2) * Math.cos(phi));
		else
        	return Math.sqrt(1.0 - this._e2 * sinPhi * sinPhi) / Math.cos(phi);
	},

	// calculate extend of distortion mask
    _calcDistortionMask: function (mer) {
		var y = this._map.getSize().y / 2.0;

		// calculate linear scale for map center
		var cs = this._calcLinScaleMap(y, mer);

        var delta = this.options.distortionThresh * cs / 100.0; 
        var c, phi;

		// first iterate over every 10px of map height to the north while linear scale is less than threshold
        do {
            y -= 10; c = this._calcLinScaleMap(y, mer);
        } while ((y >= -10) && (Math.abs(c - cs) < delta)) 
		// now iterate over every pixel of map height to the south while linear scale is greater than threshold
        do {
            y++; c = this._calcLinScaleMap(y, mer);
        } while ((Math.abs(c - cs) > delta))
        y--;
        // check if threshold is on map area       
        if (y > 0) this._phi_g = y; else this._phi_g = -9999;

		y = this._map.getSize().y / 2.0;
		// first iterate over every 10px of map height to the south while linear scale is less than threshold
        do {
            y += 10; c = this._calcLinScaleMap(y, mer);
        } while ((y < this._map.getSize().y + 10) && (Math.abs(c - cs) < delta)) 
		// now iterate over every pixel of map height to the south while linear scale is greater than threshold
        do {
            y--; c = this._calcLinScaleMap(y, mer);
        } while ((Math.abs(c-cs) > delta))
		y++;
        // check if threshold is on map area       
        if (y < this._map.getSize().y) this._phi_d = y; else this._phi_d = -9999;
    },

    _hexToRgb: function (hex, alpha) {
	   	hex   = hex.replace('#', '');
   		var r = parseInt(hex.length == 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16);
   		var g = parseInt(hex.length == 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16);
   		var b = parseInt(hex.length == 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16);
   		if ( alpha ) {
      		return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
   		}
   		else {
   		   return 'rgb(' + r + ', ' + g + ', ' + b + ')';
   		}
	},

	// draw distortion mask
	_drawDistortionMask: function (mer) {
		this._calcDistortionMask(mer);

        var size = this._map.getSize();

		// fill style of distortion mask
        var c;
        if (mer) this._ctx.fillStyle = this._hexToRgb(this.options.colorMer, 0.2); 
		else this._ctx.fillStyle = this._hexToRgb(this.options.colorPar, 0.2); 

		// draw mask rectangles
        if (this._phi_g != -9999) {
		    this._ctx.fillRect(0,0,size.x,this._phi_g);
        }

        if (this._phi_d != -9999) {
		    this._ctx.fillRect(0,this._phi_d,size.x,size.y - this._phi_d);
        } 

		// write text on amount of distortions masked
        if (mer) this._ctx.fillStyle = this.options.colorMer; else this._ctx.fillStyle = this.options.colorPar;
        this._ctx.font = this.options.font;
		this._ctx.textAlign="right";
		this._ctx.textBaseline="middle";
        var label = 'Distortion of parallel scale > ';
		if (mer) label = 'Distortion of meridian scale > ';
        this._ctx.fillText(label+this.options.distortionThresh+'%', size.x-12, this._phi_g / 2+(!mer)*14);
        this._ctx.fillText(label+this.options.distortionThresh+'%', size.x-12, (size.y+this._phi_d) / 2-(!mer)*14);
	},

	// lookup for distance between major ticks on scale bar depending on current zoom level
    _calcInterval: function() {
        var zoom = this._map.getZoom();
        for (var idx in this.options.zoomInterval) {
            var dict = this.options.zoomInterval[idx];
            if (dict.start <= zoom && dict.end >= zoom) {
                this._dd = dict.interval;
                break;
            }
        }
    },

	// draw egde scale bars
	_drawEdgeScaleBar: function() {
        this._calcInterval();
        var size = this._map.getSize();

		// set line style
		this._ctx.lineWidth = this.options.weight;
        this._ctx.strokeStyle = this.options.color;

        // set text font and define units
        this._ctx.font = this.options.font;
		var units = ' m', dd = this._dd;
		if (this._dd >= 1000) { units = ' km'; dd = this._dd/1000; }

		// draw scale bars
        if (this.options.topScaleBar) {
			this._ctx.fillStyle= this._vert_gradientFill;
			this._ctx.fillRect(0,0,size.x,10);
			this._ctx.beginPath(); this._ctx.moveTo(0,0); this._ctx.lineTo(size.x,0); this._ctx.stroke();
			this._create_lon_ticks(0);
			this._ctx.fillStyle = this.options.color;
			this._ctx.textAlign="center";
			this._ctx.textBaseline="top"; 
	        this._ctx.fillText(dd + units, size.x / 2, 12);
		}
        if (this.options.rightScaleBar) {
			this._ctx.fillStyle= this._hor_gradientFill;
			this._ctx.fillRect(size.x-10,0,size.x,size.y);
			this._ctx.beginPath(); this._ctx.moveTo(size.x,0); this._ctx.lineTo(size.x,size.y); this._ctx.stroke();
			this._create_lat_ticks(size.x);
			this._ctx.fillStyle = this.options.color;
			this._ctx.textAlign="right";
			this._ctx.textBaseline="middle"; 
	        this._ctx.fillText(dd + units, size.x - 12, size.y / 2);
		}
        if (this.options.bottomScaleBar) {
			this._ctx.fillStyle= this._bottom_vert_gradientFill;
			this._ctx.fillRect(0,size.y-10,size.x,size.y);
			this._ctx.beginPath(); this._ctx.moveTo(0,size.y); this._ctx.lineTo(size.x,size.y); this._ctx.stroke();
			this._create_lon_ticks(size.y);
			this._ctx.fillStyle = this.options.color;
			this._ctx.textAlign="center";
		    this._ctx.textBaseline="bottom"; 
            this._ctx.fillText(dd + units, size.x / 2, size.y - 12);
		}
        if (this.options.leftScaleBar) {
			this._ctx.fillStyle= this._left_hor_gradientFill;
			this._ctx.fillRect(0,0,10,size.y);
			this._ctx.beginPath(); this._ctx.moveTo(0,0); this._ctx.lineTo(0,size.y); this._ctx.stroke();
			this._create_lat_ticks(0);
			this._ctx.fillStyle = this.options.color;
			this._ctx.textAlign="left";
			this._ctx.textBaseline="middle"; 
	        this._ctx.fillText(dd + units, 12, size.y / 2);
		}
	},

	// draw vertical scale bar along right map edge
	_create_lat_ticks: function(x) {
		var phi_s = this._map.containerPointToLatLng(L.point(x, this._map.getSize().y / 2)).lat;
		var phi_d = this._map.containerPointToLatLng(L.point(x, this._map.getSize().y)).lat;
		var phi_g = this._map.containerPointToLatLng(L.point(x, 0)).lat;
		var d_s = this._merLength(phi_s * Math.PI / 180.0);
		var d_g = this._merLength(phi_g * Math.PI / 180.0);
		var d_d = this._merLength(phi_d * Math.PI / 180.0);
        var i;
		for	(i = d_s + this._dd / 2.0; i < d_g; i = i + this._dd) {
			var phi = this._invmerLength(i);			
			if (Math.abs(phi) < this._LIMIT_PHI) this._draw_lat_tick(phi, this.options.majorTickSize, x);
	        if (this.options.horizontalScaleLines) this._drawHorizontalScaleLine(phi);
		}
		for	(i = d_s - this._dd / 2.0; i > d_d; i = i - this._dd) {
			var phi = this._invmerLength(i);			
			if (Math.abs(phi) < this._LIMIT_PHI) this._draw_lat_tick(phi, this.options.majorTickSize, x);
	        if (this.options.horizontalScaleLines) this._drawHorizontalScaleLine(phi);
		}
		for	(i = d_s; i	< d_g; i = i + this._dd / 10.0) {
			var phi = this._invmerLength(i);			
			if (Math.abs(phi) < this._LIMIT_PHI) this._draw_lat_tick(phi, this.options.minorTickSize, x);
		}
		for	(i = d_s - this._dd / 10; i	> d_d; i = i - this._dd / 10.0) {
			var phi = this._invmerLength(i);			
			if (Math.abs(phi) < this._LIMIT_PHI) this._draw_lat_tick(phi, this.options.minorTickSize, x);
		}
	},

	// draw horizontal scale bar at defined height (top y=0, bottom y=mapsize.y, etc.)
	_create_lon_ticks: function(y) {
		var cen_p = this._map.containerPointToLatLng(L.point(this._map.getSize().x/2, y));
		var left_p = this._map.containerPointToLatLng(L.point(0,y));
		var right_p = this._map.containerPointToLatLng(L.point(this._map.getSize().x, y));
		var sinPhi = Math.sin(cen_p.lat * Math.PI / 180.0);
		var N = this._a / Math.sqrt(1.0 - this._e2 * sinPhi * sinPhi);
		var dl = this._dd / (N * Math.cos(cen_p.lat * Math.PI / 180.0)) * 180.0 / Math.PI;
        var i;
		for	(i = cen_p.lng + dl / 2.0; i < right_p.lng; i = i + dl) {
			this._draw_lon_tick(i, this.options.majorTickSize, y);
		}
		for	(i = cen_p.lng - dl / 2.0; i > left_p.lng; i = i - dl) {
			this._draw_lon_tick(i, this.options.majorTickSize, y);
		}
		for	(i = cen_p.lng; i < right_p.lng; i = i + dl / 10.0) {
			this._draw_lon_tick(i, this.options.minorTickSize, y);
		}
		for	(i = cen_p.lng - dl / 10.0; i > left_p.lng; i = i - dl / 10.0) {
			this._draw_lon_tick(i, this.options.minorTickSize, y);
		}
	},

	// draw vertical scale bar line
	_drawVerticalScaleLine: function(i, dl, line, sign) {
        var x = this._latLngToCanvasPoint(L.latLng(0.0, i)).x;			
		this._ctx.beginPath();
	    this._ctx.moveTo(x, 0);
		var j, p, N, d;
		for (j = 1; j<= this._map.getSize().y; j++) {
			p = this._map.containerPointToLatLng(L.point(0, j));
			sinPhi = Math.sin(p.lat * Math.PI / 180.0);
			N = this._a / Math.sqrt(1.0 - this._e2 * sinPhi * sinPhi);		
			d = this._dd / (N * Math.cos(p.lat * Math.PI / 180.0)) * 180.0 / Math.PI;
            x = this._latLngToCanvasPoint(L.latLng(0, i+sign*((d/2-dl/2)+(d-dl)*line))).x;			
		    this._ctx.lineTo(x, j);				
		}
        this._ctx.stroke();
	},

	// draw vertical scale bar lines
	_drawVerticalScaleLines: function() {
		var size = this._map.getSize();
        var map_c = this._map.containerPointToLatLng(L.point(size.x / 2.0, size.y /2.0));
        var y = 0;  if (map_c.lat > 0) y = size.y;
		var cen_p = this._map.containerPointToLatLng(L.point(size.x / 2.0, y));
		var left_p = this._map.containerPointToLatLng(L.point(0, y ));
		var right_p = this._map.containerPointToLatLng(L.point(size.x, y));

		var sinPhi = Math.sin(cen_p.lat * Math.PI / 180.0);
		var N = this._a / Math.sqrt(1.0 - this._e2 * sinPhi * sinPhi);
		var dl = this._dd / (N * Math.cos(cen_p.lat * Math.PI / 180.0)) * 180.0 / Math.PI;
        var i, j, p, d, x, line = 0;
		for	(i = cen_p.lng + dl / 2.0; i < right_p.lng; i = i + dl) {
            this._drawVerticalScaleLine(i, dl, line, 1);
			line++;
		}
		line = 0;
		for	(i = cen_p.lng - dl / 2.0; i > left_p.lng; i = i - dl) {
            this._drawVerticalScaleLine(i, dl, line, -1);
			line++;			
		}
	},
    
	// find pixel coordinates for given geographic coordinates
    _latLngToCanvasPoint: function(latlng) {
        var projectedPoint = this._map.project(L.latLng(latlng));
        projectedPoint._subtract(this._map.getPixelOrigin());
        return L.point(projectedPoint).add(this._map._getMapPanePos());
    },

	// draw ticks on vertical scale bar on the right map edge (on the left edge it would be the same)
	_draw_lat_tick: function(phi, size, x) {
		if (x < size) size = -size;
		var y = this._latLngToCanvasPoint(L.latLng(phi*180.0/Math.PI, 0.0)).y;
		this._ctx.beginPath();
        this._ctx.moveTo(x, y);
        this._ctx.lineTo(x-size, y);
        this._ctx.stroke();
	},

	// draw horizontal scale lines
	_drawHorizontalScaleLine: function(phi) {
		var y = this._latLngToCanvasPoint(L.latLng(phi*180.0/Math.PI, 0.0)).y;
		this._ctx.beginPath();
        this._ctx.moveTo(0, y);
        this._ctx.lineTo(this._map.getSize().x, y);
        this._ctx.stroke();
	},

	// draw ticks on horizontal scale bar at given vertical position (top y=0, bottom y = mapsize.y, etc.)
	_draw_lon_tick: function(lam, size, y) {
        if (y < size) size = -size;
		var x = this._latLngToCanvasPoint(L.latLng(0.0, lam)).x;
		this._ctx.beginPath();
	    this._ctx.moveTo(x, y);
        this._ctx.lineTo(x, y-size);
        this._ctx.stroke();
	},

	// find meridian arc length for given latitute on ellipsoid
	_merLength: function(phi) {
		var cos2phi = Math.cos(2.0 * phi);
		return this._A*(phi+Math.sin(2.0*phi)*(this._c1+(this._c2+(this._c3+(this._c4+this._c5*cos2phi)*cos2phi)*cos2phi)*cos2phi));

	},

	// find latitute for given meridian arc length on ellipsoid
	_invmerLength: function(s) {
		var psi = s / this._A;
		var cos2psi = Math.cos(2.0 * psi);
		return psi+Math.sin(2.0*psi)*(this._ic1+(this._ic2+(this._ic3+(this._ic4+this._ic5*cos2psi)*cos2psi)*cos2psi)*cos2psi);
	}

});

L.webMercatorScales = function (options) {
    return new L.WebMercatorScales(options);
};



