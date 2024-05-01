let midiInputSelected = null;
let midiOutputSelected = null;
let midiLoopbackInputSelected = null;
let inputMidiChannel = null;
let outputMidiChannel = 0;
let algorithmSelected = null;
let octaveOffset = null;
let velocityToggle = null;
let stereoSpreadToggle = null;
let reverbToggle = null;
let isSustainOn = false;
let noteOffToggle = true;
let noteOnList = new Array(8);
let sustainedNoteList = new Array(8);
let selectedSampleNumber = { MSB: 0, LSB: 0 };
let LSBMessageCount = 0;
let sampleLayerList = [];
let multiSampleToggle = false;
const SUSTAIN_PEDAL = 64;
const VOLCA_SAMPLE_NAME_MATCH = "sample";
const CC_MSG = 0xb;
const NOTE_ON_MSG = 0x9;
const NOTE_OFF_MSG = 0x8;
const ROUND_ROBIN = "Round Robin";
const NOTE_COUNT = "Active note count";
const ANY_DEVICE = "--- Any device ---";
const RECOMMENDED = " (Recommended)";
const ANY_DEVICE_VALUE = "anyDevice";
const NO_DEVICE = "--- No device ---";
const NO_DEVICE_VALUE = "noDevice"
const ANY_CHANNEL = "Any";
const ANY_CHANNEL_VALUE = -1;
const DEFAULT_OCTAVE = "Default";
const DEFAULT_OCTAVE_VALUE = 4;
const OCTAVE_BELOW = "Octave below";
const OCTAVE_BELOW_VALUE = -8;
const OCTAVE_ABOVE = "Octave above";
const OCTAVE_ABOVE_VALUE = 16;
const VELOCITY_TOGGLE_OFF = "Max. velocity fixed";
const VELOCITY_TOGGLE_OFF_VALUE = false;
const VELOCITY_TOGGLE_ON = "Velocity sensitive";
const VELOCITY_TOGGLE_ON_VALUE = true;
const STEREO_SPREAD_TOGGLE_OFF = "Mono";
const STEREO_SPREAD_TOGGLE_OFF_VALUE = false;
const STEREO_SPREAD_TOGGLE_ON = "Stereo";
const STEREO_SPREAD_TOGGLE_ON_VALUE = true;
const REVERB_TOGGLE_OFF = "Off";
const REVERB_TOGGLE_OFF_VALUE = false;
const REVERB_TOGGLE_ON = "On";
const REVERB_TOGGLE_ON_VALUE = true;
const NOTE_OFF_TOGGLE_OFF = "Off";
const NOTE_OFF_TOGGLE_OFF_VALUE = false;
const NOTE_OFF_TOGGLE_ON = "On";
const NOTE_OFF_TOGGLE_ON_VALUE = true;
const MULTILAYER_SAMPLING_TOGGLE_OFF = "Off";
const MULTILAYER_SAMPLING_TOGGLE_OFF_VALUE = false;
const MULTILAYER_SAMPLING_TOGGLE_ON = "On";
const MULTILAYER_SAMPLING_TOGGLE_ON_VALUE = true;

// SOUND DESIGN PARAMETERS AVAILABLE
// Sample No. MSB, Sample No. LSB, Sample Start Point, Length, Hi Cut,
// Pitch EG Intensity, Atack, Decay, Amp EG Attack, Decay, Loop On/Off, Reverb On/Off, Reverse On/Off
const SOUND_DESIGN_CC_LIST = [
  3, 35, 40, 41, 42, 44, 45, 46, 47, 48, 68, 70, 75,
];

// DOM CACHING
const table = document.getElementById("MultiLayeredSamplingTable");

function onMIDISuccess() {
  console.log("MIDI ready!");
}

function onMIDIFailure(msg) {
  console.log("Failed to get MIDI access - " + msg);
  alert(
    "Ooops! Your browser does not support WebMIDI. \nPlease use Google Chrome or a Chromium based browser (like Edge)."
  );
  window.location.href = "about:blank";
}

/**
 * SETUP FUNTIONS
 */
function initInputSelector(midiAccess) {
  const selector = document.getElementById("InputSelector");
  // Event listener
  selector.addEventListener("change", function () {
    if (midiInputSelected === ANY_DEVICE_VALUE) {
      for (const [, device] of midiAccess.inputs) {
        device.onmidimessage = null;
      }
    } else {
      const previousValue = midiAccess.inputs.get(midiInputSelected);
      if (previousValue != null) {
        previousValue.onmidimessage = null;
      }
    }
    midiInputSelected = this.value;
    forwardMIDIEvents(midiAccess);
  });
  // Options
  addOptions(selector, ANY_DEVICE, ANY_DEVICE_VALUE);
  for (const [id, midiInput] of midiAccess.inputs) {
    addOptions(selector, midiInput.name, id);
  }
}

