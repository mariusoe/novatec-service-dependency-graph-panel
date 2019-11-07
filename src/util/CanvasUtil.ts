export default class CanvasDrawer {

    ctx: CanvasRenderingContext2D;

    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            this.ctx = ctx;
        } else {
            console.error("Could not get 2d canvas context.");
        }
    }

    drawDonut(cX, cY, radius, width, strokeWidth, percentages) {
        let currentArc = -Math.PI / 2; // offset

        this.ctx.beginPath();
        this.ctx.arc(cX, cY, radius + strokeWidth, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();

        const colors = ['green', 'orange', 'red'];
        for (let i = 0; i < percentages.length; i++) {
            let arc = this._drawArc(currentArc, cX, cY, radius, percentages[i], colors[i]);
            currentArc += arc;
        }

        this.ctx.beginPath();
        this.ctx.arc(cX, cY, radius - width, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();

        // // cut out an inner-circle == donut
        this.ctx.beginPath();
        // ctx.moveTo(100, 100);
        // ctx.fillStyle=gradient;
        this.ctx.arc(cX, cY, radius - width - strokeWidth, 0, 2 * Math.PI, false);

        this.ctx.save();
        this.ctx.clip();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    _drawArc(currentArc, cX, cY, radius, percent, color) {
        // calc size of our wedge in radians
        var WedgeInRadians = percent / 100 * 360 * Math.PI / 180;
        // draw the wedge
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(cX, cY);
        this.ctx.arc(cX, cY, radius, currentArc, currentArc + WedgeInRadians, false);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.restore();
        // sum the size of all wedges so far
        // We will begin our next wedge at this sum
        return WedgeInRadians;
    }
};
