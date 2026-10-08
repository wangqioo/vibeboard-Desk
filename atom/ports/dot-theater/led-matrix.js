/* sallar/led-matrix 1.0.1, MIT; see LICENSE. Unmodified compiled class in a browser export wrapper. */
(function(){var exports={};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_OPTS = {
    x: 32,
    y: 16,
    pixelWidth: 10,
    pixelHeight: 10,
    margin: 4,
    glow: false,
    animated: false
};
var LedMatrix = (function () {
    function LedMatrix(canvas, opts) {
        if (opts === void 0) { opts = {}; }
        this.data = [];
        this.offset = 0;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.opts = Object.assign({}, DEFAULT_OPTS, opts);
        this.setup();
    }
    LedMatrix.prototype.setup = function () {
        var width = this.opts.x * (this.opts.pixelWidth + this.opts.margin);
        var height = this.opts.y * (this.opts.pixelHeight + this.opts.margin);
        this.canvas.width = width;
        this.canvas.height = height;
        if (typeof this.canvas.style === 'object') {
            this.canvas.style.width = width / 2 + "px";
            this.canvas.style.height = height / 2 + "px";
        }
    };
    LedMatrix.prototype.render = function () {
        if (this.rAF) {
            cancelAnimationFrame(this.rAF);
        }
        this.clear();
        this.draw();
    };
    LedMatrix.prototype.draw = function () {
        var _a = this.opts, pixelWidth = _a.pixelWidth, pixelHeight = _a.pixelHeight, margin = _a.margin, x = _a.x, y = _a.y, glow = _a.glow, animated = _a.animated;
        var pixels = x * y;
        if (this.data.length !== pixels) {
            throw new Error('`data` needs to be provided fully. Length is insufficient.');
        }
        for (var i = 0; i < pixels; i += 1) {
            var _b = this.data[i], on = _b.on, color = _b.color;
            var rgba = on
                ? "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")"
                : 'rgba(0,0,0,.1)';
            var dy = Math.floor(i / x);
            var dx = i - dy * x;
            if (animated) {
                dx -= this.offset;
                dx = dx < 0 ? x - 1 - Math.abs(dx) : dx;
            }
            if (glow && on) {
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = rgba;
            }
            else {
                this.ctx.shadowBlur = 0;
            }
            this.ctx.fillStyle = rgba;
            this.ctx.fillRect(dx * (pixelWidth + margin), dy * (pixelHeight + margin), pixelWidth, pixelHeight);
        }
        if (animated) {
            this.animate();
        }
    };
    LedMatrix.prototype.animate = function () {
        var _this = this;
        this.offset += 1;
        if (this.offset >= this.opts.x) {
            this.offset = 0;
        }
        this.rAF = requestAnimationFrame(function () {
            _this.clear();
            _this.draw();
        });
    };
    LedMatrix.prototype.clear = function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };
    LedMatrix.prototype.setNewOptions = function (opts) {
        this.opts = Object.assign({}, this.opts, opts);
        this.setup();
    };
    LedMatrix.prototype.setData = function (data) {
        this.data = data;
    };
    return LedMatrix;
}());
exports.LedMatrix = LedMatrix;

window.LedMatrix=exports.LedMatrix;})();
