Array.prototype.isArray = true; // l33t h4x

var Direction = {
	Right: 0,
	Up: 1,
	Left: 2,
	Down: 3,
};

var Util = function() {
	var nullFunc = function () {};
	var distanceTo = function(x1, y1, x2, y2) {
		return Math.abs(x1 - x2) + Math.abs(y1 - y2);
	};
	var clamp = function(val, min, max) {
		return (val < min) ? min : (val > max) ? max : val;
	};
	var nextInArray = function(array, current, loop) {
		var idx = array.indexOf(current) + 1;
		return array[idx % array.length];
	};
	var getDirection = function(x_from, y_from, x_to, y_to) {
		var xdiff = (x_to - x_from);
		var ydiff = (y_to - y_from);
		if (Math.abs(xdiff) >= Math.abs(ydiff)) 
			return xdiff > 0 ? Direction.Right : Direction.Left;
		else
			return ydiff > 0 ? Direction.Down : Direction.Up;
	};
	return {
		nullFunc: nullFunc,
		distanceTo: distanceTo,
		clamp: clamp,
		nextInArray: nextInArray,
		getDirection: getDirection,
	};
}();

var TileSize = 32;

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
	Width: 6,
	Height: 5
};

var drawImage = function(ctx, x, y) {
	ctx.drawImage(this, x, y);
};

var loadImages = function(images, cb) {
	var count = 0;
	var result = [];
	for (var i = 0; i < images.length; i++) {
		var img = new Image();
		img.draw = drawImage;
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
		var popped = null;
		while (popped != widget)
			popped = widgetStack.pop();
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
	};

	var handleInput = function(inputs) {
		if ((widgetStack.length > 0) && (inputs.length > 0)) {
			widgetStack[widgetStack.length - 1].handleInput(inputs);
		}
	};

	var onStack = function(widget) {
		return widgetStack.indexOf(widget) >= 0;
	};

	return {
		step: step,
		handleInput: handleInput,
		draw: draw,
		push: push,
		pop: pop,
		onStack: onStack,
	};
}();

var Dialog = function () {
	var anim = ['-', '/', '|', '\\'];
	var makeDialog = function (message, after) {
		var chr = '-';
		var handleInput = function (inputs) {
			for (var idx = 0; idx < inputs.length; idx++) {
				switch (inputs[idx]) {
					case Inputs.A:
					case Inputs.B:
						Widgets.pop(this);
						if (after)
							after();
						break;
					case Inputs.X:
						if (!Widgets.onStack(Menu))
							Widgets.push(Menu);
						break;
				}
			}
		};
		var draw = function (ctx) {
			var y = Map.positionBoxY(40);
			ctx.fillStyle = Colors.BackgroundBlue;;
			ctx.fillRect(10, y, 170, 40);
			ctx.fillStyle = Colors.TextGrey;
			ctx.fillText(message + ' ' + chr, 30, y + 20);
		};
		var step = function () {
			chr = Util.nextInArray(anim, chr, true);
		};
		return {
			step: step,
			handleInput: handleInput,
			draw: draw,
		};
	};

	var show = function (message, after) {
		if (!message.isArray) {
			Widgets.push(makeDialog(message, after));
		} else {
			var next = after;
			for (var i = message.length; i > 0; i--) {
				// Introduce a new scope. Godammit, js
				(function () {
					var cont = next;
					var msg = message[i - 1];
					next = function() { Dialog.show(msg, cont); };
				})();
			}
			next();
		}
	};

	return {
		show: show,
	};
}();

var Units;
var Map;
var Menu;

