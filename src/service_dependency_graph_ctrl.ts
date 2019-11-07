import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import _ from 'lodash';
import { optionsTab } from './options_ctrl';
import './css/novatec-service-dependency-graph-panel.css';
import PreProcessor from './data/PreProcessor';

// import GraphGenerator from './graph/GraphGenerator'

import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cola from 'cytoscape-cola';
import popper from 'cytoscape-popper';

import cyCanvas from 'cytoscape-canvas';

cyCanvas(cytoscape); // Register extension

cytoscape.use(popper);
cytoscape.use(cola);
cytoscape.use(coseBilkent);

export class ServiceDependencyGraphCtrl extends MetricsPanelCtrl {

	static templateUrl = 'partials/module.html';

	panelDefaults = {
		dataMapping: {
			sourceComponentPrefix: "origin_",
			targetComponentPrefix: "target_",
			responseTimeColumn: "response-time",
			requestRateColumn: "request-rate",
			errorRateColumn: "error-rate",
			responseTimeOutgoingColumn: "response-time-out",
			requestRateOutgoingColumn: "request-rate-out",
			errorRateOutgoingColumn: "error-rate-out",

			extOrigin: 'external_origin',
			extTarget: 'external_target',
			type: 'type'
		},
		sdgStyle: {
			healthyColor: 'rgb(87, 148, 242)',
			dangerColor: 'rgb(184, 36, 36)'
		},
		sdgSettings: {
			sumTimings: false,
			showConnectionStats: true,
			layout: 'ltrTree',
			maxVolume: 10000,
			filterEmptyConnections: true,
			externalIcons: [
				{
					type: 'web',
					icon: 'web'
				},
				{
					type: 'jms',
					icon: 'message'
				},
				{
					type: 'database',
					icon: 'database'
				},
				{
					type: 'http',
					icon: 'http'
				}
			]
		}
	};

	vizceral: any;

	currentData: any;

	currentGraphNodes: Array<string> = [];

	zoomLevel: number;

	cy: any;

	dummy: boolean = false;

	popA: any;

	/** @ngInject */
	constructor($scope, $injector) {
		super($scope, $injector);

		_.defaultsDeep(this.panel, this.panelDefaults);

		this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
		this.events.on('component-did-mount', this.onRender.bind(this));
		this.events.on('refresh', this.onRefresh.bind(this));
		this.events.on('render', this.onRender.bind(this));
		this.events.on('data-received', this.onDataReceived.bind(this));
		this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
	}

	zoom(zoom) {
		// const zoomStep = 0.1 * zoom;
		// const nextZoomLevel = Math.min(Math.max(this.zoomLevel + zoomStep, 0.1), 2);

		// if (this.vizceral) {
		// 	console.log("Current:", this.zoomLevel, "New:", nextZoomLevel);
		// 	this.zoomLevel = nextZoomLevel;
		// 	this.vizceral.setZoom(this.zoomLevel);
		// }
		console.log("zoom");

		let id = "x" + Math.random();

		this.cy.add([
			{
				group: 'nodes',
				data: { id }
			},
			{
				group: 'edges',
				data: { id: "e" + id, source: 'a', target: id }
			}
		]);
	}

	dataAvailable() {
		//return this.currentData != null && _.has(this.currentData, 'data') && this.currentData.data.length > 0;
		return true;
	}

