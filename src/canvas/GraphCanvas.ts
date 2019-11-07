interface CyCanvas {
    getCanvas: () => HTMLCanvasElement;
    clear: (CanvasRenderingContext2D) => void;
    resetTransform: (CanvasRenderingContext2D) => void;
    setTransform: (CanvasRenderingContext2D) => void;
}

export default class CanvasDrawer {

    cytoscape: cytoscape.Core;

    context: CanvasRenderingContext2D;

    cyCanvas: CyCanvas;

    canvas: HTMLCanvasElement;

    frameCounter: number = 0;

    constructor(cy: cytoscape.Core, cyCanvas: CyCanvas) {
        this.cytoscape = cy;
        this.cyCanvas = cyCanvas;

        this.canvas = cyCanvas.getCanvas();
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            this.context = ctx;
        } else {
            console.error("Could not get 2d canvas context.");
        }
    }

    startAnimation() {
        console.log("Start graph animation");

        const that = this;
        const repaintWrapper = () => {
            that.repaint();
            window.requestAnimationFrame(repaintWrapper);
        }

        window.requestAnimationFrame(repaintWrapper);
    }

    repaint() {
        const ctx = this.context;
        const cyCanvas = this.cyCanvas;

        cyCanvas.clear(ctx);

        // dynamic element rendering
        cyCanvas.setTransform(ctx);

        this._drawNodes();

        // static element rendering
        cyCanvas.resetTransform(ctx);

        this._drawFrameCounter();
    }

    _drawNodes() {
        const that = this;
        const ctx = this.context;
        const cy = this.cytoscape;

        // Draw model elements
        cy.nodes().forEach(function (node) {
            // debugger;
            const pos = node.position();
            // ctx.beginPath();
            // ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI, false);
            // ctx.fill();

            that._drawDonut(pos.x, pos.y, 15, 5, 0.5, [60, 10, 30])

            if (cy.zoom() > 1) {
                ctx.fillText(node.id(), pos.x, pos.y);
            }
        });
    }

    _drawFrameCounter() {
        const ctx = this.context;

        this.frameCounter++;

        ctx.font = 'bold 30px serif';
        ctx.fillStyle = 'red';
        ctx.fillText(String(this.frameCounter), 10, 40);
    }

    _drawDonut(cX, cY, radius, width, strokeWidth, percentages) {
        const ctx = this.context;

        let currentArc = -Math.PI / 2; // offset

        ctx.beginPath();
        ctx.arc(cX, cY, radius + strokeWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();

        const colors = ['green', 'orange', 'red'];
        for (let i = 0; i < percentages.length; i++) {
            let arc = this._drawArc(currentArc, cX, cY, radius, percentages[i], colors[i]);
            currentArc += arc;
        }

        ctx.beginPath();
        ctx.arc(cX, cY, radius - width, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();

        // // cut out an inner-circle == donut
        ctx.beginPath();
        // ctx.moveTo(100, 100);
        // ctx.fillStyle=gradient;
        ctx.arc(cX, cY, radius - width - strokeWidth, 0, 2 * Math.PI, false);

        ctx.save();
        ctx.clip();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    _drawArc(currentArc, cX, cY, radius, percent, color) {
        const ctx = this.context;
        
        // calc size of our wedge in radians
        var WedgeInRadians = percent / 100 * 360 * Math.PI / 180;
        // draw the wedge
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cX, cY);
        ctx.arc(cX, cY, radius, currentArc, currentArc + WedgeInRadians, false);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        // sum the size of all wedges so far
        // We will begin our next wedge at this sum
        return WedgeInRadians;
    }
};
