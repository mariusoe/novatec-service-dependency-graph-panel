import _ from 'lodash';
import { ServiceDependencyGraphCtrl } from '../service_dependency_graph_ctrl';

interface CyCanvas {
    getCanvas: () => HTMLCanvasElement;
    clear: (CanvasRenderingContext2D) => void;
    resetTransform: (CanvasRenderingContext2D) => void;
    setTransform: (CanvasRenderingContext2D) => void;
}

export default class CanvasDrawer {

    readonly particleAsset: string = '/public/plugins/novatec-service-dependency-graph-panel/assets/particle.png';

    readonly colors = {
        background: '#212121'
    };

    controller: ServiceDependencyGraphCtrl;

    cytoscape: cytoscape.Core;

    context: CanvasRenderingContext2D;

    cyCanvas: CyCanvas;

    canvas: HTMLCanvasElement;

    offscreenCanvas: HTMLCanvasElement;

    offscreenContext: CanvasRenderingContext2D;

    frameCounter: number = 0;

    fpsCounter: number = 0;

    edgeParticles: any = [];

    particleImage: HTMLImageElement;

    pixelRatio: number;

    imageAssets = {};

    selectionNeighborhood: cytoscape.Collection;

    constructor(ctrl: ServiceDependencyGraphCtrl, cy: cytoscape.Core, cyCanvas: CyCanvas) {
        this.cytoscape = cy;
        this.cyCanvas = cyCanvas;
        this.controller = ctrl;

        this.pixelRatio = window.devicePixelRatio || 1;

        this.canvas = cyCanvas.getCanvas();
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            this.context = ctx;
        } else {
            console.error("Could not get 2d canvas context.");
        }

