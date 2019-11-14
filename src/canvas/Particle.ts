export interface Particle {
    velocity: number;
    startTime: number;
}

export interface Particles {
    normal: Particle[];
    danger: Particle[];
}