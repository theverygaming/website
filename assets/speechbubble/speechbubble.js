"use strict";

class SpeechBubbleThingy {
    constructor(canvas) {
        this._canvas = canvas;
        this._srcImage = undefined;
        this._params = {};
    }

    loadImage(src, cb) {
        const img = new Image();
        img.src = src;
        this._srcImage = img;
        this._srcImage.onload = () => {
            this.updatePreview();
            cb();
        }
    }

    getParams() {
        return {
            bubbleLength: {
                name: "Bubble length",
                type: "range",
                min: 0,
                max: this._canvas.height - 1,
                step: 1,
                value: this._canvas.height / 8,
            },
            tailAngle: {
                name: "Tail angle (0-1)",
                type: "range",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.35
            },
            tailSpread: {
                name: "Tail spread (deg)",
                type: "range",
                min: 1,
                max: 180,
                step: 1,
                value: 15
            },
            tailX: {
                name: "Tail target X",
                type: "range",
                min: 0,
                max: this._canvas.width-1,
                step: 1,
                value: this._canvas.width/2,
            },
            tailY: {
                name: "Tail target Y",
                type: "range",
                min: 0,
                max: this._canvas.height-1,
                step: 1,
                value: this._canvas.height/2,
            },
        };
    }

    setParams(p) {
        // only update new params
        this._params = {
            ...this._params,
            ...p
        };
        this.updatePreview();
    }

    drawSpeechBubble({bubbleLength = 50, tailAngle = 0.5, tailSpread = 15, tailX = 100, tailY = 300}) {
        // NOTE: I shat this together in a day and almost gave up on the math part lmfao
        // didn't really feel like actually understanding most of the
        // math employed here, I just played with it til it kinda worked :3
        const d2r = (deg) => (deg * Math.PI) / 180;
        const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

        // ensure parameters are sane and things don't explode
        bubbleLength = clamp(bubbleLength, 0, this._canvas.height);
        tailAngle = clamp(tailAngle, 0, 1);
        tailSpread = clamp(tailSpread, 1, 180);
        tailX = clamp(tailX, 0, this._canvas.width-1);
        tailY = clamp(tailY, 0, this._canvas.height-1);

        const ctx = this._canvas.getContext("2d");

        const elcx = this._canvas.width/2; // ellipse center X
        const elcy = 0; // ellipse center Y
        const elxr = bubbleLength; // ellipse X radius
        const elyr = this._canvas.width/2; // ellipse Y radius
        const elr = d2r(90); // ellipse rotation
        const elsa = d2r(180+90); // ellipse start angle
        const elea = d2r(360+90); // ellipse end angle

        function ellipsePoint(cx, cy, rx, ry, phi, theta) {
            return {
                x: cx + rx * Math.cos(theta) * Math.cos(phi) - ry * Math.sin(theta) * Math.sin(phi),
                y: cy + rx * Math.cos(theta) * Math.sin(phi) + ry * Math.sin(theta) * Math.cos(phi),
            };
        }

        const midAngle = ((elea-elsa)*tailAngle)+elsa;
        const halfSpread = d2r(tailSpread/2);
        const a1 = midAngle - halfSpread;
        const a2 = midAngle + halfSpread;
        const p2 = ellipsePoint(elcx, elcy, elxr, elyr, elr, a2);

        ctx.beginPath();

        // first half of ellipse
        ctx.ellipse(elcx, elcy, elxr, elyr, elr, elsa, a1);

        // tail
        ctx.lineTo(tailX, tailY);
        ctx.lineTo(p2.x, p2.y);

        // second half of ellipse
        ctx.ellipse(elcx, elcy, elxr, elyr, elr, a2, elea);

        ctx.closePath();

        // erase below to achieve transparent output (instead of drawing transparent on top..)
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fill();
        ctx.restore();

        // fill
        ctx.fillStyle = "transparent";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    updatePreview() {
        const ctx = this._canvas.getContext("2d");
        if (!this._srcImage) {
            ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            return;
        }
        this._canvas.height = this._srcImage.height;
        this._canvas.width = this._srcImage.width;
        ctx.drawImage(this._srcImage, 0, 0);
        this.drawSpeechBubble(this._params);
    }

    getCanvas() {
        return this._canvas;
    }
}