function initInputChannelSelector() {
  const channelSelector = document.getElementById("InputChannelSelector");
  // Event listener
  channelSelector.addEventListener("change", function () {
    inputMidiChannel = Number(this.value);
  });
  // Options
  addOptions(channelSelector, ANY_CHANNEL, ANY_CHANNEL_VALUE);
  for (let index = 0; index < 16; index++) {
    addOptions(channelSelector, String(index + 1), index);
  }
}

function initOutputSelector(midiAccess) {
  const selector = document.getElementById("OutputSelector");
  selector.addEventListener("change", function () {
    midiOutputSelected = this.value;
    onReverbToggleChange(midiAccess);
  });
  let init = true;
  for (const [id, midiOutput] of midiAccess.outputs) {
    addOptions(selector, midiOutput.name, id, { init });
    init = false;
    if (midiOutput.name.includes(VOLCA_SAMPLE_NAME_MATCH)) {
      selector.value = id;
      midiOutputSelected = id;
    }
  }
}

function initLoopbackInputSelector(midiAccess) {
  const selector = document.getElementById("LoopbackInputSelector");
  selector.addEventListener("change", function () {
    // If the loopback input is the same as the input, we would override the input handler
    // So we do nothing
    if (this.value != null && midiInputSelected === this.value) {
      return;
    }

    // Remove previous handler
    const previousValue = midiAccess.inputs.get(midiLoopbackInputSelected);
    if (previousValue != null) {
      previousValue.onmidimessage = null;
    }

    // If it's NO_DEVICE, do not attach a listener
    if (this.value === NO_DEVICE_VALUE) {
      return;
    }
    midiLoopbackInputSelected = this.value;
    forwardLoopbackMIDIEvents(midiAccess);
  });
  let init = true;
  addOptions(selector, NO_DEVICE, NO_DEVICE_VALUE);
  for (const [id, midiInput] of midiAccess.inputs) {
    addOptions(selector, midiInput.name, id, { init });
    init = false;
    if (midiInput.name.includes(VOLCA_SAMPLE_NAME_MATCH)) {
      selector.value = id;
      midiLoopbackInputSelected = id;
      forwardLoopbackMIDIEvents(midiAccess);
    }
  }
}

function initSampleSelector(midiAccess) {
  const sampleSelector = document.getElementById("SampleSelector");
  const onSampleChange = (event) =>
    onSampleSelectionChange(midiAccess, event.target.valueAsNumber);
  sampleSelector.addEventListener("keyup", onSampleChange);
  sampleSelector.addEventListener("change", onSampleChange);
}

function initAlgorithmSelector() {
  const selector = document.getElementById("AlgorithmSelector");
  selector.addEventListener("change", function () {
    outputMidiChannel = 0;
    algorithmSelected = this.value;
  });
  addOptions(selector, ROUND_ROBIN + RECOMMENDED, ROUND_ROBIN);
  addOptions(selector, NOTE_COUNT, NOTE_COUNT);
  selector.value = ROUND_ROBIN;
  algorithmSelected = ROUND_ROBIN;
}

function initOctaveSelector() {
  const selector = document.getElementById("OctaveSelector");
  selector.addEventListener("change", function () {
    octaveOffset = Number(this.value);
  });
  addOptions(selector, OCTAVE_BELOW, OCTAVE_BELOW_VALUE);
  addOptions(selector, DEFAULT_OCTAVE + RECOMMENDED, DEFAULT_OCTAVE_VALUE);
  addOptions(selector, OCTAVE_ABOVE, OCTAVE_ABOVE_VALUE);
  selector.value = DEFAULT_OCTAVE_VALUE;
  octaveOffset = DEFAULT_OCTAVE_VALUE;
}

function initVelocityToggleSelector() {
  const selector = document.getElementById("VelocityToggleSelector");
  selector.addEventListener("change", function () {
    velocityToggle = this.value === "true";
  });
  addOptions(
    selector,
    VELOCITY_TOGGLE_ON + RECOMMENDED,
    VELOCITY_TOGGLE_ON_VALUE
  );
  addOptions(selector, VELOCITY_TOGGLE_OFF, VELOCITY_TOGGLE_OFF_VALUE);
  selector.value = VELOCITY_TOGGLE_ON_VALUE;
  velocityToggle = VELOCITY_TOGGLE_ON_VALUE;
}

