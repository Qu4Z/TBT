var Util = function() {
	var nullFunc = function () {};
	var distanceTo = function(x1, y1, x2, y2) {
		return Math.abs(x1 - x2) + Math.abs(y1 - y2);
	};
	return {
		nullFunc: nullFunc,
		distanceTo: distanceTo
	};
}();

var Colors = {
	BackgroundBlue: "#0000AA",
	TextGrey: "#CCCCCC"
};

var MoveState = {
	Selecting: 0,
	Moving:  1,
	Attacking: 2
};

var View = {
	Width: 5,
	Height: 5
};

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

var FrameCounter = function () {
	var spf = "?";
	var frames = 0;
	var last_time = new Date().getTime();
	return function() {
		if (++frames == 30) {
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

var makeTileSet = function () { 
	var drawTile = function(ctx, x, y, tile) {
		tile = tile || this;
		ctx.drawImage(tile.img, tile.x, tile.y, tile.w, tile.h, x, y, tile.w, tile.h);
	};

	return function(img, tiles_per_row, tile_count, w, h) {
		var tiles = [];
		for (var tile = 0; tile < tile_count; tile++) {
			var xtile = tile % tiles_per_row;
			tiles.push({ 
				draw: drawTile, 
				x: xtile * w,
				y: (tile - xtile) * h,
				w: w,
				h: h,
				img: img
			});
		}
		return tiles;
	};
}();

var makeSprite = function() {
	var drawSprite = function(ctx, x, y, sprite) {
		sprite = sprite || this;
		ctx.drawImage(sprite.image, x, y);
	};

	return function(image) {
		return {
			draw: drawSprite,
			image: image
		};
	};
}();

var mainMap = 
	[[0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0], 
	[1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 2], 
	[2, -0, 2, -0, 2, -0, -0, -0, 2, 2, -0, 2], 
	[-0, 0, -0, 0, -0, 0, -0, -0, 0, 0, -0, -0],
	[1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 2], 
	[2, -0, 2, -0, 2, -0, -0, -0, 2, 2, -0, 2], 
	[-0, 0, -0, 0, -0, 0, -0, -0, 0, 0, -0, -0],
	[1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 2], 
	[2, -0, 2, -0, 2, -0, -0, -0, 2, 2, -0, 2], 
	[-0, 0, -0, 0, -0, 0, -0, -0, 0, 0, -0, -0],
	[1, 2, 1, -0, 2, 0, 1, 2, -0, 2, 1, 0]];

var Input = function() {
	var buttons = {Left:0, Right:1, Up:2, Down:3, A:4, B:5, X:6, Y:7};
	var inputState = [false, false, false, false, false, false, false, false];
	var newInputs = [];

	var keyboardMaps = [37, 39, 38, 40, 88, 90, 83, 65];
	var listener = function(e) {
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

	var tick = function() {
		newInputs.length = 0;
	};

	document.onkeydown = listener;
	document.onkeyup = listener;

	return {
		tick: tick,
		listener: listener,
		buttons: buttons,
		inputState: inputState,
		newInputs: newInputs
	};
}();

var Inputs = Input.buttons;

var Widgets = function () {
	var widgetStack = [];
	var push = function(widget) {
		widgetStack.push(widget);
	};

	var pop = function(widget) {
		widgetStack.pop();
	};

	var step = function() {
		for (var i = 0; i < widgetStack.length; i++) {
			widgetStack[i].step();
		}
	};

	var draw = function(ctx) {
		for (var i = 0; i < widgetStack.length; i++) {
			widgetStack[i].draw(ctx);
		}
	}

	var handleInput = function(inputs) {
		if ((widgetStack.length > 0) && (inputs.length > 0)) {
			widgetStack[widgetStack.length - 1].handleInput(inputs);
		}
	}

	return {
		step: step,
		handleInput: handleInput,
		draw: draw,
		push: push,
		pop: pop
	};
}();

var Units;
var Map;
var Menu;

loadImages(["tilemap.png", "enemy2.png", "player.png"], function (images) {
  Units = function() {
		var units = [];

		units.push({ x: 1, y: 0, sprite: makeSprite(images[1]),
			name: "Soldier",
			hp: 10,
			maxHp: 10
		});

		units.push({ x: 3, y: 4, sprite: makeSprite(images[2]),
			name: "Player",
			hp: 7,
			maxHp: 12
		});

		var unitAt = function(x, y) {
			for (var i = 0; i < units.length; i++) {
				var unit = units[i];
				if (unit.x == x && unit.y == y) {
					return unit;
				}
			}
			return null;
		};

		var moveTo = function(x, y) {
			if (!Units.selected || Units.moveState != MoveState.Moving)
				return;
			
			if (inRange(Units.selected, x, y) && (!unitAt(x, y) || unitAt(x, y) == Units.selected)) {
				Units.selected.x = x;
				Units.selected.y = y;
				var targets = Units.targets(Units.selected);
				if (targets.length) {
					Units.moveState = MoveState.Attacking;
					Units.currentTargets = targets;
				} else {
					Units.moveState = MoveState.Selecting;
					Units.selected = null;
				}
			}
		};

		var add_target = function(list, x, y) {
			var unit = Units.unitAt(x, y);
			if (unit)
				list.push(unit);
		};

		var targets = function(whose) {
			var x = whose.x, y = whose.y;
			var result = [];
			add_target(result, x + 1, y);
			add_target(result, x - 1, y);
			add_target(result, x, y + 1);
			add_target(result, x, y - 1);
			return result;
		};

		var attack = function(who) {
			if (!who)
				return;

			if (who != Units.selected) {
				who.hp -= 3;
			}

			Units.selected = null;
			Units.moveState = MoveState.Selecting;
		};

		var inRange = function(unit, x, y) {
			return Util.distanceTo(unit.x, unit.y, x, y) < 3; // TODO: unit.speed (also, terrain mods)
		};

		var drawMovement = function(ctx, cameraX, cameraY) {
			if (Units.moveState == MoveState.Moving) {
				ctx.globalAlpha = 0.5;
				ctx.fillStyle = "rgb(187,255,187)";
				for (var y = cameraY; y < cameraY + View.Height; y++) {
					for (var x = cameraX; x < cameraX + View.Width; x++) {
						if (inRange(Units.selected, x, y)) {
							ctx.fillRect((x - cameraX) * 32, (y - cameraY) * 32, 32, 32);
						}
					}
				}
				ctx.globalAlpha = 1;
			} else if (Units.moveState == MoveState.Attacking) {
				ctx.fillStyle = "rgb(195,60,60)";
				for (var target = 0; target < Units.currentTargets.length; target++) {
					var enemy = Units.currentTargets[target];
					ctx.fillRect((enemy.x - cameraX) * 32, (enemy.y - cameraY) * 32, 32, 32);
				}
			}
		};

		var drawUnits = function(ctx, cameraX, cameraY) {
			for (var i = 0; i < units.length; i++) {
				if (Map.onScreen(units[i].x, units[i].y)) {
					units[i].sprite.draw(ctx, (units[i].x - cameraX) * 32, (units[i].y - cameraY) * 32);
				}
			}
		};

		var draw = function(ctx, cameraX, cameraY) {
			drawMovement(ctx, cameraX, cameraY);
			drawUnits(ctx, cameraX, cameraY);
		};

		return {
			unitAt: unitAt,
			selected: null,
			moveState: MoveState.Selecting,
			moveTo: moveTo,
			attack: attack,
			targets: targets,
			draw: draw
		};
	}();

	Map = function() {
		var mainTileSet = makeTileSet(images[0], 3, 3, 32, 32);

		var selectorX = 0;
		var selectorY = 0;
		var selectorArmLength = 5;

		var cameraX = 0;
		var cameraY = 0;
		var sizeDir = +0.3;

		var onScreen = function(x, y) {
			return (x >= cameraX) && (y >= cameraY) && (x < cameraX + 5) && (y < cameraY + 5);
		};

		var drawMap = function(ctx, x, y, map, tileset, cameraX, cameraY) {
			for (var xT = 0; xT < 5; xT++) {
				for (var yT = 0; yT < 5; yT++) {
					tileset[map[yT + cameraY][xT + cameraX]].draw(ctx, x + xT * 32, y + yT * 32);
				}
			}
		};

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

		var drawUnitInfo = function(ctx) {
			var unit = Units.unitAt(selectorX, selectorY);
			if (unit) {
				var drawY = (selectorY - cameraY > 2) ? 0 : 90;
				ctx.fillStyle = Colors.BackgroundBlue;
				ctx.strokeStyle = Colors.TextGrey;
				ctx.fillRect(10, 10 + drawY, 50, 50);
				ctx.rect(10, 10 + drawY, 50, 50);
				ctx.fillStyle = Colors.TextGrey;
				ctx.fillText(unit.name, 10, 20 + drawY);
				ctx.fillText(unit.hp + "/" + unit.maxHp, 10, 30 + drawY);
			}
		};

		var moveSelector = function(x, y) {
			selectorX = clamp(x, 0, 10);
			if (selectorX < cameraX)
				cameraX = selectorX;
			if (selectorX > cameraX + 4)
				cameraX = selectorX - 4;
			selectorY = clamp(y, 0, 10);
			if (selectorY < cameraY)
				cameraY = selectorY;
			if (selectorY > cameraY + 4)
				cameraY = selectorY - 4;
		};

		var step = function() {
			selectorArmLength += sizeDir;
			if (selectorArmLength > 6) sizeDir = -0.3;
			if (selectorArmLength < 4) sizeDir = 0.3;
		};

		var handleInput = function(inputs) {
			for (var idx = 0; idx < inputs.length; idx++) {
				var inp = inputs[idx];
				switch (inp) {
				case Inputs.Left:
					moveSelector(selectorX - 1, selectorY);
					break;
				case Inputs.Right:
					moveSelector(selectorX + 1, selectorY);
					break;
				case Inputs.Up:
					moveSelector(selectorX, selectorY - 1);
					break;
				case Inputs.Down:
					moveSelector(selectorX, selectorY + 1);
					break;
				case Inputs.X:
					Widgets.push(Menu);
					break;
				case Inputs.A:
					switch (Units.moveState) {
						case MoveState.Selecting:
							Units.selected = Units.unitAt(selectorX, selectorY);
							if (Units.selected) {
								Units.oldX = Units.selected.x;
								Units.oldY = Units.selected.y;
								Units.moveState = MoveState.Moving;
							}
							break;
						case MoveState.Moving:
							Units.moveTo(selectorX, selectorY);
							break;
						case MoveState.Attacking:
							Units.attack(Units.unitAt(selectorX, selectorY));
							break;
					}
					break;
				case Inputs.B:
					if (Units.selected) {
						Units.selected.x = Units.oldX;
						Units.selected.y = Units.oldY;
					}
					Units.selected = null;
					Units.moveState = MoveState.Selecting;
					break;
				}
			}
		};

		var draw = function(ctx) {
			drawMap(ctx, 0, 0, mainMap, mainTileSet, cameraX, cameraY);
			Units.draw(ctx, cameraX, cameraY);
			drawSelector(ctx, (selectorX - cameraX) * 32, (selectorY - cameraY) * 32);
			drawUnitInfo(ctx);
		}

		return {
			step: step,
			draw: draw,
			handleInput: handleInput,
			onScreen: onScreen
		};
	}();

	Menu = function () {
		var step = Util.nullFunc;
		var draw = function (ctx) {
			ctx.fillStyle = Colors.BackgroundBlue;;
			ctx.fillRect(10, 10, 120, 120);
			ctx.fillStyle = Colors.TextGrey;
			ctx.fillText("MENU", 30, 30);
		};

		var handleInput = function(inputs) {
			if (inputs.indexOf(Inputs.B) >= 0) {
				Widgets.pop();
			}
		};

		var show = function() {
			Widgets.push(Menu);
		};

		return {
			step: step,
			handleInput: handleInput,
			draw: draw,
			show: show
		};
	}();
	

	// === DO INIT

	var canvas = document.getElementById('tbtgame');
	var ctx = canvas.getContext('2d');

	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.scale(3, 3);

	Widgets.push(Map);

	var mainloop = function() {
		setTimeout(mainloop, 30);
		document.getElementById("mspf").innerHTML = '' + FrameCounter();
		
		// START LOGIC
		Widgets.handleInput(Input.newInputs);
		Widgets.step();

		// END LOGIC
		
		Widgets.draw(ctx);
		Input.tick();
	};
	
	mainloop();
});

