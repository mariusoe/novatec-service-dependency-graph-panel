import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import _, { find } from 'lodash';
import { optionsTab } from './options_ctrl';
import './css/novatec-service-dependency-graph-panel.css';
import PreProcessor from './processing/PreProcessor'

import GraphCanvas from './canvas/GraphCanvas';

import GraphGenerator from './graph/GraphGenerator'

import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import cyCanvas from 'cytoscape-canvas';

import test_nodes from './test-data/graph';
import test_edges from './test-data/connections';

// Register cytoscape extensions
cyCanvas(cytoscape);
cytoscape.use(cola);

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
			animate: true,
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

	currentData: any;

	cy: cytoscape.Core;

	graphCanvas: GraphCanvas;

	initResize: boolean = false;

	preProcessor: PreProcessor = new PreProcessor(this);

	/** @ngInject */
	constructor($scope, $injector) {
		super($scope, $injector);

		_.defaultsDeep(this.panel, this.panelDefaults);

		this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
		this.events.on('component-did-mount', this.onMount.bind(this));
		this.events.on('refresh', this.onRefresh.bind(this));
		this.events.on('render', this.onRender.bind(this));
		this.events.on('data-received', this.onDataReceived.bind(this));
		this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
	}

	toggleAnimation() {
		this.panel.sdgSettings.animate = !this.panel.sdgSettings.animate;

		if (this.panel.sdgSettings.animate) {
			this.graphCanvas.startAnimation();
		} else {
			this.graphCanvas.stopAnimation();
		}
	}

	zoom(zoom) {
		const zoomStep = 0.25 * zoom;
		const zoomLevel = Math.max(0.1, this.cy.zoom() + zoomStep);
		this.cy.zoom(zoomLevel);
	}

	dataAvailable() {
		return this.currentData != null && _.has(this.currentData, 'data') && this.currentData.data.length > 0;
		// return true;
	}

	updateSDGStyle() {
		// update styles ? noch benötigt?
	}

	forceRender() {
		this.render();
	}

	onObjectHighlighted(object) {
		//TODO handle event
	}

	__transform(graph: any) {
		const n = graph.nodes;
		const e = graph.connections;
		//debugger;

		const nodes = _(n)
			.filter(node => node.name !== '__ENTRY__')
			.map(node => {
				const type = _.get(node, 'metadata.external_type', 'service');

				if (type === 'service') {
					const { healthyPct, errorPct } = node.donutMetrics;
					const metrics = {
						...node.metrics,
						healthyPct,
						errorPct
					};

					return {
						group: 'nodes',
						data: {
							id: node.name,
							type,
							metrics
						}
					}
				} else {
					return {
						group: 'nodes',
						data: {
							id: node.name,
							type
						}
					}
				}
			})
			.value();

		const edges = _(e)
			.filter(edge => edge.source !== '__ENTRY__' && edge.target !== '__ENTRY__')
			.filter(edge => _.get(edge, 'metrics.normal', 0) > 0 || _.get(edge, 'metrics.danger', 0) > 0)
			.map(edge => {
				const normal = _.get(edge, 'metrics.normal', -1);
				const danger = _.get(edge, 'metrics.danger', -1);
				const duration = _.get(edge, 'metadata.connectionTime', -1);

				return {
					group: 'edges',
					data: {
						id: edge.source + ":" + edge.target,
						source: edge.source,
						target: edge.target,
						metrics: {
							normal,
							danger,
							duration
						}
					}
				}
			})
			.value();

		this.cy.elements().remove();
		(<any>this.cy).add(nodes);
		(<any>this.cy).add(edges);

		this.cy.nodes().each(node => {
			if (node.neighborhood().size() <= 0) {
				for (var key of ['metrics.requestCount', 'metrics.errorCount', 'metrics.responseTime']) {
					if (_.get(node.data, key, 0) > 0) {
						return;
					}
				}

				node.remove();
			}
		});

		this.runLayout();
	}

	_initCytoscape() {
		const that = this;

		console.log("Initialize cytoscape..");

		this.cy = cytoscape({
			container: document.getElementById('nt-sdg-container'), // container to render in
			style: <any>[
				{
					"selector": "node",
					"style": {
						"background-opacity": 0
					}
				},
				{
					"selector": "edge",
					"style": {
						"visibility": "hidden"
					}
				}
			],
			wheelSensitivity: 0.125
		});

		const n = test_nodes;
		const e = test_edges;
		//debugger;

		const nodes = _(n)
			.filter(node => node.name !== '__ENTRY__')
			.map(node => {
				const type = _.get(node, 'metadata.external_type', 'service');

				if (type === 'service') {
					const { healthyPct, errorPct } = node.donutMetrics;
					const metrics = {
						...node.metrics,
						healthyPct,
						errorPct
					};

					return {
						group: 'nodes',
						data: {
							id: node.name,
							type,
							metrics
						}
					}
				} else {
					return {
						group: 'nodes',
						data: {
							id: node.name,
							type
						}
					}
				}
			})
			.value();

		const edges = _(e)
			.filter(edge => edge.source !== '__ENTRY__' && edge.target !== '__ENTRY__')
			.filter(edge => _.get(edge, 'metrics.normal', 0) > 0 || _.get(edge, 'metrics.danger', 0) > 0)
			.map(edge => {
				const normal = _.get(edge, 'metrics.normal', -1);
				const danger = _.get(edge, 'metrics.danger', -1);
				const duration = _.get(edge, 'metadata.connectionTime', -1);

				return {
					group: 'edges',
					data: {
						id: edge.source + ":" + edge.target,
						source: edge.source,
						target: edge.target,
						metrics: {
							normal,
							danger,
							duration
						}
					}
				}
			})
			.value();

		(<any>this.cy).add(nodes);
		(<any>this.cy).add(edges);

		// ???
		this.cy.nodes().each(node => {
			if (node.neighborhood().size() <= 0) {
				for (var key of ['metrics.requestCount', 'metrics.errorCount', 'metrics.responseTime']) {
					if (_.get(node.data, key, 0) > 0) {
						return;
					}
				}

				node.remove();
			}
		});

		// create canvas layer
		const layer = (<any>this.cy).cyCanvas({ // due to extention we use
			zIndex: 1
		});

		this.graphCanvas = new GraphCanvas(this, this.cy, layer);
		this.graphCanvas.start();
		if (this.panel.sdgSettings.animate) {
			this.graphCanvas.startAnimation();
		}

		this.cy.reset();
		this.cy.resize();
		this.cy.center();

		this.cy.on('render', (event) => {
			console.log("cy render");
			that.graphCanvas.repaint(true);
		});
	}

	onMount() {
		console.log("mount");
		this.render();
	}

	onRender(payload) {
		console.log("render");

		if (!this.cy) {
			this._initCytoscape();
		} /* else {
			if (!this.initResize) {
				this.initResize = true;
				this.cy.reset();
				this.cy.center();
			}
		} */


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

		if (this.dataAvailable()) {
			var generator = new GraphGenerator(this, this.currentData);
			var graph = generator.generateGraph();

			this.__transform(graph);


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
		}

	}

	onRefresh() {
		console.log("refresh");

		if (!this.initResize) {
			this.initResize = true;
			this.cy.resize();
			this.cy.reset();
			this.runLayout();
		}
	}

	runLayout() {
		const that = this;
		let options = {
			name: 'cola',
			animate: true, // whether to show the layout as it's running
			refresh: 1, // number of ticks per frame; higher is faster but more jerky
			maxSimulationTime: 3000, // max length in ms to run the layout
			ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
			fit: true, // on every layout reposition of nodes, fit the viewport
			padding: 90, // padding around the simulation
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
			nodeSpacing: function (node) { return 50; }, // extra spacing around nodes
			flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
			alignment: undefined, // relative alignment constraints on nodes, e.g. function( node ){ return { x: 0, y: 1 } }
			gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]

			// different methods of specifying edge length
			// each can be a constant numerical value or a function like `function( edge ){ return 2; }`
			edgeLength: undefined, // sets edge length directly in simulation
			edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
			edgeJaccardLength: undefined, // jaccard edge length in simulation

			// iterations of cola algorithm; uses default values on undefined
			unconstrIter: 50, // unconstrained initial layout iterations
			userConstIter: undefined, // initial layout iterations with user-specified constraints
			allConstIter: undefined, // initial layout iterations with all constraints including non-overlap

			// infinite layout options
			infinite: false // overrides all other options for a forces-all-the-time mode
		};
		// let options = {
		// 	name: 'klay',
		// 	nodeDimensionsIncludeLabels: false, // Boolean which changes whether label dimensions are included when calculating node dimensions
		// 	fit: true, // Whether to fit
		// 	padding: 20, // Padding on fit
		// 	animate: false, // Whether to transition the node positions
		// 	animateFilter: function (node, i) { return true; }, // Whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
		// 	animationDuration: 500, // Duration of animation in ms if enabled
		// 	animationEasing: undefined, // Easing of animation if enabled
		// 	transform: function (node, pos) { return pos; }, // A function that applies a transform to the final node position
		// 	ready: undefined, // Callback on layoutready
		// 	stop: undefined, // Callback on layoutstop
		// 	klay: {
		// 		// Following descriptions taken from http://layout.rtsys.informatik.uni-kiel.de:9444/Providedlayout.html?algorithm=de.cau.cs.kieler.klay.layered
		// 		addUnnecessaryBendpoints: false, // Adds bend points even if an edge does not change direction.
		// 		aspectRatio: 1.6, // The aimed aspect ratio of the drawing, that is the quotient of width by height
		// 		borderSpacing: 20, // Minimal amount of space to be left to the border
		// 		compactComponents: true, // Tries to further compact components (disconnected sub-graphs).
		// 		crossingMinimization: 'LAYER_SWEEP', // Strategy for crossing minimization.
		// 		/* LAYER_SWEEP The layer sweep algorithm iterates multiple times over the layers, trying to find node orderings that minimize the number of crossings. The algorithm uses randomization to increase the odds of finding a good result. To improve its results, consider increasing the Thoroughness option, which influences the number of iterations done. The Randomization seed also influences results.
		// 		INTERACTIVE Orders the nodes of each layer by comparing their positions before the layout algorithm was started. The idea is that the relative order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive layer sweep algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
		// 		cycleBreaking: 'GREEDY', // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
		// 		/* GREEDY This algorithm reverses edges greedily. The algorithm tries to avoid edges that have the Priority property set.
		// 		INTERACTIVE The interactive algorithm tries to reverse edges that already pointed leftwards in the input graph. This requires node and port coordinates to have been set to sensible values.*/
		// 		direction: 'RIGHT', // Overall direction of edges: horizontal (right / left) or vertical (down / up)
		// 		/* UNDEFINED, RIGHT, LEFT, DOWN, UP */
		// 		edgeRouting: 'ORTHOGONAL', // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
		// 		edgeSpacingFactor: 0.5, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
		// 		feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
		// 		fixedAlignment: 'NONE', // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
		// 		/* NONE Chooses the smallest layout from the four possible candidates.
		// 		LEFTUP Chooses the left-up candidate from the four possible candidates.
		// 		RIGHTUP Chooses the right-up candidate from the four possible candidates.
		// 		LEFTDOWN Chooses the left-down candidate from the four possible candidates.
		// 		RIGHTDOWN Chooses the right-down candidate from the four possible candidates.
		// 		BALANCED Creates a balanced layout from the four possible candidates. */
		// 		inLayerSpacingFactor: 1.0, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
		// 		layoutHierarchy: false, // Whether the selected layouter should consider the full hierarchy
		// 		linearSegmentsDeflectionDampening: 0.3, // Dampens the movement of nodes to keep the diagram from getting too large.
		// 		mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
		// 		mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
		// 		nodeLayering: 'NETWORK_SIMPLEX', // Strategy for node layering.
		// 		/* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
		// 		LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
		// 		INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
		// 		nodePlacement: 'BRANDES_KOEPF', // Strategy for Node Placement
		// 		/* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
		// 		LINEAR_SEGMENTS Computes a balanced placement.
		// 		INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
		// 		SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
		// 		randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
		// 		routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
		// 		separateConnectedComponents: true, // Whether each connected component should be processed separately
		// 		spacing: 20, // Overall setting for the minimal amount of space to be left between objects
		// 		thoroughness: 7 // How much effort should be spent to produce a nice layout..
		// 	},
		// 	priority: function (edge) { return null; }, // Edges with a non-nil value are skipped when greedy edge cycle breaking is enabled
		// };

		this.cy.layout(options).run()
	}

	fit() {
		const selection = this.graphCanvas.selectionNeighborhood;
		if (selection && !selection.empty()) {
			this.cy.fit(selection, 30);
		} else {
			this.cy.fit();
		}
	}

	onInitEditMode() {
		this.addEditorTab('Options', optionsTab, 2);
	}

	onPanelTeardown() {
	}

	onDataReceived(receivedData) {
		var processedData = this.preProcessor.processData(receivedData);

		console.group('Processed received data');
		console.log('raw data: ', receivedData);
		console.log('processed data: ', processedData);
		console.groupEnd();

		if (processedData.data.length > 0) {
			this.currentData = processedData;
		} else {
			this.currentData = [];
		}

		this.render();
	}

	getTemplateVariable(name) {
		let variable: any = find(this.dashboard.templating.list, {
			name: name
		});
		return variable.current.value;
	}

	getAssetUrl(assetName: string) {
		var baseUrl = 'public/plugins/' + this.panel.type;
		return baseUrl + '/assets/' + assetName;
	}

	getTypeSymbol(type) {
		if (!type) {
			return this.getAssetUrl('default.png');
		}
		const mapping = find(this.panel.sdgSettings.externalIcons, e => e.type.toLowerCase() === type.toLowerCase());

		// debugger;

		// const typeLC = type.toLowerCase();
		// const iconMap = {
		// 	'database': 'database.png',
		// 	'jms': 'message.png',
		// 	'web': 'web.png',
		// 	'http': 'http.png'
		// };

		if (mapping !== undefined) {
			return this.getAssetUrl(mapping.icon + '.png');
		} else {
			return this.getAssetUrl('default.png');
		}
	}
}