function initStereoSpreadToggleSelector() {
  const selector = document.getElementById("StereoSpreadToggleSelector");
  selector.addEventListener("change", function () {
    stereoSpreadToggle = this.value === "true";
  });
  addOptions(
    selector,
    STEREO_SPREAD_TOGGLE_ON + RECOMMENDED,
    STEREO_SPREAD_TOGGLE_ON_VALUE
  );
  addOptions(
    selector,
    STEREO_SPREAD_TOGGLE_OFF,
    STEREO_SPREAD_TOGGLE_OFF_VALUE
  );
  selector.value = STEREO_SPREAD_TOGGLE_ON_VALUE;
  stereoSpreadToggle = STEREO_SPREAD_TOGGLE_ON_VALUE;
}

function initReverbSelector(midiAccess) {
  const selector = document.getElementById("ReverbToggleSelector");
  selector.addEventListener("change", function () {
    reverbToggle = this.value === "true";
    onReverbToggleChange(midiAccess);
  });
  addOptions(selector, REVERB_TOGGLE_ON + RECOMMENDED, REVERB_TOGGLE_ON_VALUE);
  addOptions(selector, REVERB_TOGGLE_OFF, REVERB_TOGGLE_OFF_VALUE);
  selector.value = REVERB_TOGGLE_ON_VALUE;
  reverbToggle = REVERB_TOGGLE_ON_VALUE;
  onReverbToggleChange(midiAccess);
}

function initNoteOffToggleSelector() {
  const selector = document.getElementById("NoteOffToggleSelector");
  selector.addEventListener("change", function () {
    noteOffToggle = this.value === "true";
    isSustainOn = !noteOffToggle;
  });
  addOptions(
    selector,
    NOTE_OFF_TOGGLE_ON + RECOMMENDED,
    NOTE_OFF_TOGGLE_ON_VALUE
  );
  addOptions(selector, NOTE_OFF_TOGGLE_OFF, NOTE_OFF_TOGGLE_OFF_VALUE);
  selector.value = NOTE_OFF_TOGGLE_ON_VALUE;
  noteOffToggle = NOTE_OFF_TOGGLE_ON_VALUE;
  isSustainOn = !noteOffToggle;
}

function initMultiLayeredSamplingToggleSelector() {
  const selector = document.getElementById("MultiLayeredSamplingSelector");
  selector.addEventListener("change", function () {
    multiSampleToggle = this.value === "true";
    const multiSampleDiv = document.getElementById("MultiLayeredSamplingDiv");
    multiSampleDiv.style.display = multiSampleToggle ? "block" : "none";
    if (sampleLayerList.length === 0) return;
    if (multiSampleToggle) {
      // Assign current selected sample
      const currentSampleNumber = getSampleNumberFromMIDI();
      const sampleInput = document.getElementById("sampleNumber-0");
      sampleInput.value = currentSampleNumber;
      sampleLayerList[0].sampleNumber = currentSampleNumber;
    } else {
      // Store first layer sample as current sample
      const [MSB, LSB] = getSamplePartsfromNumber(
        sampleLayerList[0].sampleNumber
      );
      selectedSampleNumber = { MSB, LSB };
    }
  });

  addOptions(
    selector,
    MULTILAYER_SAMPLING_TOGGLE_OFF + RECOMMENDED,
    MULTILAYER_SAMPLING_TOGGLE_OFF_VALUE
  );
  addOptions(
    selector,
    MULTILAYER_SAMPLING_TOGGLE_ON,
    MULTILAYER_SAMPLING_TOGGLE_ON_VALUE
  );
  selector.value = MULTILAYER_SAMPLING_TOGGLE_OFF_VALUE;
  multiSampleToggle = MULTILAYER_SAMPLING_TOGGLE_OFF_VALUE;
}

function initMultiLayeredSamplingTable() {
  table.addEventListener("change", onTableValueChange);
  table.addEventListener("keyup", onTableValueChange);
  table.appendChild(createTableRow({ sampleNumber: null, startVelocity: 0 }));

  const addButton = document.getElementById("AddSampleLayerButton");
  const resetButton = document.getElementById("ResetSampleLayerButton");
  addButton.addEventListener("click", onAddSampleLayer);
  resetButton.addEventListener("click", onResetSampleLayers);
}

