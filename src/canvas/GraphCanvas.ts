import _ from 'lodash';

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

    edgeParticles: any = [];

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

        setInterval(() => that._spawnParticles(), 1000);
    }

    _spawnParticles() {
        console.log("Spawn particles");

        const cy = this.cytoscape;
        const that = this;

        const now = Date.now();

        cy.edges().forEach(edge => {
            that.edgeParticles.push({
                edge,
                velocity: 0.1,
                startTime: now
            });
        });
    }

    repaint() {
        const ctx = this.context;
        const cyCanvas = this.cyCanvas;

        // static element rendering
        cyCanvas.resetTransform(ctx);
        cyCanvas.clear(ctx);

        this._drawDebugInformation();

        // dynamic element rendering
        cyCanvas.setTransform(ctx);

        this._drawEdgeAnimation();
        this._drawNodes();
    }

    _drawEdgeAnimation() {
        const that = this;
        const ctx = this.context;
        const cy = this.cytoscape;

        const now = Date.now();

        this.edgeParticles.forEach((particle, index, particleArray) => {
            const edge : cytoscape.EdgeSingular = particle.edge;
            
            const sourcePoint = edge.sourceEndpoint();
            const targetPoint = edge.targetEndpoint();

            const xVelocity = targetPoint.x - sourcePoint.x;
            const yVelocity = targetPoint.y - sourcePoint.y;

            var angle = Math.atan2(yVelocity, xVelocity);
            var xDirection = Math.cos(angle) ;
            var yDirection = Math.sin(angle) ;

            const timeDelta = now - particle.startTime;
            const xPos = edge.sourceEndpoint().x + (xDirection * timeDelta * particle.velocity);
            const yPos = edge.sourceEndpoint().y + (yDirection * timeDelta * particle.velocity);

            ctx.beginPath();
           ctx.arc(xPos, yPos, 1, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'white';
            ctx.fill();
            // debugger;
        });
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

    _drawDebugInformation() {
        const ctx = this.context;

        this.frameCounter++;

        ctx.font = 'bold 30px serif';
        ctx.fillStyle = 'red';
        ctx.fillText("Frames: " + this.frameCounter, 10, 40);
        ctx.fillText("Particles: " + this.edgeParticles.length, 10, 70);
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
        ctx.save();
        ctx.beginPath();
        ctx.arc(cX, cY, radius - width - strokeWidth, 0, 2 * Math.PI, false);
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
