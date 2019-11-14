import CanvasDrawer from "./GraphCanvas";
import _ from 'lodash';
import { Particle, Particles } from './Particle';

export default class ParticleEngine {

    drawer: CanvasDrawer;

    maxVolume: number = 1000;

    minSpawnPropability: number = 0.01;

    spawnInterval: number | null;

    constructor(canvasDrawer: CanvasDrawer) {
        this.drawer = canvasDrawer;
    }

    start() {
        if (!this.spawnInterval) {
            const that = this;
            this.spawnInterval = setInterval(() => that._spawnParticles(), 100);
        }
    }

    stop() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
    }

    _spawnParticles() {
        const cy = this.drawer.cytoscape;

        const now = Date.now();

        cy.edges().forEach(edge => {
            let particles: Particles = edge.data('particles');
            const metrics = edge.data('metrics');

            if (!metrics) {
                return;
            }

            const volume = Math.max(0, metrics.normal) + Math.max(0, metrics.danger);

            let errorRate;
            if (metrics.normal >= 0 && metrics.danger >= 0) {
                errorRate = metrics.danger / (metrics.normal + metrics.danger);
            } else {
                errorRate = 0;
            }

            if (particles === undefined) {
                particles = {
                    normal: [],
                    danger: []
                };
                edge.data('particles', particles);
            }

            if (metrics && volume > 0) {
                const spawnPropability = Math.min(volume / this.maxVolume, 1.0);

                for (let i = 0; i < 5; i++) {
                    if (Math.random() <= spawnPropability + this.minSpawnPropability) {
                        const particle: Particle = {
                            velocity: 0.05 + (Math.random() * 0.05),
                            startTime: now
                        };

                        if (Math.random() < errorRate) {
                            particles.danger.push(particle);
                        } else {
                            particles.normal.push(particle);
                        }
                    }
                }
            }
        });
    }

    count() {
        const cy = this.drawer.cytoscape;

        return _(cy.edges())
            .map(edge => edge.data('particles'))
            .filter()
            .map(particleArray => particleArray.normal.length)
            .sum()
            +
            _(cy.edges())
                .map(edge => edge.data('particles'))
                .filter()
                .map(particleArray => particleArray.danger.length)
                .sum();
    }
}