	updateSDGStyle() {
		if (this.vizceral) {
			this.vizceral.updateStyles({
				colorText: 'rgb(214, 214, 214)',
				colorTextDisabled: 'rgb(129, 129, 129)',
				colorTraffic: {
					healthy: this.panel.sdgStyle.healthyColor,
					normal: 'rgb(186, 213, 237)',
					normalDonut: 'rgb(91, 91, 91)',
					warning: 'rgb(268, 185, 73)',
					danger: this.panel.sdgStyle.dangerColor
				},
				colorNormalDimmed: 'rgb(101, 117, 128)',
				colorBackgroundDark: 'rgb(35, 35, 35)',
				colorLabelBorder: 'rgb(16, 17, 18)',
				colorLabelText: 'rgb(0, 0, 0)',
				colorDonutInternalColor: 'rgb(35, 35, 35)',
				colorDonutInternalColorHighlighted: 'rgb(255, 255, 255)',
				colorConnectionLine: 'rgb(255, 255, 255)',
				colorPageBackground: 'rgb(45, 45, 45)',
				colorPageBackgroundTransparent: 'rgba(45, 45, 45, 0)',
				colorBorderLines: 'rgb(137, 137, 137)',
				colorArcBackground: 'rgb(60, 60, 60)'
			});

			this.render();
		}
	}

	forceRender() {
		this.vizceral = null;
		this.render();
	}

	onObjectHighlighted(object) {
		//TODO handle event
	}