loadImages(["tiles/country.png", 
		"enemy/standing/right.png", "enemy/standing/up.png", "enemy/standing/left.png", "enemy/standing/down.png", 
		"player/standing/right.png", "player/standing/up.png", "player/standing/left.png", "player/standing/down.png", 
		], function (images) {
  Units = function() {
		var units = [];

		var unitAt = function(x, y) {
			for (var i = 0; i < units.length; i++) {
				var unit = units[i];
				if (unit.x == x && unit.y == y) {
					return unit;
				}
			}
			return null;
		};

		var removeUnit = function(unit) {
			var idx = units.indexOf(unit);
			if (idx >= 0) {
				units.splice(idx, 1);
			}
		};

		var moveTo = function(x, y) {
			if (canMoveTo(this, x, y)) {
				if (this.x != x || this.y != y)
					this.facing = Util.getDirection(this.x, this.y, x, y);
				this.x = x;
				this.y = y;
				return true;
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

			if (who != this) {
				this.facing = Util.getDirection(this.x, this.y, who.x, who.y);
				who.hp -= 3;
				if (who.hp <= 0) {
					who.die();
					removeUnit(who);
				}
			}

			return true;
		};

		var inRange = function(unit, x, y) {
			return Util.distanceTo(unit.x, unit.y, x, y) <= unit.moveSpeed; // TODO: terrain mods
		};

		var canMoveTo = function(unit, x, y) {
			return inRange(unit, x, y) && (!unitAt(x, y) || unitAt(x, y) == unit);
		};

		var drawMovement = function(ctx, cameraX, cameraY) {
			if (Units.moveState == MoveState.Moving) {
				ctx.globalAlpha = 0.5;
				ctx.fillStyle = "rgb(187,255,187)";
				for (var y = cameraY; y < cameraY + View.Height; y++) {
					for (var x = cameraX; x < cameraX + View.Width; x++) {
						if (canMoveTo(Units.selected, x, y)) {
							ctx.fillRect((x - cameraX) * TileSize, (y - cameraY) * TileSize, TileSize, TileSize);
						}
					}
				}
				ctx.globalAlpha = 1;
			} else if (Units.moveState == MoveState.Attacking) {
				ctx.fillStyle = "rgb(195,60,60)";
				for (var target = 0; target < Units.currentTargets.length; target++) {
					var enemy = Units.currentTargets[target];
					ctx.fillRect((enemy.x - cameraX) * TileSize, (enemy.y - cameraY) * TileSize, TileSize, TileSize);
				}
			}
		};

		var drawUnits = function(ctx, cameraX, cameraY) {
			for (var i = 0; i < units.length; i++) {
				if (Map.onScreen(units[i].x, units[i].y)) {
					units[i].standingSprite[units[i].facing].draw(ctx, (units[i].x - cameraX) * TileSize, (units[i].y - cameraY) * TileSize);
				}
			}
		};

		var draw = function(ctx, cameraX, cameraY) {
			drawMovement(ctx, cameraX, cameraY);
			drawUnits(ctx, cameraX, cameraY);
		};

		var createUnit = function(unit) {
			unit.moveTo = moveTo;
			unit.attack = attack;
			units.push(unit);
		};

		var spawnSoldier = function(x, y, name) {
			createUnit({ x: x, y: y, standingSprite: images.slice(1,5),
				name: "Soldier" + (name ? " " + name : ""),
				hp: 10,
				maxHp: 10,
				moveSpeed: 2,
				die: function () { Dialog.show(this.name + ": Ergh") },
				facing: Direction.Down,
			});
		};
		spawnSoldier(1, 0, "A");
		spawnSoldier(8, 5, "B");
		spawnSoldier(4, 3, "C");

		createUnit({ x: 3, y: 4, standingSprite: images.slice(5,9),
			name: "Player",
			hp: 7,
			maxHp: 12,
			moveSpeed: 3,
			die: function () { Dialog.show("You died :(", function () { location.reload() }); },
			facing: Direction.Up,
		});


		return {
			unitAt: unitAt,
			selected: null,
			moveState: MoveState.Selecting,
			attack: attack,
			targets: targets,
			draw: draw
		};
	}();

	Map = function() {
		var mainTileSet = makeTileSet(images[0], 3, 3, TileSize, TileSize);

		var selectorX = 0;
		var selectorY = 0;
		var selectorArmLength = 5;

		var cameraX = 0;
		var cameraY = 0;
		var sizeDir = +0.3;

		var onScreen = function(x, y) {
			return (x >= cameraX) && (y >= cameraY) && (x < cameraX + View.Width) && (y < cameraY + View.Height);
		};

		var drawMap = function(ctx, x, y, map, tileset, cameraX, cameraY) {
			for (var xT = 0; xT < View.Width; xT++) {
				for (var yT = 0; yT < View.Height; yT++) {
					tileset[map[yT + cameraY][xT + cameraX]].draw(ctx, x + xT * TileSize, y + yT * TileSize);
				}
			}
		};

		var drawSelector = function(ctx, x, y) {
			var size = selectorArmLength;
			var w = TileSize;
			var h = TileSize;
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
				var drawY = Map.positionBoxY(50);
				ctx.fillStyle = Colors.BackgroundBlue;
				ctx.strokeStyle = Colors.TextGrey;
				ctx.fillRect(10, drawY, 50, 50);
				ctx.rect(10, drawY, 50, 50);
				ctx.fillStyle = Colors.TextGrey;
				ctx.fillText(unit.name, 10, 10 + drawY);
				ctx.fillText(unit.hp + "/" + unit.maxHp, 10, 20 + drawY);
			}
		};

		var moveSelector = function(x, y) {
			selectorX = Util.clamp(x, 0, Map.Width - 1);
			if (selectorX < cameraX)
				cameraX = selectorX;
			if (selectorX >= cameraX + View.Width)
				cameraX = selectorX - View.Width + 1;
			selectorY = Util.clamp(y, 0, Map.Height - 1);
			if (selectorY < cameraY)
				cameraY = selectorY;
			if (selectorY >= cameraY + View.Height)
				cameraY = selectorY - View.Height + 1;
		};

		var step = function() {
			selectorArmLength += sizeDir;
			if (selectorArmLength > 6) sizeDir = -0.3;
			if (selectorArmLength < 4) sizeDir = 0.3;
		};

		var positionBoxY = function(height) {
			return (selectorY - cameraY > View.Height / 2) ? 10 : (TileSize * View.Height) - height - 10;
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
							if (Units.selected.moveTo(selectorX, selectorY)) {
								var targets = Units.targets(Units.selected);
								if (targets.length) {
									Units.moveState = MoveState.Attacking;
									Units.currentTargets = targets;
								} else {
									Units.moveState = MoveState.Selecting;
									Units.selected = null;
								}
							}
							break;
						case MoveState.Attacking:
							if (Units.selected.attack(Units.unitAt(selectorX, selectorY))) {
								Units.selected = null;
								Units.moveState = MoveState.Selecting;
							}
							break;
					}
					break;
				case Inputs.B:
					if (Units.selected) {
						Units.selected.x = Units.oldX;
						Units.selected.y = Units.oldY;
						if (Units.moveState == MoveState.Attacking) {
							Units.moveState = MoveState.Moving;
						} else {
							Units.moveState = MoveState.Selecting;
							Units.selected = null;
						}
					} else {
						Units.selected = null;
						Units.moveState = MoveState.Selecting;
					}
					break;
				}
			}
		};

		var draw = function(ctx) {
			drawMap(ctx, 0, 0, mainMap, mainTileSet, cameraX, cameraY);
			Units.draw(ctx, cameraX, cameraY);
			drawSelector(ctx, (selectorX - cameraX) * TileSize, (selectorY - cameraY) * TileSize);
			drawUnitInfo(ctx);
		}

		return {
			step: step,
			draw: draw,
			handleInput: handleInput,
			onScreen: onScreen,
			positionBoxY: positionBoxY,
			Width: 12,
			Height: 11,
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
				Widgets.pop(Menu);
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
		
		Widgets.handleInput(Input.newInputs);
		Widgets.step();
		Widgets.draw(ctx);
		Input.tick();
	};

	Dialog.show(["X selects units.", 
			"Z goes back.", 
			"Arrows move cursor."]);
	
	mainloop();
});

