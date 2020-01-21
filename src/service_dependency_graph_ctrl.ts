import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import _, { find, map, isUndefined } from 'lodash';
import { optionsTab } from './options_ctrl';
import './css/novatec-service-dependency-graph-panel.css';
import PreProcessor from './processing/PreProcessor'

import { GraphDataElement } from './graph/GraphData';
import GraphGenerator from './graph/GraphGenerator'

import GraphCanvas from './canvas/GraphCanvas';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import cyCanvas from 'cytoscape-canvas';

import test_nodes from './test-data/graph';
import test_edges from './test-data/connections';
import { IGraph, IGraphNode, IGraphEdge } from './graph/Graph';


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

	currentData: GraphDataElement[] = [];

	cy: cytoscape.Core;

	graphCanvas: GraphCanvas;

	initResize: boolean = false;

	preProcessor: PreProcessor = new PreProcessor(this);

	graphGenerator: GraphGenerator = new GraphGenerator(this);

	graphContainer: any;

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

	link(scope, element, attrs, controller) {
		console.log("Linking container DOM element.");

		this.graphContainer = element.find('.sdg-container')[0];
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

	isDataAvailable() {
		const dataExist = !isUndefined(this.currentData) && this.currentData.length > 0;
		return dataExist;

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

	_updateGraph(graph: IGraph) {
		const cyNodes = this._transformNodes(graph.nodes);
		const cyEdges = this._transformEdges(graph.edges);

		console.groupCollapsed("Cytoscape input data");
		console.log("cytoscape nodes: ", cyNodes);
		console.log("cytoscape edges: ", cyEdges);
		console.groupEnd();

		this.cy.elements().remove();
		(<any>this.cy).add(cyNodes);
		(<any>this.cy).add(cyEdges);

		this.runLayout();
	}

	_transformEdges(edges: IGraphEdge[]) {
		const cyEdges = map(edges, edge => {
			const cyEdge = {
				group: 'edges',
				data: {
					id: edge.source + ":" + edge.target,
					source: edge.source,
					target: edge.target,
					metrics: {
						...edge.metrics
					}
				}
			};

			return cyEdge;
		});

		return cyEdges;
	}

	_transformNodes(nodes: IGraphNode[]) {
		const cyNodes = map(nodes, node => {
			const result = {
				group: 'nodes',
				data: {
					id: node.name,
					type: node.type,
					external_type: node.external_type,
					metrics: {
						...node.metrics
					}
				}
			};
			return result;
		});

		return cyNodes;
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
			container: this.graphContainer,
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

		// const n = test_nodes;
		// const e = test_edges;
		// //debugger;

		// const nodes = _(n)
		// 	.filter(node => node.name !== '__ENTRY__')
		// 	.map(node => {
		// 		const type = _.get(node, 'metadata.external_type', 'service');

		// 		if (type === 'service') {
		// 			const { healthyPct, errorPct } = node.donutMetrics;
		// 			const metrics = {
		// 				...node.metrics,
		// 				healthyPct,
		// 				errorPct
		// 			};

		// 			return {
		// 				group: 'nodes',
		// 				data: {
		// 					id: node.name,
		// 					type,
		// 					metrics
		// 				}
		// 			}
		// 		} else {
		// 			return {
		// 				group: 'nodes',
		// 				data: {
		// 					id: node.name,
		// 					type
		// 				}
		// 			}
		// 		}
		// 	})
		// 	.value();

		// const edges = _(e)
		// 	.filter(edge => edge.source !== '__ENTRY__' && edge.target !== '__ENTRY__')
		// 	.filter(edge => _.get(edge, 'metrics.normal', 0) > 0 || _.get(edge, 'metrics.danger', 0) > 0)
		// 	.map(edge => {
		// 		const normal = _.get(edge, 'metrics.normal', -1);
		// 		const danger = _.get(edge, 'metrics.danger', -1);
		// 		const duration = _.get(edge, 'metadata.connectionTime', -1);

		// 		return {
		// 			group: 'edges',
		// 			data: {
		// 				id: edge.source + ":" + edge.target,
		// 				source: edge.source,
		// 				target: edge.target,
		// 				metrics: {
		// 					normal,
		// 					danger,
		// 					duration
		// 				}
		// 			}
		// 		}
		// 	})
		// 	.value();

		// (<any>this.cy).add(nodes);
		// (<any>this.cy).add(edges);

		// // ???
		// this.cy.nodes().each(node => {
		// 	if (node.neighborhood().size() <= 0) {
		// 		for (var key of ['metrics.requestCount', 'metrics.errorCount', 'metrics.responseTime']) {
		// 			if (_.get(node.data, key, 0) > 0) {
		// 				return;
		// 			}
		// 		}

		// 		node.remove();
		// 	}
		// });

		// create canvas layer
		const layer = (<any>this.cy).cyCanvas({
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
			// trigger also repainting of the graph canvas overlay
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
		}

		if (this.isDataAvailable()) {
			const graph: IGraph = this.graphGenerator.generateGraph(this.currentData);

			this._updateGraph(graph);
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
		const options = {
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
		const graphData = this.preProcessor.processData(receivedData);

		console.groupCollapsed('Processed received data');
		console.log('raw data: ', receivedData);
		console.log('graph data: ', graphData);
		console.groupEnd();

		this.currentData = graphData;

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
