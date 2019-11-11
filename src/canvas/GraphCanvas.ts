import _ from 'lodash';

interface CyCanvas {
    getCanvas: () => HTMLCanvasElement;
    clear: (CanvasRenderingContext2D) => void;
    resetTransform: (CanvasRenderingContext2D) => void;
    setTransform: (CanvasRenderingContext2D) => void;
}

export default class CanvasDrawer {

    readonly particleAsset: string = '/public/plugins/novatec-service-dependency-graph-panel/assets/particle.png';

    cytoscape: cytoscape.Core;

    context: CanvasRenderingContext2D;

    cyCanvas: CyCanvas;

    canvas: HTMLCanvasElement;

    frameCounter: number = 0;

    fpsCounter: number = 0;

    edgeParticles: any = [];

    particleImage: HTMLImageElement;

    constructor(cy: cytoscape.Core, cyCanvas: CyCanvas) {

        this.cytoscape = cy;
        this.cyCanvas = cyCanvas;

        this.canvas = cyCanvas.getCanvas();
        const ctx = this.canvas.getContext("2d", { alpha: false });
        if (ctx) {
            this.context = ctx;
        } else {
            console.error("Could not get 2d canvas context.");
        }

        this._preloadImages();
    }

    _preloadImages() {
        const that = this;

        const loadImage = url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`load ${url} fail`));
                img.src = url;
            });
        };
        loadImage(this.particleAsset).then((image) => {
            that.particleImage = <HTMLImageElement>image;
        });
    }

    startAnimation() {
        console.log("Start graph animation");

        const that = this;
        const repaintWrapper = () => {
            that.repaint();
            window.requestAnimationFrame(repaintWrapper);
        }

        window.requestAnimationFrame(repaintWrapper);

        setInterval(() => that._spawnParticles(), 100);
        setInterval(() => {
            that.fpsCounter = that.frameCounter;
            that.frameCounter = 0;
        }, 1000);
    }

    _spawnParticles() {
        const cy = this.cytoscape;
        const that = this;

        const now = Date.now();

        cy.edges().forEach(edge => {
            for (let i = 0; i < 1; i++) {
                that.edgeParticles.push({
                    edge,
                    velocity: 0.05 + (Math.random() * 0.05),
                    startTime: now
                });
            }
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

        ctx.beginPath();

        let index = this.edgeParticles.length - 1;
        while (index >= 0) {
            // this.edgeParticles.forEach((particle, index, particleArray) => {
            const particle = this.edgeParticles[index];
            const edge: cytoscape.EdgeSingular = particle.edge;

            const sourcePoint = edge.sourceEndpoint();
            const targetPoint = edge.targetEndpoint();

            const xVelocity = targetPoint.x - sourcePoint.x;
            const yVelocity = targetPoint.y - sourcePoint.y;

            var angle = Math.atan2(yVelocity, xVelocity);
            var xDirection = Math.cos(angle);
            var yDirection = Math.sin(angle);

            const timeDelta = now - particle.startTime;
            const xPos = edge.sourceEndpoint().x + (xDirection * timeDelta * particle.velocity);
            const yPos = edge.sourceEndpoint().y + (yDirection * timeDelta * particle.velocity);

            if (xPos > Math.max(edge.sourceEndpoint().x, edge.targetEndpoint().x) || xPos < Math.min(edge.sourceEndpoint().x, edge.targetEndpoint().x)
                || yPos > Math.max(edge.sourceEndpoint().y, edge.targetEndpoint().y) || yPos < Math.min(edge.sourceEndpoint().y, edge.targetEndpoint().y)) {
                this.edgeParticles.splice(index, 1);
            } else {
                // draw particle
                that._drawParticle(xPos, yPos);
            }

            index--;
        };

        ctx.fillStyle = 'white';
        ctx.fill();
    }

    _drawParticle(xPos, yPos) {
        const ctx = this.context;
        const size = 2;

        // if (this.particleImage) {
        //     ctx.drawImage(this.particleImage, xPos - size / 2, yPos - size / 2, size, size);
        // } else {
        ctx.moveTo(xPos, yPos);
        ctx.arc(xPos, yPos, 1, 0, 2 * Math.PI, false);
        // }
    }

    _drawNodes() {
        const that = this;
        const ctx = this.context;
        const cy = this.cytoscape;

        // Draw model elements
        cy.nodes().forEach(function (node) {
            // drawing the donut
            that._drawDonut(node, 15, 5, 0.5, [60, 10, 30])

            // drawing the node label in case we are not zoomed out
            if (cy.zoom() > 1) {
                that._drawNodeLabel(node);
            }
        });
    }

    _drawNodeLabel(node) {
        const ctx = this.context;
        const pos = node.position();
        const label = node.id();
        const labelPadding = 1;

        ctx.font = '6px Arial';

        const labelWidth = ctx.measureText(label).width;
        const xPos = pos.x - labelWidth / 2;
        const yPos = pos.y + node.height() * 0.8;

        ctx.fillStyle = '#bad5ed';
        ctx.fillRect(xPos - labelPadding, yPos - 6 - labelPadding, labelWidth + 2 * labelPadding, 6 + 2 * labelPadding);

        ctx.fillStyle = '#212121';
        ctx.fillText(label, xPos, yPos);
    }

    _drawDebugInformation() {
        const ctx = this.context;

        this.frameCounter++;

        ctx.font = '12px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText("Frames per Second: " + this.fpsCounter, 10, 12);
        ctx.fillText("Particles: " + this.edgeParticles.length, 10, 24);
    }

    _drawDonut(node, radius, width, strokeWidth, percentages) {
        const ctx = this.context;
        const cX = node.position().x;
        const cY = node.position().y;

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
        //ctx.save();
        ctx.beginPath();
        ctx.arc(cX, cY, radius - width - strokeWidth, 0, 2 * Math.PI, false);
        if (node.selected()) {
            ctx.fillStyle = 'red';
        } else {
            ctx.fillStyle = '#212121';
        }
        ctx.fill();
        // ctx.clip();
        // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // ctx.restore();
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
