import CanvasDrawer from "./GraphCanvas";

export default class ParticleEngine {

    drawer: CanvasDrawer;
    
    edgeParticles: any = [];

    constructor(canvasDrawer: CanvasDrawer) {
        this.drawer = canvasDrawer;
    }

    start() {
        const that = this;

        setInterval(() => that._spawnParticles(), 100);
    }

    _spawnParticles() {
        const cy = this.drawer.cytoscape;
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
}