        //this._preloadImages();

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenContext = <CanvasRenderingContext2D>this.offscreenCanvas.getContext('2d');
    }

    _loadImage(imageUrl: string, assetName: string) {
        const that = this;

        const loadImage = (url, asset) => {
            const image = new Image();
            that.imageAssets[asset] = {
                image,
                loaded: false
            };

            return new Promise((resolve, reject) => {
                // const img = new Image();
                image.onload = () => resolve(asset);
                image.onerror = () => reject(new Error(`load ${url} fail`));
                image.src = url;
            });
        };
        loadImage(imageUrl, assetName)
            .then((asset: string) => {
                that.imageAssets[asset].loaded = true;
            });
    }

    _isImageLoaded(assetName: string) {
        if (_.has(this.imageAssets, assetName) && this.imageAssets[assetName].loaded) {
            return true;
        } else {
            return false;
        }
    }

    _getImageAsset(assetName) {
        if (!_.has(this.imageAssets, assetName)) {
            //const assetUrl = this.controller.getTypeSymbol(assetName);
            this._loadImage('/public/plugins/novatec-service-dependency-graph-panel/assets/database.png', assetName);
        }

        if (this._isImageLoaded(assetName)) {
            return <HTMLImageElement>this.imageAssets[assetName].image;
        } else {
            return null;
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
        const offscreenCanvas = this.offscreenCanvas;
        const offscreenContext = this.offscreenContext;

        offscreenCanvas.width = this.canvas.width;
        offscreenCanvas.height = this.canvas.height;

        // offscreen rendering
        this._setTransformation(offscreenContext);

        this.selectionNeighborhood = this.cytoscape.collection();
        const selection = this.cytoscape.$(':selected');
        selection.forEach(element => {
            if (element.isNode()) {
                this.selectionNeighborhood.merge(element);

                const neighborhood = element.neighborhood();
                this.selectionNeighborhood.merge(neighborhood);
            }
        });

        this._drawEdgeAnimation(offscreenContext);
        this._drawNodes(offscreenContext);

        // static element rendering
        // cyCanvas.resetTransform(ctx);
        cyCanvas.clear(ctx);

        this._drawDebugInformation();

        if (offscreenCanvas.width > 0 && offscreenCanvas.height > 0)
            ctx.drawImage(offscreenCanvas, 0, 0);
    }

    _setTransformation(ctx: CanvasRenderingContext2D) {
        const pan = this.cytoscape.pan();
        const zoom = this.cytoscape.zoom();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(pan.x * this.pixelRatio, pan.y * this.pixelRatio);
        ctx.scale(zoom * this.pixelRatio, zoom * this.pixelRatio);
    }

    _drawEdgeAnimation(ctx: CanvasRenderingContext2D) {
        const that = this;
        const now = Date.now();

        ctx.save();
        ctx.beginPath();

        let index = this.edgeParticles.length - 1;
        while (index >= 0) {
            const particle = this.edgeParticles[index];
            const edge: cytoscape.EdgeSingular = particle.edge;

            if (that.selectionNeighborhood.empty() || that.selectionNeighborhood.has(edge)) {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.25;
            }

            const sourcePoint = edge.sourceEndpoint();
            const targetPoint = edge.targetEndpoint();

            const xVelocity = targetPoint.x - sourcePoint.x;
            const yVelocity = targetPoint.y - sourcePoint.y;

            var angle = Math.atan2(yVelocity, xVelocity);
            var xDirection = Math.cos(angle);
            var yDirection = Math.sin(angle);

            const timeDelta = now - particle.startTime;
            const xPos = sourcePoint.x + (xDirection * timeDelta * particle.velocity);
            const yPos = sourcePoint.y + (yDirection * timeDelta * particle.velocity);

            if (xPos > Math.max(sourcePoint.x, targetPoint.x) || xPos < Math.min(sourcePoint.x, targetPoint.x)
                || yPos > Math.max(sourcePoint.y, targetPoint.y) || yPos < Math.min(sourcePoint.y, targetPoint.y)) {
                this.edgeParticles.splice(index, 1);
            } else {
                // draw particle
                that._drawParticle(ctx, xPos, yPos);
            }

            index--;
        };

        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.restore();
    }

    _drawParticle(ctx: CanvasRenderingContext2D, xPos, yPos) {
        ctx.moveTo(xPos, yPos);
        ctx.arc(xPos, yPos, 1, 0, 2 * Math.PI, false);
    }

    _drawNodes(ctx: CanvasRenderingContext2D) {
        const that = this;
        const cy = this.cytoscape;

        // Draw model elements
        cy.nodes().forEach(function (node: cytoscape.NodeSingular) {
            if (that.selectionNeighborhood.empty() || that.selectionNeighborhood.has(node)) {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.4;
            }

            // draw the node
            that._drawNode(ctx, node);

            // drawing the node label in case we are not zoomed out
            if (cy.zoom() > 1) {
                that._drawNodeLabel(ctx, node);
            }
        });
    }

    _drawNode(ctx: CanvasRenderingContext2D, node: cytoscape.NodeSingular) {
        const type = node.data('type');

        if (type === 'service') {
            const healthyPct = node.data('healthyPct');
            const errorPct = node.data('errorPct');

            // drawing the donut
            this._drawDonut(ctx, node, 15, 5, 0.5, [healthyPct, 0, errorPct])
        } else {
            this._drawExternalService(ctx, node);
        }
    }

    _drawExternalService(ctx: CanvasRenderingContext2D, node: cytoscape.NodeSingular) {
        const pos = node.position();
        const cX = pos.x;
        const cY = pos.y;
        const size = 12;

        ctx.beginPath();
        ctx.arc(cX, cY, 12, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cX, cY, 11.5, 0, 2 * Math.PI, false);
        ctx.fillStyle = this.colors.background;
        ctx.fill();

        const nodeType = node.data('type');
        //const image = this.controller.getTypeSymbol(nodeType);
        const image = this._getImageAsset(nodeType);
        if (image != null) {
            ctx.drawImage(image, cX - size / 2, cY - size / 2, size, size);
        }
    }

    _drawNodeLabel(ctx: CanvasRenderingContext2D, node: cytoscape.NodeSingular) {
        const pos = node.position();
        let label: string = node.id();
        const labelPadding = 1;

        if (label.length > 20) {
            label = label.substr(0, 7) + '...' + label.slice(-7);
        }

        ctx.font = '6px Arial';

        const labelWidth = ctx.measureText(label).width;
        const xPos = pos.x - labelWidth / 2;
        const yPos = pos.y + node.height() * 0.8;

        ctx.fillStyle = '#bad5ed';
        ctx.fillRect(xPos - labelPadding, yPos - 6 - labelPadding, labelWidth + 2 * labelPadding, 6 + 2 * labelPadding);

        ctx.fillStyle = this.colors.background;
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

    _drawDonut(ctx: CanvasRenderingContext2D, node: cytoscape.NodeSingular, radius, width, strokeWidth, percentages) {
        const cX = node.position().x;
        const cY = node.position().y;

        let currentArc = -Math.PI / 2; // offset

        ctx.beginPath();
        ctx.arc(cX, cY, radius + strokeWidth, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();

        const colors = ['#5794f2', 'orange', '#b82424'];
        for (let i = 0; i < percentages.length; i++) {
            let arc = this._drawArc(ctx, currentArc, cX, cY, radius, percentages[i], colors[i]);
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
            ctx.fillStyle = this.colors.background;
        }
        ctx.fill();
        // ctx.clip();
        // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // ctx.restore();
    }

    _drawArc(ctx: CanvasRenderingContext2D, currentArc, cX, cY, radius, percent, color) {
        // calc size of our wedge in radians
        var WedgeInRadians = percent * 360 * Math.PI / 180;
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
