/* Derived from Music Pattern Generator; GPL-3.0-or-later. See LICENSE and upstream-source. */
(function(){"use strict";
const PPQN = 480; const STATE_CHANGE = "MPG_STATE_CHANGE";
// Upstream: midi/connectorin.js
/**
 * MIDI network processor in connector.
 */
function createMIDIConnectorIn() {
	const sources = [],
		outputData = [],
		
		/**
		 * Collects data from all processors this input is connected to.
		 * @return {Array} MIDI event data from all connected processors.
		 */
		getInputData = function() {
			outputData.length = 0;

			sources.forEach(outputDataFunction => {
				outputDataFunction().forEach(data => {
					outputData.push({ ...data });
				});
			});

			return outputData;
		},
		
		/**
		 * Connect another processor as source for this processor.
		 * @param {Function} outputDataFunction Data provider on another processor's output connector.
		 */
		addConnection = function(outputDataFunction) {
			sources.push(outputDataFunction);
		},
		
		/**
		 * Remove another processor that is a source for this processor.
		 * @param {Function} outputDataFunction Data provider on another processor's output connector.
		 */
		removeConnection = function(outputDataFunction) {
			let i = sources.length;
			while (--i >= 0) {
				if (outputDataFunction === sources[i]) {
					sources.splice(i, 1);
					break;
				}
			}
		};

	return {
		addConnection,
		getInputData,
		removeConnection,
	};
}

// Upstream: midi/connectorout.js
/**
 * MIDI network processor out connector.
 */
function createMIDIConnectorOut() {
	const outputData = [],
		destinations = [],

		/**
		 * Clear the output stack when event processing starts.
		 */
		clearOutputData = function() {
			outputData.length = 0;
		},
		
		/**
		 * Set output data that is the result of this processor's processing.
		 * It will be collected by the processors attached to this output.
		 * @param {Object} eventData MIDI event data.
		 */
		setOutputData = function(eventData) {
			outputData.push(eventData);
		},
		
		/**
		 * Public function for processors connected to this output to
		 * collect the data this processor's process function has produced.
		 * @return {Object} MIDI event data.
		 */
		getOutputData = function() {
			return outputData;
		},
		
		/**
		 * Connect this processor's output to another processor's input.
		 * @param {Object} processor Processor to connect to.
		 */
		connect = function(processor) {
			const isConnected = destinations.find(destination => destination === processor);
			if (!isConnected) {
				processor.addConnection(getOutputData);
				destinations.push(processor);
			}
		},
		
		/**
		 * Disconnect this processor's output from another processor's input.
		 * @param {Object} processor Processor to disconnect from, or undefined to remove all.
		 */
		disconnect = function(processor) {
			let n = destinations.length;
			while (--n >= 0) {
				if (!processor || (processor && processor === destinations[n])) {
					destinations[n].removeConnection(getOutputData);
					destinations.splice(n, 1);
				}
			}
		},
		
		/**
		 * Get destination processors.
		 * Used to draw the connection cables on canvas.
		 * @return {Array} Processors this output connects to.
		 */
		getDestinations = function() {
			return destinations;
		};
	
	return {
		clearOutputData,
		connect,
		disconnect,
		getDestinations,
		getOutputData,
		setOutputData,
	};
}

// Upstream: midi/processorbase.js
/**
 * Base functionality for all MIDI processors.
 */
function createMIDIProcessorBase(data) {
	const { id, type } = data;
	
	const getType = () => {
			return type;
		},
		
		getId = () => {
			return id;
		};
	
	let api = {
		getId,
		getType,
		id,
		type,
	};

	if (data.inputs.allIds.length >= 1) {
		api = { ...api, ...createMIDIConnectorIn() };
	}
	if (data.outputs.allIds.length >= 1) {
		api = { ...api, ...createMIDIConnectorOut() };
	}
	
	return api;
}

// Upstream: processors/epg/utils.js
/**
 * Euclidean pattern calculation by Michael Kontogiannis:
 * https://github.com/mkontogiannis/euclidean-rhythms
 * based on a Python script from disappeared website 
 * http://www.atonalmicroshores.com/
 */

const cache = {};

function getEuclidPattern(steps, pulses) {
	pulses = Math.min(steps, pulses);
	const cacheKey = `${steps}_${pulses}`;
	if (!cache[cacheKey]) {
		cache[cacheKey] = createBjorklund(steps, pulses);
	}
	return cache[cacheKey].slice(0);
}

function rotateEuclidPattern(pattern, rotation) {
	const elementsToShift = pattern.splice(pattern.length - rotation);
	return elementsToShift.concat(pattern);
}

/**
 * Create Euclidean rhythm pattern.
 * @param {Number} steps Total amount of tsteps in the pattern.
 * @param {Number} pulses Pulses to spread over the pattern.
 * @return {Array} Array of Booleans that form the pattern.
 */
function createBjorklund(steps, pulses) {
	if (pulses < 0 || steps < 0 || steps < pulses) {
		return [];
	}

	// Create the two arrays
	let first = new Array(pulses).fill([1]);
	let second = new Array(steps - pulses).fill([0]);

	let firstLength = first.length;
	let minLength = Math.min(firstLength, second.length);

	let loopThreshold = 0;
	// Loop until at least one array has length gt 2 (1 for first loop)
	while (minLength > loopThreshold) {

		// Allow only loopThreshold to be zero on the first loop
		if (loopThreshold === 0) {
			loopThreshold = 1;
		}

		// For the minimum array loop and concat
		for (let x = 0; x < minLength; x++) {
			first[x] = Array.prototype.concat.call(first[x], second[x]);
		}

		// if the second was the bigger array, slice the remaining elements/arrays and update
		if (minLength === firstLength) {
			second = Array.prototype.slice.call(second, minLength);
		}
		// Otherwise update the second (smallest array) with the remainders of the first
		// and update the first array to include onlt the extended sub-arrays
		else {
			second = Array.prototype.slice.call(first, minLength);
			first = Array.prototype.slice.call(first, 0, minLength);
		}
		firstLength = first.length;
		minLength = Math.min(firstLength, second.length);
	}

	// Build the final array
	let pattern = [];
	first.forEach(f => {
		pattern = Array.prototype.concat.call(pattern, f);
	});
	second.forEach(s => {
		pattern = Array.prototype.concat.call(pattern, s);
	});

	return pattern;
}

// Upstream: processors/epg/processor.js
function createProcessor(data) {
	let position = 0,
		duration = 0,
		noteDuration,
		params = {},
		euclidPattern = [],
		pulsesOnly = [];
	
	const {
		getId,
		getType,
		id,
		// input connector
		addConnection,
		getInputData,
		removeConnection,
		// output connector
		clearOutputData,
		connect,
		disconnect,
		getDestinations,
		getOutputData,
		setOutputData,
	} = createMIDIProcessorBase(data);

	const initialize = () => {
			document.addEventListener(STATE_CHANGE, handleStateChanges);
			updateAllParams(data.params.byId);
			updatePattern(true);
		},

		terminate = () => {
			document.removeEventListener(STATE_CHANGE, handleStateChanges);
		},

		/**
		 * Handle state changes.
		 * @param {Object} e Custom event.
		 */
		handleStateChanges = e => {
			const { state, action, actions, } = e.detail;
			switch (action.type) {
				case actions.CHANGE_PARAMETER:
					if (action.processorId === id) {
						updateAllParams(state.processors.byId[id].params.byId);
						switch (action.paramKey) {
							case 'steps':
								updatePulsesAndRotation();
								updatePattern(true);
								break;
							case 'pulses':
							case 'rotation':
								updatePattern(true);
								break;
							case 'is_triplets':
							case 'rate':
							case 'note_length':
								updatePattern();
								break;
							case 'is_mute':
								break;
							}
						}
						break;
					
					case actions.LOAD_SNAPSHOT:
						updateAllParams(state.processors.byId[id].params.byId);
						updatePulsesAndRotation();
						updatePattern(true);
						break;
				}
		},

		/**
		 * Process events to happen in a time slice.
		 * timeline start        now      scanStart     scanEnd
		 * |----------------------|-----------|------------|
		 *                        |-----------| 
		 *                        nowToScanStart
		 * @param {Number} scanStart Timespan start in ticks from timeline start.
		 * @param {Number} scanEnd   Timespan end in ticks from timeline start.
		 * @param {Number} nowToScanStart Timespan from current timeline position to scanStart, in ticks.
		 * @param {Number} ticksToMsMultiplier Duration of one tick in milliseconds.
		 * @param {Number} offset Time from doc start to timeline start in ticks.
		 * @param {Array} processorEvents Array to collect processor generated events to displaying the view.
		 */
		process = (scanStart, scanEnd, nowToScanStart, ticksToMsMultiplier, offset, processorEvents) => {

			// clear the output event stack
			clearOutputData();
			
			// abort if the processor is muted
			if (params.is_mute) {
				return;
			}
			
			// if the pattern loops during this timespan.
			let localScanStart = scanStart % duration,
				localScanEnd = scanEnd % duration,
				localScanStart2 = false,
				localScanEnd2;
			if (localScanStart > localScanEnd) {
				localScanStart2 = 0,
				localScanEnd2 = localScanEnd;
				localScanEnd = duration;
			}
			
			// check if notes occur during the current timespan
			pulsesOnly.forEach(pulse => {
				const { startTime, stepIndex, } = pulse;
				let scanStartToNoteStart = startTime - localScanStart;
				let isOn = (localScanStart <= startTime) && (startTime < localScanEnd);
						
				// if pattern looped back to the start
				if (localScanStart2 !== false && isOn === false) {
					scanStartToNoteStart = startTime - localScanStart + duration;
					isOn = isOn || (localScanStart2 <= startTime) && (startTime < localScanEnd2);
				}
				
				// if an event should be emitted
				if (isOn) { 
					const pulseStartTimestamp = scanStart + scanStartToNoteStart;

					const { mode, channel_out, pitch_out, velocity_out, cc_out, cc_value_out } = params;

					if (mode == 'note' ) {
						// send the Note On message
						// subtract 1 from duration to avoid overlaps
						setOutputData({
							timestampTicks: pulseStartTimestamp,
							durationTicks: noteDuration - 1,
							channel: channel_out,
							type: 'note',
							pitch: pitch_out,
							velocity: velocity_out,
						});
					} else if (mode == 'cc' ) {
						// send MIDI CC message
						setOutputData({
							timestampTicks: pulseStartTimestamp,
							channel: channel_out,
							type: 'cc',
							cc: cc_out,
							cc_value: cc_value_out,
						});
					}

					// add events to processorEvents for the canvas to show them
					if (!processorEvents[id]) {
						processorEvents[id] = [];
					}
					
					const delayFromNowToNoteStart = (nowToScanStart + scanStartToNoteStart) * ticksToMsMultiplier;
					processorEvents[id].push({
						stepIndex,
						delayFromNowToNoteStart: delayFromNowToNoteStart,
						delayFromNowToNoteEnd: delayFromNowToNoteStart + (noteDuration * ticksToMsMultiplier)
					});
				}
			});
			
			if (localScanStart2 !== false) {
				localScanStart = localScanStart2;
			}
		},

		/**
		 * Store parameter values locally for quick access by the process function.
		 * @param {Object} parameters Processor's paramer data in state.
		 */
		updateAllParams = parameters => {
			params.steps = parameters.steps.value;
			params.pulses = parameters.pulses.value;
			params.rotation = parameters.rotation.value;
			params.isTriplets = parameters.is_triplets.value;
			params.rate = parameters.rate.value;
			params.note_length = parameters.note_length.value;
			params.is_mute = parameters.is_mute.value;
			params.mode = parameters.mode ? parameters.mode.value : 'note';
			params.channel_out = parameters.channel_out.value;
			params.pitch_out = parameters.pitch_out.value;
			params.velocity_out = parameters.velocity_out.value;
			params.cc_out = parameters.cc_out ? parameters.cc_out.value : 1;
			params.cc_value_out = parameters.cc_value_out ? parameters.cc_value_out.value : 63;
		},

		/**
		 * After a change of the steps parameter update the pulses and rotation parameters.
		 */
		updatePulsesAndRotation = () => {
			dispatch(getActions().recreateParameter(id, 'pulses', { 
				max: params.steps,
				value: Math.min(params.pulses, params.steps),
			}));
			dispatch(getActions().recreateParameter(id, 'rotation', {
				max: params.steps - 1,
				value: Math.min(params.rotation, params.steps - 1),
			}));
			
			dispatch(getActions().changeParameter(id, 'pulses', params.pulses));
			dispatch(getActions().changeParameter(id, 'rotation', params.rotation));
		},
				
		/**
		 * Update all pattern properties.
		 * @param {Boolean} isEuclidChange Steps, pulses or rotation change.
		 */
		updatePattern = isEuclidChange => {

			// euclidean pattern properties, changes in steps, pulses, rotation
			if (isEuclidChange) {
				euclidPattern = getEuclidPattern(params.steps, params.pulses);
				euclidPattern = rotateEuclidPattern(euclidPattern, params.rotation);
			}
			
			// playback properties, changes in isTriplets, rate, noteLength
			const rate = params.is_triplets ? params.rate * (2 / 3) : params.rate;
			const stepDuration = rate * PPQN;
			noteDuration = params.note_length * PPQN;
			duration = params.steps * stepDuration;
			position = position % duration;
			
			// create array of note start times in ticks
			pulsesOnly.length = 0;

			for (let i = 0, n = euclidPattern.length; i < n; i++) {
				if (euclidPattern[i]) {
					pulsesOnly.push({
						startTime: i * stepDuration,
						stepIndex: i
					});
				}
			}
		};

	initialize();

	return {
		addConnection,
		connect,
		disconnect,
		getDestinations,
		getId,
		getOutputData,
		getType,
		process,
		removeConnection,
		terminate,
	};
}

window.MPGCore={createProcessor,getEuclidPattern,rotateEuclidPattern,PPQN};})();