	onRender(payload) {
		console.log("render");

		if (!this.cy) {

			console.log("cyto");


			this.cy = cytoscape({
				container: document.getElementById('nt-sdg-container'), // container to render in
				elements: [ // list of graph elements to start with
					{ // node a
						data: { id: 'a' }
					},
					{ // node b
						data: { id: 'b' }
					},
					{ // node b
						data: { id: 'c' }
					},
					{ // node b
						data: { id: 'd' }
					},
					{ // edge ab
						data: { id: 'ab', source: 'a', target: 'b' }
					},
					{ // edge ab
						data: { id: 'bc', source: 'b', target: 'c' }
					},
					{ // edge ab
						data: { id: 'ac', source: 'a', target: 'c' }
					},
					{ // edge ab
						data: { id: 'ad', source: 'a', target: 'd' }
					},
					{ // edge ab
						data: { id: 'bd', source: 'b', target: 'd' }
					},
					{ // edge ab
						data: { id: 'cd', source: 'c', target: 'd' }
					}
				],
				style: [
					{
						"selector": "node[label]",
						"style": {
							"label": "data(label)"
						}
					},
					{
						"selector": "edge",
						"style": {
							"width": "1"
						}
					},

					{
						"selector": "edge[label]",
						"style": {
							"label": "data(label)",
							"width": 1
						}
					},

					{
						"selector": ".top-left",
						"style": {
							"text-valign": "top",
							"text-halign": "left"
						}
					},

					{
						"selector": ".top-center",
						"style": {
							"text-valign": "top",
							"text-halign": "center"
						}
					},

					{
						"selector": ".top-right",
						"style": {
							"text-valign": "top",
							"text-halign": "right"
						}
					},

					{
						"selector": ".center-left",
						"style": {
							"text-valign": "center",
							"text-halign": "left"
						}
					},

					{
						"selector": ".center-center",
						"style": {
							"text-valign": "center",
							"text-halign": "center"
						}
					},

					{
						"selector": ".center-right",
						"style": {
							"text-valign": "center",
							"text-halign": "right"
						}
					},

					{
						"selector": ".bottom-left",
						"style": {
							"text-valign": "bottom",
							"text-halign": "left"
						}
					},

					{
						"selector": ".bottom-center",
						"style": {
							"text-valign": "bottom",
							"text-halign": "center"
						}
					},

					{
						"selector": ".bottom-right",
						"style": {
							"text-valign": "bottom",
							"text-halign": "right"
						}
					},

					{
						"selector": ".multiline-manual",
						"style": {
							"text-wrap": "wrap"
						}
					},

					{
						"selector": ".multiline-auto",
						"style": {
							"text-wrap": "wrap",
							"text-max-width": 80
						}
					},

					{
						"selector": ".autorotate",
						"style": {
							"edge-text-rotation": "autorotate"
						}
					},

					{
						"selector": ".background",
						"style": {
							"text-background-opacity": 1,
							"color": "#fff",
							"text-background-color": "#888",
							"text-background-shape": "roundrectangle",
							"text-border-color": "#000",
							"text-border-width": 1,
							"text-border-opacity": 1,
							"text-valign": "bottom",
							"text-halign": "center"
						}
					},

					{
						"selector": ".outline",
						"style": {
							"color": "#fff",
							"text-outline-color": "#888",
							"text-outline-width": 3
						}
					}
				],

				layout: {
					name: 'grid',
					rows: 1
				}
			});

			const layer = this.cy.cyCanvas({
				zIndex: 1
			});
			const canvas = layer.getCanvas();
			const ctx = canvas.getContext("2d");

			let that = this;

			// const testLayer = this.cy.cyCanvas({
			// 	zIndex: 1
			// });
			// const testCanvas = testLayer.getCanvas();
			// const testCtx = canvas.getContext("2d");

			let counter = 0;
			const drawCanvas = () => {
				layer.resetTransform(ctx);
				layer.clear(ctx);

				// Draw fixed elements
				ctx.fillRect(0, 0, 150, 150); // Top left corner
				ctx.font = 'bold 30px serif';
				ctx.fillStyle = 'red';
				ctx.fillText(counter++, 100, 100);


				let drawWedge2 = (currentArc, cX, cY, radius, percent, color) => {
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
				};

				let drawDonut = (cX, cY, radius, width, strokeWidth, percentages) => {
					let currentArc = -Math.PI / 2; // offset

					ctx.beginPath();
					ctx.arc(cX, cY, radius + strokeWidth, 0, 2 * Math.PI, false);
					ctx.fillStyle = 'white';
					ctx.fill();

					const colors = ['green', 'orange', 'red'];
					for (let i = 0; i < percentages.length; i++) {
						let arc = drawWedge2(currentArc, cX, cY, radius, percentages[i], colors[i]);
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
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.restore();
				};

				//drawDonut(100, 100, 50, 15, 2, [30, 5, 65]);

				layer.setTransform(ctx);

				// Draw model elements
				that.cy.nodes().forEach(function (node) {
					// debugger;
					const pos = node.position();
					// ctx.beginPath();
					// ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI, false);
					// ctx.fill();

					drawDonut(pos.x, pos.y, 15, 5, 0.5, [30, 5, 65])

					if (that.cy.zoom() > 1) {
						ctx.fillText(node.id(), pos.x, pos.y);
					}
				});
			};

			this.cy.on("render cyCanvas.resize", drawCanvas);

			const dc = () => {
				drawCanvas();
				window.requestAnimationFrame(dc);
			};

			window.requestAnimationFrame(dc);

		}

		// Preload images
		// background.src =
		//   "https://files.classcraft.com/classcraft-assets/images/event_scroll_middle.jpg";

		/*
		if (this.dataAvailable() && !this.dummy) {
			var generator = new GraphGenerator(this, this.currentData);
			var graph = generator.generateGraph();

			this.cy.elements().remove();

			_.each(graph.nodes, node => {
				this.cy.add(
					{
						group: 'nodes',
						data: { id: node.name, label: node.name },
						classes: 'background'
					}
				);
			});

			_.each(graph.connections, edge => {
				this.cy.add(
					{
						group: 'edges',
						data: { id: edge.source + edge.target, source: edge.source, target: edge.target }
					}
				);
			});

			let node = this.cy.nodes().first();

			// let popper = node.popper({
			// 	content: () => {
			// 		let div = document.createElement('div');

			// 		div.innerHTML = 'Sticky Popper content';

			// 		this.popA = div;

			// 		document.body.appendChild(div);

			// 		return div;
			// 	},
			// 	// renderedPosition: (el,b,c,d) => {
			// 	// 	return { x: el.renderedWidth(), y: el.renderedHeight() };
			// 	// }
			// });

			// let update = (a) => {
			// 	if (a.type === 'zoom') {
			// 		console.log(this.cy.zoom());
			// 		this.popA.style.fontSize = this.cy.zoom() + "rem";
			// 	}
				
			// 	popper.scheduleUpdate();
			// };

			let update = (event) => {
				let pos = node.renderedPosition();
				console.log(pos);

				let ele = document.getElementById('test1');
				
				ele.style.position = "absolute";
				ele.style.left = Math.floor(pos.x - ele.offsetWidth / 2) + "px";
				ele.style.top = Math.floor(pos.y) + "px";
				ele.style.fontSize = this.cy.zoom() + "rem";
				
			};

			node.on('position', update);

			this.cy.on('pan zoom resize', update);

			this.dummy = true;
		}
*/

		// if (!this.vizceral) {
		// 	var sdgContainer = document.getElementById("nt-sdg-container");

		// 	if (sdgContainer != null) {
		// 		sdgContainer.innerHTML = '<canvas id="nt-sdg-viz"></canvas>';
		// 	} else {
		// 		console.warn("SDG container cannot be found!");
		// 	}

		// 	var vizContainer = <HTMLCanvasElement>document.getElementById("nt-sdg-viz");

		// 	if (vizContainer != null) {

		// 		// init variables for vizceral
		// 		this.zoomLevel = 1;

		// 		var viz = new Vizceral(vizContainer);
		// 		viz.setOptions({
		// 			allowDraggingOfNodes: true,
		// 			showLabels: true
		// 		});

		// 		// Add event handlers for the vizceral events
		// 		viz.on('viewChanged', view => { });
		// 		viz.on('objectHighlighted', object => this.onObjectHighlighted(object));
		// 		viz.on('rendered', data => { });
		// 		viz.on('nodeContextSizeChanged', dimensions => { });

		// 		viz.updateStyles({
		// 			colorText: 'rgb(214, 214, 214)',
		// 			colorTextDisabled: 'rgb(129, 129, 129)',
		// 			colorTraffic: {
		// 				healthy: this.panel.sdgStyle.healthyColor,
		// 				normal: 'rgb(186, 213, 237)',
		// 				normalDonut: 'rgb(91, 91, 91)',
		// 				warning: 'rgb(268, 185, 73)',
		// 				danger: this.panel.sdgStyle.dangerColor
		// 			},
		// 			colorNormalDimmed: 'rgb(101, 117, 128)',
		// 			colorBackgroundDark: 'rgb(35, 35, 35)',
		// 			colorLabelBorder: 'rgb(16, 17, 18)',
		// 			colorLabelText: 'rgb(0, 0, 0)',
		// 			colorDonutInternalColor: 'rgb(35, 35, 35)',
		// 			colorDonutInternalColorHighlighted: 'rgb(255, 255, 255)',
		// 			colorConnectionLine: 'rgb(255, 255, 255)',
		// 			colorPageBackground: 'rgb(45, 45, 45)',
		// 			colorPageBackgroundTransparent: 'rgba(45, 45, 45, 0)',
		// 			colorBorderLines: 'rgb(137, 137, 137)',
		// 			colorArcBackground: 'rgb(60, 60, 60)'
		// 		});

		// 		viz.updateDefinitions({
		// 			detailedNode: {
		// 				volume: {
		// 					default: {
		// 						top: null,
		// 						bottom: null,

		// 						donut: {
		// 							data: 'donutMetrics',
		// 							indices: [
		// 								{ key: 'errorPct', class: 'danger' },
		// 								{ key: 'healthyPct', class: 'healthy' }
		// 							]
		// 						}

		// 					},
		// 				}
		// 			}
		// 		});

		// 		viz.setView();
		// 		viz.animate();

		// 		this.vizceral = viz;
		// 	}
		// }

		// if (this.dataAvailable()) {
		// 	var generator = new GraphGenerator(this, this.currentData);
		// 	var graph = generator.generateGraph();
		// 	this.vizceral.updateData(graph);

		// 	var nodeNames = _.map(graph.nodes, node => node.name);
		// 	const nodesAreEqual = _.isEqual(_.sortBy(nodeNames), _.sortBy(this.currentGraphNodes));

		// 	if (!nodesAreEqual) {
		// 		this.currentGraphNodes = nodeNames;
		// 		if (this.vizceral.currentGraph) {
		// 			this.vizceral.currentGraph.layout.cache = [];
		// 			this.vizceral.currentGraph._relayout();
		// 		}
		// 	}
		// }

	}

	onRefresh() {
		console.log("refresh");
		//this.cy.reset();
		this.cy.center();

		// let options = {
		// 	name: 'cose',

		// 	// Called on `layoutready`
		// 	ready: function () { },

		// 	// Called on `layoutstop`
		// 	stop: function () { },

		// 	// Whether to animate while running the layout
		// 	// true : Animate continuously as the layout is running
		// 	// false : Just show the end result
		// 	// 'end' : Animate with the end result, from the initial positions to the end positions
		// 	animate: 'end',

		// 	// Easing of the animation for animate:'end'
		// 	animationEasing: undefined,

		// 	// The duration of the animation for animate:'end'
		// 	animationDuration: undefined,

		// 	// A function that determines whether the node should be animated
		// 	// All nodes animated by default on animate enabled
		// 	// Non-animated nodes are positioned immediately when the layout starts
		// 	animateFilter: function (node, i) { return true; },


		// 	// The layout animates only after this many milliseconds for animate:true
		// 	// (prevents flashing on fast runs)
		// 	animationThreshold: 250,

		// 	// Number of iterations between consecutive screen positions update
		// 	refresh: 20,

		// 	// Whether to fit the network view after when done
		// 	fit: true,

		// 	// Padding on fit
		// 	padding: 50,

		// 	// Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
		// 	boundingBox: undefined,

		// 	// Excludes the label when calculating node bounding boxes for the layout algorithm
		// 	nodeDimensionsIncludeLabels: false,

		// 	// Randomize the initial positions of the nodes (true) or use existing positions (false)
		// 	randomize: false,

		// 	// Extra spacing between components in non-compound graphs
		// 	componentSpacing: 64,

		// 	// Node repulsion (non overlapping) multiplier
		// 	nodeRepulsion: function (node) { return 2048; },

		// 	// Node repulsion (overlapping) multiplier
		// 	nodeOverlap: 1,

		// 	// Ideal edge (non nested) length
		// 	idealEdgeLength: function (edge) { return 64; },

		// 	// Divisor to compute edge forces
		// 	edgeElasticity: function (edge) { return 256; },

		// 	// Nesting factor (multiplier) to compute ideal edge length for nested edges
		// 	nestingFactor: 1.2,

		// 	// Gravity force (constant)
		// 	gravity: 1,

		// 	// Maximum number of iterations to perform
		// 	numIter: 1000,

		// 	// Initial temperature (maximum node displacement)
		// 	initialTemp: 1000,

		// 	// Cooling factor (how the temperature is reduced between consecutive iterations
		// 	coolingFactor: 0.95,

		// 	// Lower temperature threshold (below this point the layout will end)
		// 	minTemp: 0.1
		// };

		// let options = {
		// 	name: 'cose-bilkent',

		// 	// Called on `layoutready`
		// 	ready: function () {
		// 	},
		// 	// Called on `layoutstop`
		// 	stop: function () {
		// 		console.log("done");
		// 	},
		// 	// 'draft', 'default' or 'proof" 
		// 	// - 'draft' fast cooling rate 
		// 	// - 'default' moderate cooling rate 
		// 	// - "proof" slow cooling rate
		// 	quality: 'proof',
		// 	// Whether to include labels in node dimensions. Useful for avoiding label overlap
		// 	nodeDimensionsIncludeLabels: false,
		// 	// number of ticks per frame; higher is faster but more jerky
		// 	refresh: 30,
		// 	// Whether to fit the network view after when done
		// 	fit: true,
		// 	// Padding on fit
		// 	padding: 10,
		// 	// Whether to enable incremental mode
		// 	randomize: true,
		// 	// Node repulsion (non overlapping) multiplier
		// 	nodeRepulsion: 4500,
		// 	// Ideal (intra-graph) edge length
		// 	idealEdgeLength: 50,
		// 	// Divisor to compute edge forces
		// 	edgeElasticity: 0.45,
		// 	// Nesting factor (multiplier) to compute ideal edge length for inter-graph edges
		// 	nestingFactor: 0.1,
		// 	// Gravity force (constant)
		// 	gravity: 0.25,
		// 	// Maximum number of iterations to perform
		// 	numIter: 2500,
		// 	// Whether to tile disconnected nodes
		// 	tile: true,
		// 	// Type of layout animation. The option set is {'during', 'end', false}
		// 	animate: 'end',
		// 	// Duration for animate:end
		// 	animationDuration: 500,
		// 	// Amount of vertical space to put between degree zero nodes during tiling (can also be a function)
		// 	tilingPaddingVertical: 10,
		// 	// Amount of horizontal space to put between degree zero nodes during tiling (can also be a function)
		// 	tilingPaddingHorizontal: 10,
		// 	// Gravity range (constant) for compounds
		// 	gravityRangeCompound: 1.5,
		// 	// Gravity force (constant) for compounds
		// 	gravityCompound: 1.0,
		// 	// Gravity range (constant)
		// 	gravityRange: 3.8,
		// 	// Initial cooling factor for incremental layout
		// 	initialEnergyOnIncremental: 0.5
		// };

		let options = {
			name: 'cola',
			animate: true, // whether to show the layout as it's running
			refresh: 5, // number of ticks per frame; higher is faster but more jerky
			maxSimulationTime: 2000, // max length in ms to run the layout
			ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
			fit: true, // on every layout reposition of nodes, fit the viewport
			padding: 30, // padding around the simulation
			boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
			nodeDimensionsIncludeLabels: false, // whether labels should be included in determining the space used by a node

			// layout event callbacks
			ready: function () { }, // on layoutready
			stop: function () { }, // on layoutstop

			// positioning options
			randomize: false, // use random node positions at beginning of layout
			avoidOverlap: true, // if true, prevents overlap of node bounding boxes
			handleDisconnected: true, // if true, avoids disconnected components from overlapping
			convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
			nodeSpacing: function (node) { return 10; }, // extra spacing around nodes
			flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
			alignment: undefined, // relative alignment constraints on nodes, e.g. function( node ){ return { x: 0, y: 1 } }
			gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]

			// different methods of specifying edge length
			// each can be a constant numerical value or a function like `function( edge ){ return 2; }`
			edgeLength: undefined, // sets edge length directly in simulation
			edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
			edgeJaccardLength: undefined, // jaccard edge length in simulation

			// iterations of cola algorithm; uses default values on undefined
			unconstrIter: undefined, // unconstrained initial layout iterations
			userConstIter: undefined, // initial layout iterations with user-specified constraints
			allConstIter: undefined, // initial layout iterations with all constraints including non-overlap

			// infinite layout options
			infinite: false // overrides all other options for a forces-all-the-time mode
		};

		this.cy.layout(options).run();

	}

	onInitEditMode() {
		this.addEditorTab('Options', optionsTab, 2);
	}

	onPanelTeardown() {
	}

	onDataReceived(receivedData) {
		var preProcessor = new PreProcessor(this);

		var processedData = preProcessor.processData(receivedData);

		if (processedData.data.length > 0) {
			this.currentData = processedData;
		} else {
			this.currentData = [];
		}

		this.render();
	}

	getTemplateVariable(name) {
		let variable: any = _.find(this.dashboard.templating.list, {
			name: name
		});
		return variable.current.value;
	}
}