function onAddSampleLayer() {
  const { sampleNumber, startVelocity: prevStartVelocity } =
    getLastValidRow() ?? { startVelocity: -1 };
  table.appendChild(
    createTableRow({
      sampleNumber,
      startVelocity: (prevStartVelocity + 1) % 128,
    })
  );
}

function onResetSampleLayers() {
  resetRowValidation();
  const firstRow = sampleLayerList.shift();
  for (const { rowReference } of sampleLayerList) {
    if (rowReference == null) continue;
    table.removeChild(rowReference);
  }
  sampleLayerList = [firstRow];
}

function onTableValueChange(event) {
  const [type, textIndex] = event.target.id.split("-");
  const value = Number(event.target.value);
  const index = Number(textIndex);
  if (type === "sampleNumber" || type === "startVelocity") {
    sampleLayerList[index][type] = value;
    validateTableRows();
  }
}

function onDeleteRowClick(event) {
  const [, textIndex] = event.target.id.split("-");
  const index = Number(textIndex);
  const sampleLayer = sampleLayerList[index];

  if (sampleLayer == null) return;
  table.removeChild(sampleLayer.rowReference);
  sampleLayerList.splice(index, 1, {});
}

function resetRowValidation() {
  const errorP = document.getElementById("errorP");
  errorP.style.display = "none";

  for (let index = 0; index < sampleLayerList.length; index++) {
    const element = document.getElementById("startVelocity-" + index);
    if (element == null) continue;
    element.style = "border: revert;";
  }
}

function validateTableRows() {
  resetRowValidation();

  if (sampleLayerList.length < 2) return;

  let velocityErrorIndexList = [];

  for (let prev = 0, curr = 1; curr < sampleLayerList.length; prev++, curr++) {
    if (
      sampleLayerList[prev].startVelocity >= sampleLayerList[curr].startVelocity
    )
      velocityErrorIndexList.push(curr);
  }

  if (velocityErrorIndexList.length > 0) errorP.style.display = "block";

  for (const index of velocityErrorIndexList) {
    const element = document.getElementById("startVelocity-" + index);
    if (element == null) continue;
    element.style = "border: 1px solid red";
  }
}

function createTableRow({ sampleNumber, startVelocity } = {}) {
  const row = document.createElement("tr");

  const tableDataLeft = document.createElement("td");

  const sampleNumberElement = document.createElement("input");
  sampleNumberElement.type = "number";
  sampleNumberElement.min = 0;
  sampleNumberElement.max = 199;
  sampleNumberElement.value = sampleNumber;
  sampleNumberElement.id = "sampleNumber-" + sampleLayerList.length;

  const tableDataRight = document.createElement("td");

  const startVelocityElement = document.createElement("input");
  startVelocityElement.type = "number";
  startVelocityElement.value = startVelocity;
  startVelocityElement.min = 0;
  startVelocityElement.max = 127;
  startVelocityElement.id = "startVelocity-" + sampleLayerList.length;

  tableDataLeft.appendChild(sampleNumberElement);
  tableDataRight.appendChild(startVelocityElement);

  row.appendChild(tableDataLeft);
  row.appendChild(tableDataRight);

  // First row should not be deleted
  if (sampleLayerList.length > 0) {
    const tableDataDeleteRow = document.createElement("td");

    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.id = "deleteRowButton-" + sampleLayerList.length;
    deleteButton.addEventListener("click", onDeleteRowClick);

    tableDataDeleteRow.appendChild(deleteButton);

    row.appendChild(tableDataDeleteRow);
  }

  sampleLayerList.push({ sampleNumber, startVelocity, rowReference: row });
  return row;
}

/**
 * MIDI HANDLERS
 */
function onMIDIMessage(midiAccess, { isLoopback = false } = {}) {
  return (event) => {
    const [headerChunk, noteCC, velocityValue] = [...event.data];
    const [header, channel] = splitMIDIHeader(headerChunk);
    if (isLoopback) {
      header === CC_MSG &&
        onLoopbackCCChange(midiAccess, channel, noteCC, velocityValue);
      return;
    }
    // Filter by midi channel
    if (inputMidiChannel !== ANY_CHANNEL_VALUE && channel !== inputMidiChannel)
      return;

    switch (header) {
      case NOTE_ON_MSG:
        onNoteOn(midiAccess, noteCC, velocityValue);
        break;
      case NOTE_OFF_MSG:
        onNoteOff(midiAccess, noteCC);
        break;
      case CC_MSG:
        onCCMessage(midiAccess, noteCC, velocityValue);
        break;
      default:
        break;
    }
  };
}

