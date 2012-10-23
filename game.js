var loadImages = function(images, cb) {
	var count = 0;
	var result = [];
	for (var i = 0; i < images.length; i++) {
		var img = new Image();
		result.push(img);
		img.onload = function() {
			if (++count == images.length) {
				cb(result);
			}
		};
		img.src = images[i];
	}
};

var frameCounter = function () {
	var spf = "?";
	var frames = 0;
	var last_time = new Date().getTime();
	return function() {
		if (frames++ == 30) {
			var time = new Date().getTime();
			spf = String(Math.floor((time - last_time) / frames));
			last_time = time;
			frames = 0;
		}
		return spf;
	}	
}();

var clamp = function(val, min, max) {
	return (val < min) ? min : (val > max) ? max : val;
};

var makeTileSet = function(img, img_per_row, w, h) {
	return function(subimg) {
		var ximg = subimg % img_per_row;
		var yimg = subimg - ximg;
		return function(ctx, x, y) {
			ctx.drawImage(img, ximg * (w + 2), yimg * h, w, h, x, y, w, h);
		};
	};
};

var drawMap = function(map, tileset) {
	return function(ctx, x, y) {
		for (var xT = 0; xT < 5; xT++) {
			for (var yT = 0; yT < 5; yT++) {
				tileset(map[yT][xT])(ctx, x + xT * 32, y + yT * 32);
			}
		}
	};
};

selectorArmLength = 5;

var drawSelector = function(ctx, x, y) {
	var size = selectorArmLength;
	var w = 32;
	var h = 32;
	var offset = 1;
	ctx.strokeStyle = "rgb(255,255,255)";
	ctx.beginPath();
	ctx.moveTo(x + offset, y + offset + size);
	ctx.lineTo(x + offset, y + offset);
	ctx.lineTo(x + offset + size, y + offset);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + w - offset, y + offset + size);
	ctx.lineTo(x + w - offset, y + offset);
	ctx.lineTo(x + w - offset - size, y + offset);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + offset, y + h - offset - size);
	ctx.lineTo(x + offset, y + h - offset);
	ctx.lineTo(x + offset + size, y + h - offset);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + w - offset, y + h - offset - size);
	ctx.lineTo(x + w - offset, y + h - offset);
	ctx.lineTo(x + w - offset - size, y + h - offset);
	ctx.stroke();
};

loadImages(["tiles.png"], function (images) {
	var canvas = document.getElementById('tbtgame');
	var ctx = canvas.getContext('2d');

	ctx.mozImageSmoothingEnabled = false;
	ctx.scale(3, 3);

	var mainTileSet = makeTileSet(images[0], 2, 32, 32);

	var selectorX = 0;
	var selectorY = 0;
	var sizeDir = +0.3;

	var Inputs = {left:0, right:1, up:2, down:3, a:4, b:5, x:6, y:7};
	var inputState = [false, false, false, false, false, false, false, false];
	var newInputs = [];

	var keyListener = function(e) {
	  var keyboardMaps = [37, 39, 38, 40, 0, 0, 0, 0];
		e = e || window.event;
		var moveStep = 1;
		var idx = keyboardMaps.indexOf(e.keyCode);
		if (e.type == "keydown" && idx >= 0) {
			inputState[idx] = true;
			newInputs.push(idx);
		}
		if (e.type == "keyup" && idx >= 0) {
		  inputState[idx] = false;
		}
	};

  var moveSelector = function(x, y) {
	  selectorX = clamp(x, 0, 4);
		selectorY = clamp(y, 0, 4);
	}

	var mainloop = function() {
		setTimeout(mainloop, 30);
		
		// START LOGIC

	  selectorArmLength += sizeDir;
		if (selectorArmLength > 6) sizeDir = -0.3;
		if (selectorArmLength < 4) sizeDir = 0.3;
		document.getElementById("mspf").innerHTML = '' + frameCounter();

		for (var idx = 0; idx < newInputs.length; idx++) {
			var inp = newInputs[idx];
			switch (inp) {
			case Inputs.left:
				moveSelector(selectorX - 1, selectorY);
				break;
			case Inputs.right:
				moveSelector(selectorX + 1, selectorY);
				break;
			case Inputs.up:
				moveSelector(selectorX, selectorY - 1);
				break;
			case Inputs.down:
				moveSelector(selectorX, selectorY + 1);
				break;
			}
		}

		document.getElementById("sX").innerHTML = '' + selectorX;
		document.getElementById("sY").innerHTML = '' + selectorY;

		// END LOGIC
		
		newInputs = [];

		draw();
	};
	
	var draw = function() {
		var mainMap = [[0, 1, 0, 1, 0], 
			[1, 2, 1, 2, 1], 
			[2, 3, 2, 3, 2], 
			[3, 0, 3, 0, 3],
			[1, 2, 1, 3, 2]];
		drawMap(mainMap, mainTileSet)(ctx, 0, 0);
		drawSelector(ctx, selectorX * 32, selectorY * 32);
	};

	document.onkeydown = keyListener;
	document.onkeyup = keyListener;
	mainloop();
});

