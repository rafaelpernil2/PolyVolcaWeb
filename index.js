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
let sampleNumber = { MSB: 0, LSB: 0 };
let LSBMessageCount = 0;
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

// SOUND DESIGN PARAMETERS AVAILABLE
// Sample No. MSB, Sample No. LSB, Sample Start Point, Length, Hi Cut,
// Pitch EG Intensity, Atack, Decay, Amp EG Attack, Decay, Loop On/Off, Reverb On/Off, Reverse On/Off
const SOUND_DESIGN_CC_LIST = [
  3, 35, 40, 41, 42, 44, 45, 46, 47, 48, 68, 70, 75,
];

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
    midiLoopbackInputSelected = this.value;
    forwardLoopbackMIDIEvents(midiAccess);
  });
  let init = true;
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
  const selector = document.getElementById("OctaveSelector");
  selector.value = DEFAULT_OCTAVE_VALUE;
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
  const [MSB, LSB] = [Math.floor(sampleNumber / 100), sampleNumber % 100];
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
  switch (cc) {
    case SUSTAIN_PEDAL:
      onSustainPedalChange(midiAccess, value);
      break;
    default:
      break;
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
    sampleNumber.MSB = value;
    updateSampleInput();
  }
  // LSB
  if (cc === 35) {
    // if no MSB is sent, it is 0
    if (LSBMessageCount === 1) {
      sampleNumber.MSB = 0;
      LSBMessageCount = 0;
    }
    sampleNumber.LSB = value;
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
  const { MSB, LSB } = sampleNumber;
  return MSB * 100 + LSB;
}

function buildMIDIHeader(type, channel) {
  return (type << 4) + channel;
}

function splitMIDIHeader(chunk) {
  return [chunk >> 4, chunk & 0x0f];
}

/** MAIN */
(async () => {
  let midiAccess = null;
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch (error) {
    onMIDIFailure();
  }
  onMIDISuccess(midiAccess);
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
  initReverbSelector(midiAccess);
  forwardMIDIEvents(midiAccess);
})();