function forwardMIDIEvents(midiAccess) {
  if (midiInputSelected == null) return;

  if (midiInputSelected === ANY_DEVICE_VALUE) {
    for (const [, device] of midiAccess.inputs) {
      device.onmidimessage = onMIDIMessage(midiAccess);
    }
  } else {
    const midiInput = midiAccess.inputs.get(midiInputSelected);
    if (midiInput == null) return;

    midiInput.onmidimessage = onMIDIMessage(midiAccess);
  }
}

function forwardLoopbackMIDIEvents(midiAccess) {
  const midiInput = midiAccess.inputs.get(midiLoopbackInputSelected);
  if (midiInput == null) return;

  midiInput.onmidimessage = onMIDIMessage(midiAccess, { isLoopback: true });
}

/** Custom functions for Volca Sample2 */

function updateSampleInput() {
  const sampleSelector = document.getElementById("SampleSelector");
  sampleSelector.value = getSampleNumberFromMIDI();
  // Reset octave offset
  const octaveSelector = document.getElementById("OctaveSelector");
  octaveSelector.value = DEFAULT_OCTAVE_VALUE;
  octaveOffset = DEFAULT_OCTAVE_VALUE;
}

function updateReverbSelector() {
  const sampleSelector = document.getElementById("ReverbToggleSelector");
  sampleSelector.value = reverbToggle;
}

function onNoteOn(midiAccess, note, velocity) {
  const channel = outputMidiChannel;
  const ccHeader = buildMIDIHeader(CC_MSG, channel);

  // Round robin algorithm
  if (algorithmSelected === ROUND_ROBIN) {
    // Add note as on and reset previous sustained note on the same channel
    noteOnList[outputMidiChannel] = note;
    sustainedNoteList[outputMidiChannel] = null;
    outputMidiChannel = outputMidiChannel === 7 ? 0 : outputMidiChannel + 1;
  }
  // Active note count algorithm
  else {
    outputMidiChannel = outputMidiChannel === 7 ? 7 : outputMidiChannel + 1;
  }

  // Prepare messages, first CC and then note
  // Convert pitch to CC value
  const moddedPitch = note + octaveOffset;

  if (multiSampleToggle) {
    const sampleNumber = getSampleInRange(velocity);
    if (sampleNumber == null) {
      // If velocity is out of range, silence the sound
      velocity = 0;
    } else {
      onSampleSelectionChange(midiAccess, sampleNumber);
    }
  }

  // Send velocity as level over CC#7
  const moddedVelocity = velocityToggle ? velocity : 127;

  // Send converted pan over CC#10
  // 1.375 is 88/64 to convert 88 notes to a 64 value range
  // -21 is used to start at note 0 and end at 88
  // Then we add 32 to adhere to range
  // 64 is the default value
  const moddedPan = stereoSpreadToggle
    ? Math.floor((note - 21) / 1.375) + 32
    : 64;

  const output = midiAccess.outputs.get(midiOutputSelected);
  output.send([ccHeader, 49, moddedPitch]);
  output.send([ccHeader, 7, moddedVelocity]);
  output.send([ccHeader, 10, moddedPan]);

  // Generic note message to trigger the output
  output.send([buildMIDIHeader(NOTE_ON_MSG, channel), 60, 127]);
}

function onSampleSelectionChange(midiAccess, sampleNumber) {
  const [MSB, LSB] = getSamplePartsfromNumber(sampleNumber);
  // Update stored sample number
  selectedSampleNumber = { MSB, LSB };
  const output = midiAccess.outputs.get(midiOutputSelected);
  for (let channel = 0; channel < 8; channel++) {
    const ccHeader = buildMIDIHeader(CC_MSG, channel);
    output.send([ccHeader, 3, MSB]);
    output.send([ccHeader, 35, LSB]);
  }
}

function onReverbToggleChange(midiAccess) {
  const output = midiAccess.outputs.get(midiOutputSelected);
  const value = reverbToggle ? 127 : 0;
  for (let channel = 0; channel < 8; channel++) {
    // Activate reverb on CC#70
    output.send([buildMIDIHeader(CC_MSG, channel), 70, value]);
  }
}

function onNoteOff(midiAccess, note) {
  if (algorithmSelected === NOTE_COUNT) {
    outputMidiChannel = outputMidiChannel <= 0 ? 0 : outputMidiChannel - 1;
    return;
  }
  const output = midiAccess.outputs.get(midiOutputSelected);

  for (let channel = 0; channel < noteOnList.length; channel++) {
    // Only release note matches
    if (noteOnList[channel] !== note) continue;
    if (isSustainOn) {
      // Sustain note and skip iteration
      sustainedNoteList[channel] = note;
      continue;
    }

    // Silence note
    output.send([buildMIDIHeader(CC_MSG, channel), 7, 0]);
    // Release note on
    noteOnList[channel] = null;
  }
}

function onCCMessage(midiAccess, cc, value) {
  if (cc === SUSTAIN_PEDAL) {
    onSustainPedalChange(midiAccess, value);
  }
}

function onSustainPedalChange(midiAccess, value) {
  if (!noteOffToggle || algorithmSelected === NOTE_COUNT) return;

  isSustainOn = value === 127;

  if (isSustainOn) {
    // Nothing
  } else {
    // Silence/Release all sustained notes
    const output = midiAccess.outputs.get(midiOutputSelected);
    for (let channel = 0; channel < sustainedNoteList.length; channel++) {
      // Skip null channels
      if (sustainedNoteList[channel] == null) continue;

      // Silence sustained note
      output.send([buildMIDIHeader(CC_MSG, channel), 7, 0]);
      // Release sustained note
      sustainedNoteList[channel] = null;
    }
  }
}

function onLoopbackCCChange(midiAccess, currentChannel, cc, value) {
  if (!SOUND_DESIGN_CC_LIST.includes(cc)) {
    return;
  }

  // Get sample number from MIDI CC
  // MSB
  if (cc === 3) {
    LSBMessageCount = 0;
    selectedSampleNumber.MSB = value;
    updateSampleInput();
  }
  // LSB
  if (cc === 35) {
    // if no MSB is sent, it is 0
    if (LSBMessageCount === 1) {
      selectedSampleNumber.MSB = 0;
      LSBMessageCount = 0;
    }
    selectedSampleNumber.LSB = value;
    LSBMessageCount++;
    updateSampleInput();
  }

  // Reverb Toggle
  if (cc == 70) {
    reverbToggle = value === 127;
    updateReverbSelector();
  }

  // Populate sample sound design to all channels
  const output = midiAccess.outputs.get(midiOutputSelected);
  for (let channel = 0; channel < 8; channel++) {
    // Avoid MIDI event loops
    if (channel === currentChannel) continue;

    output.send([buildMIDIHeader(CC_MSG, channel), cc, value]);
  }
}

/** UTILS */

function addOptions(selector, text, value, { init = true } = {}) {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  selector.appendChild(option);
  if (init) selector.value = null;
}

function getSampleNumberFromMIDI() {
  const { MSB, LSB } = selectedSampleNumber;
  return MSB * 100 + LSB;
}

function getSamplePartsfromNumber(inputSample) {
  return [Math.floor(inputSample / 100), inputSample % 100];
}

function buildMIDIHeader(type, channel) {
  return (type << 4) + channel;
}

function splitMIDIHeader(chunk) {
  return [chunk >> 4, chunk & 0x0f];
}

function getSampleInRange(inputVelocity) {
  for (let index = sampleLayerList.length - 1; index >= 0; index--) {
    if (sampleLayerList[index].startVelocity <= inputVelocity)
      return sampleLayerList[index].sampleNumber;
  }
}

function getLastValidRow() {
  for (let index = sampleLayerList.length - 1; index >= 0; index--) {
    if (sampleLayerList[index].startVelocity != null)
      return sampleLayerList[index];
  }
}

/** MAIN */
(async () => {
  let midiAccess = null;
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch (error) {
    onMIDIFailure();
  }
  onMIDISuccess();
  initInputSelector(midiAccess);
  initInputChannelSelector();
  initOutputSelector(midiAccess);
  initLoopbackInputSelector(midiAccess);
  initSampleSelector(midiAccess);
  initAlgorithmSelector();
  initOctaveSelector();
  initVelocityToggleSelector();
  initStereoSpreadToggleSelector();
  initNoteOffToggleSelector();
  initMultiLayeredSamplingTable();
  initMultiLayeredSamplingToggleSelector();
  initReverbSelector(midiAccess);
  forwardMIDIEvents(midiAccess);
})();
